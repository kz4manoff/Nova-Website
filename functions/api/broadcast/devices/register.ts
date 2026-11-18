import {
  ensureBroadcastSchema,
  jsonResponse,
  resolveEnvVar,
  timingSafeEqualStrings,
  type BroadcastEnv,
} from "../../../../server/broadcast/cryptoAuth";

interface RegisterDeviceBody {
  token?: string;
  deviceId?: string;
  platform?: string;
  appVersion?: string;
  androidSdk?: number;
}

function isValidFcmToken(token: string): boolean {
  const trimmed = token.trim();
  return (
    trimmed.length >= 32 &&
    trimmed.length <= 512 &&
    !/\s/.test(trimmed)
  );
}

export const onRequestPost = async ({
  request,
  env,
}: {
  request: Request;
  env: BroadcastEnv;
}): Promise<Response> => {
  // Optional shared app registration key check when NOVA_ANDROID_REG_KEY is configured
  const requiredAppKey = resolveEnvVar(env, "NOVA_ANDROID_REG_KEY");
  if (requiredAppKey) {
    const providedKey = request.headers.get("X-Nova-App-Key")?.trim() ?? "";
    const validKey = await timingSafeEqualStrings(providedKey, requiredAppKey);
    if (!validKey) {
      return jsonResponse({ error: "Unauthorized device registration key." }, 401);
    }
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

  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!isValidFcmToken(token)) {
    return jsonResponse({ error: "Invalid FCM registration token." }, 400);
  }

  const platform =
    typeof body.platform === "string" ? body.platform.trim().toLowerCase() : "android";
  if (platform !== "android") {
    return jsonResponse(
      { error: "Only Android device tokens are supported." },
      400
    );
  }

  const deviceId =
    typeof body.deviceId === "string" && body.deviceId.trim()
      ? body.deviceId.trim().slice(0, 128)
      : null;
  const appVersion =
    typeof body.appVersion === "string" && body.appVersion.trim()
      ? body.appVersion.trim().slice(0, 32)
      : null;
  const androidSdk =
    typeof body.androidSdk === "number" &&
    Number.isInteger(body.androidSdk) &&
    body.androidSdk >= 21 &&
    body.androidSdk <= 99
      ? body.androidSdk
      : null;

  const nowIso = new Date().toISOString();
  await ensureBroadcastSchema(env.NOVA_DB);

  // If this deviceId previously registered an older rotated FCM token, remove the old token
  if (deviceId) {
    const existingForDevice = await env.NOVA_DB.prepare(
      "SELECT token, is_admin_test FROM fcm_devices WHERE device_id = ? AND token != ?"
    )
      .bind(deviceId, token)
      .first<{ token: string; is_admin_test: number }>();

    const preserveAdminFlag = existingForDevice?.is_admin_test === 1 ? 1 : 0;

    if (existingForDevice) {
      await env.NOVA_DB.prepare("DELETE FROM fcm_devices WHERE device_id = ? AND token != ?")
        .bind(deviceId, token)
        .run();
    }

    await env.NOVA_DB.prepare(
      `INSERT INTO fcm_devices (token, device_id, app_version, android_sdk, is_admin_test, status, created_at, last_seen_at)
       VALUES (?, ?, ?, ?, ?, 'active', ?, ?)
       ON CONFLICT(token) DO UPDATE SET
         device_id = COALESCE(excluded.device_id, fcm_devices.device_id),
         app_version = COALESCE(excluded.app_version, fcm_devices.app_version),
         android_sdk = COALESCE(excluded.android_sdk, fcm_devices.android_sdk),
         is_admin_test = MAX(fcm_devices.is_admin_test, excluded.is_admin_test),
         status = 'active',
         last_seen_at = excluded.last_seen_at`
    )
      .bind(token, deviceId, appVersion, androidSdk, preserveAdminFlag, nowIso, nowIso)
      .run();
  } else {
    await env.NOVA_DB.prepare(
      `INSERT INTO fcm_devices (token, device_id, app_version, android_sdk, is_admin_test, status, created_at, last_seen_at)
       VALUES (?, NULL, ?, ?, 0, 'active', ?, ?)
       ON CONFLICT(token) DO UPDATE SET
         app_version = COALESCE(excluded.app_version, fcm_devices.app_version),
         android_sdk = COALESCE(excluded.android_sdk, fcm_devices.android_sdk),
         status = 'active',
         last_seen_at = excluded.last_seen_at`
    )
      .bind(token, appVersion, androidSdk, nowIso, nowIso)
      .run();
  }

  return jsonResponse({ registered: true, updatedAt: nowIso });
};

export const onRequestDelete = async ({
  request,
  env,
}: {
  request: Request;
  env: BroadcastEnv;
}): Promise<Response> => {
  if (!env.NOVA_DB) {
    return jsonResponse(
      { error: "Cloudflare D1 binding (NOVA_DB) is not configured yet." },
      503
    );
  }

  let body: { token?: string } = {};
  try {
    body = (await request.json()) as { token?: string };
  } catch {
    return jsonResponse({ error: "Invalid JSON payload." }, 400);
  }

  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!isValidFcmToken(token)) {
    return jsonResponse({ error: "Invalid FCM registration token." }, 400);
  }

  await ensureBroadcastSchema(env.NOVA_DB);
  await env.NOVA_DB.prepare("DELETE FROM fcm_devices WHERE token = ?")
    .bind(token)
    .run();

  return jsonResponse({ unregistered: true });
};
