import {
  ensureBroadcastSchema,
  jsonResponse,
  resolveEnvVar,
  timingSafeEqualStrings,
  type BroadcastEnv,
} from "../../../../server/broadcast/cryptoAuth";

interface RegisterDeviceBody {
  token?: string;
  fcmToken?: string;
  deviceId?: string;
  platform?: string;
  packageName?: string;
  appVersion?: string;
  appVersionName?: string;
  appVersionCode?: number;
  androidSdk?: number;
  sdkInt?: number;
  deviceModel?: string;
  manufacturer?: string;
  notificationsEnabled?: boolean;
  locale?: string;
}

function isValidFcmToken(token: string): boolean {
  const trimmed = token.trim();
  return (
    trimmed.length >= 32 &&
    trimmed.length <= 512 &&
    !/\s/.test(trimmed)
  );
}

function sanitizeOptionalText(value: unknown, maxLen: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLen) : null;
}

function extractClientKeyFromHeaders(request: Request): string {
  const xNovaKey = request.headers.get("X-Nova-App-Key")?.trim();
  if (xNovaKey) return xNovaKey;

  const xClientKey = request.headers.get("X-Client-Key")?.trim();
  if (xClientKey) return xClientKey;

  const authHeader = request.headers.get("Authorization")?.trim() ?? "";
  if (/^Bearer\s+/i.test(authHeader)) {
    return authHeader.replace(/^Bearer\s+/i, "").trim();
  }

  return "";
}

async function authorizeRegistrationRequest(
  request: Request,
  env: BroadcastEnv
): Promise<boolean> {
  const requiredKey =
    resolveEnvVar(env, "NOVA_ANDROID_REG_KEY") ??
    resolveEnvVar(env, "NOVA_BROADCAST_CLIENT_KEY");
  if (!requiredKey) return true;

  const providedKey = extractClientKeyFromHeaders(request);
  if (!providedKey) return false;
  return timingSafeEqualStrings(providedKey, requiredKey);
}

export const onRequestPost = async ({
  request,
  env,
}: {
  request: Request;
  env: BroadcastEnv;
}): Promise<Response> => {
  if (!(await authorizeRegistrationRequest(request, env))) {
    return jsonResponse({ error: "Unauthorized device registration key." }, 401);
  }

  if (!env.NOVA_DB) {
    return jsonResponse(
      { error: "Cloudflare D1 binding (NOVA_DB) is not configured yet." },
      503
    );
  }

  let body: RegisterDeviceBody = {};
  try {
    body = (await request.json()) as RegisterDeviceBody;
  } catch {
    return jsonResponse({ error: "Invalid JSON payload." }, 400);
  }

  const rawToken =
    typeof body.fcmToken === "string" && body.fcmToken.trim()
      ? body.fcmToken
      : body.token;
  const token = typeof rawToken === "string" ? rawToken.trim() : "";
  if (!isValidFcmToken(token)) {
    return jsonResponse({ error: "Invalid FCM registration token." }, 400);
  }

  const platform =
    typeof body.platform === "string"
      ? body.platform.trim().toLowerCase()
      : "android";
  if (platform !== "android") {
    return jsonResponse(
      { error: "Only Android device tokens are supported." },
      400
    );
  }

  const deviceId = sanitizeOptionalText(body.deviceId, 128);
  const packageName = sanitizeOptionalText(body.packageName, 128);
  const appVersion = sanitizeOptionalText(
    typeof body.appVersionName === "string" && body.appVersionName.trim()
      ? body.appVersionName
      : body.appVersion,
    32
  );
  const appVersionCode =
    typeof body.appVersionCode === "number" &&
    Number.isInteger(body.appVersionCode) &&
    body.appVersionCode > 0 &&
    body.appVersionCode < 1_000_000_000
      ? body.appVersionCode
      : null;

  const rawSdk = typeof body.sdkInt === "number" ? body.sdkInt : body.androidSdk;
  const androidSdk =
    typeof rawSdk === "number" &&
    Number.isInteger(rawSdk) &&
    rawSdk >= 21 &&
    rawSdk <= 99
      ? rawSdk
      : null;

  const deviceModel = sanitizeOptionalText(body.deviceModel, 64);
  const manufacturer = sanitizeOptionalText(body.manufacturer, 64);
  const locale = sanitizeOptionalText(body.locale, 32);
  const notificationsEnabled =
    typeof body.notificationsEnabled === "boolean"
      ? body.notificationsEnabled
        ? 1
        : 0
      : 1;

  const nowIso = new Date().toISOString();
  await ensureBroadcastSchema(env.NOVA_DB);

  // If notifications are disabled on a device that has never registered before,
  // avoid registering an unpermitted device. If already known, update its flag to 0.
  if (notificationsEnabled === 0) {
    const existingKnown = deviceId
      ? await env.NOVA_DB.prepare(
          "SELECT token FROM fcm_devices WHERE device_id = ? OR token = ? LIMIT 1"
        )
          .bind(deviceId, token)
          .first<{ token: string }>()
      : await env.NOVA_DB.prepare(
          "SELECT token FROM fcm_devices WHERE token = ? LIMIT 1"
        )
          .bind(token)
          .first<{ token: string }>();

    if (!existingKnown) {
      return jsonResponse({
        registered: false,
        skipped: true,
        notificationsEnabled: false,
        reason: "Notification permission is not granted yet.",
      });
    }
  }

  let preserveAdminFlag = 0;

  // Deduplicate by installation deviceId when an FCM token rotates
  if (deviceId) {
    const existingForDevice = await env.NOVA_DB.prepare(
      "SELECT token, is_admin_test FROM fcm_devices WHERE device_id = ? AND token != ?"
    )
      .bind(deviceId, token)
      .first<{ token: string; is_admin_test: number }>();

    if (existingForDevice) {
      preserveAdminFlag = existingForDevice.is_admin_test === 1 ? 1 : 0;
      await env.NOVA_DB.prepare(
        "DELETE FROM fcm_devices WHERE device_id = ? AND token != ?"
      )
        .bind(deviceId, token)
        .run();
    }
  }

  await env.NOVA_DB.prepare(
    `INSERT INTO fcm_devices (
       token, device_id, package_name, app_version, app_version_code,
       android_sdk, device_model, manufacturer, notifications_enabled,
       locale, is_admin_test, status, created_at, last_seen_at
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
     ON CONFLICT(token) DO UPDATE SET
       device_id = COALESCE(excluded.device_id, fcm_devices.device_id),
       package_name = COALESCE(excluded.package_name, fcm_devices.package_name),
       app_version = COALESCE(excluded.app_version, fcm_devices.app_version),
       app_version_code = COALESCE(excluded.app_version_code, fcm_devices.app_version_code),
       android_sdk = COALESCE(excluded.android_sdk, fcm_devices.android_sdk),
       device_model = COALESCE(excluded.device_model, fcm_devices.device_model),
       manufacturer = COALESCE(excluded.manufacturer, fcm_devices.manufacturer),
       notifications_enabled = excluded.notifications_enabled,
       locale = COALESCE(excluded.locale, fcm_devices.locale),
       is_admin_test = MAX(fcm_devices.is_admin_test, excluded.is_admin_test),
       status = 'active',
       last_seen_at = excluded.last_seen_at`
  )
    .bind(
      token,
      deviceId,
      packageName,
      appVersion,
      appVersionCode,
      androidSdk,
      deviceModel,
      manufacturer,
      notificationsEnabled,
      locale,
      preserveAdminFlag,
      nowIso,
      nowIso
    )
    .run();

  return jsonResponse({
    registered: true,
    notificationsEnabled: notificationsEnabled === 1,
    updatedAt: nowIso,
  });
};

