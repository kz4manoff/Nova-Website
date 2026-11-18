import {
  ensureBroadcastSchema,
  jsonResponse,
  verifySessionFromRequest,
  type BroadcastEnv,
} from "../../../server/broadcast/cryptoAuth";

export const onRequestPost = async ({
  request,
  env,
}: {
  request: Request;
  env: BroadcastEnv;
}): Promise<Response> => {
  const session = await verifySessionFromRequest(request, env);
  if (session.missingSessionSecret) {
    return jsonResponse(
      {
        error:
          "Server configuration error: NOVA_BROADCAST_SESSION_SECRET is not configured on the server.",
        missing: ["NOVA_BROADCAST_SESSION_SECRET"],
      },
      503
    );
  }
  if (!session.valid) {
    return jsonResponse({ error: "Unauthorized. Admin authentication required." }, 401);
  }

  if (!env.NOVA_DB) {
    return jsonResponse(
      { error: "Cloudflare D1 binding (NOVA_DB) is not configured yet." },
      503
    );
  }

  let body: { token?: string; labelVersion?: string } = {};
  try {
    body = (await request.json()) as { token?: string; labelVersion?: string };
  } catch {
    return jsonResponse({ error: "Invalid JSON payload." }, 400);
  }

  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (token.length < 32 || token.length > 512 || /\s/.test(token)) {
    return jsonResponse(
      { error: "Please provide a valid Android FCM registration token." },
      400
    );
  }

  const nowIso = new Date().toISOString();
  await ensureBroadcastSchema(env.NOVA_DB);

  await env.NOVA_DB.prepare(
    `INSERT INTO fcm_devices (token, device_id, app_version, android_sdk, notifications_enabled, is_admin_test, status, created_at, last_seen_at)
     VALUES (?, 'admin-test-device', ?, NULL, 1, 1, 'active', ?, ?)
     ON CONFLICT(token) DO UPDATE SET
       notifications_enabled = 1,
       is_admin_test = 1,
       status = 'active',
       last_seen_at = excluded.last_seen_at`
  )
    .bind(
      token,
      typeof body.labelVersion === "string" && body.labelVersion.trim()
        ? body.labelVersion.trim().slice(0, 32)
        : "admin-test",
      nowIso,
      nowIso
    )
    .run();

  return jsonResponse({
    saved: true,
    maskedToken: `${token.slice(0, 8)}...${token.slice(-6)}`,
  });
};