export const onRequestDelete = async ({
  request,
  env,
}: {
  request: Request;
  env: BroadcastEnv;
}): Promise<Response> => {
  if (!(await authorizeRegistrationRequest(request, env))) {
    return jsonResponse({ error: "Unauthorized device registration key." }, 401);
  }

  if (!env.NOVA_DB) {
    return jsonResponse(
      { error: "Cloudflare D1 binding (NOVA_DB) is not configured yet." },
      503
    );
  }

  let body: { token?: string; fcmToken?: string; deviceId?: string } = {};
  try {
    body = (await request.json()) as {
      token?: string;
      fcmToken?: string;
      deviceId?: string;
    };
  } catch {
    return jsonResponse({ error: "Invalid JSON payload." }, 400);
  }

  const rawToken =
    typeof body.fcmToken === "string" && body.fcmToken.trim()
      ? body.fcmToken
      : body.token;
  const token = typeof rawToken === "string" ? rawToken.trim() : "";
  const deviceId = sanitizeOptionalText(body.deviceId, 128);

  if (!token && !deviceId) {
    return jsonResponse(
      { error: "Provide a valid FCM registration token or deviceId." },
      400
    );
  }

  if (token && !isValidFcmToken(token)) {
    return jsonResponse({ error: "Invalid FCM registration token." }, 400);
  }

  await ensureBroadcastSchema(env.NOVA_DB);
  if (token && deviceId) {
    await env.NOVA_DB.prepare(
      "DELETE FROM fcm_devices WHERE token = ? OR device_id = ?"
    )
      .bind(token, deviceId)
      .run();
  } else if (token) {
    await env.NOVA_DB.prepare("DELETE FROM fcm_devices WHERE token = ?")
      .bind(token)
      .run();
  } else if (deviceId) {
    await env.NOVA_DB.prepare("DELETE FROM fcm_devices WHERE device_id = ?")
      .bind(deviceId)
      .run();
  }

  return jsonResponse({ unregistered: true });
};
