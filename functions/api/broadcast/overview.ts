import {
  ensureBroadcastSchema,
  getServerConfigStatus,
  jsonResponse,
  verifySessionFromRequest,
  type BroadcastEnv,
} from "../../../server/broadcast/cryptoAuth";

function maskToken(token: string): string {
  if (token.length <= 14) return "***";
  return `${token.slice(0, 8)}...${token.slice(-6)}`;
}

export const onRequestGet = async ({
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

  const config = getServerConfigStatus(env);

  if (!env.NOVA_DB) {
    return jsonResponse({
      config,
      stats: {
        totalDevices: 0,
        activeDevices: 0,
        adminTestDevices: 0,
        totalBroadcasts: 0,
        totalDelivered: 0,
        totalFailed: 0,
        invalidTokensRemoved: 0,
      },
      devices: [],
      history: [],
    });
  }

  await ensureBroadcastSchema(env.NOVA_DB);

  const deviceStats = await env.NOVA_DB.prepare(
    `SELECT
       COUNT(*) AS totalDevices,
       COALESCE(SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END), 0) AS activeDevices,
       COALESCE(SUM(CASE WHEN status = 'active' AND is_admin_test = 1 THEN 1 ELSE 0 END), 0) AS adminTestDevices
     FROM fcm_devices`
  ).first<{
    totalDevices: number;
    activeDevices: number;
    adminTestDevices: number;
  }>();

  const historyStats = await env.NOVA_DB.prepare(
    `SELECT
       COUNT(*) AS totalBroadcasts,
       COALESCE(SUM(success_count), 0) AS totalDelivered,
       COALESCE(SUM(failure_count), 0) AS totalFailed,
       COALESCE(SUM(invalid_tokens_removed), 0) AS invalidTokensRemoved
     FROM broadcast_history`
  ).first<{
    totalBroadcasts: number;
    totalDelivered: number;
    totalFailed: number;
    invalidTokensRemoved: number;
  }>();

  const recentDeviceRows = await env.NOVA_DB.prepare(
    `SELECT token, device_id, app_version, android_sdk, is_admin_test, status, last_seen_at
     FROM fcm_devices
     WHERE status = 'active'
     ORDER BY is_admin_test DESC, last_seen_at DESC
     LIMIT 20`
  ).all<{
    token: string;
    device_id: string | null;
    app_version: string | null;
    android_sdk: number | null;
    is_admin_test: number;
    status: string;
    last_seen_at: string;
  }>();

  const historyRows = await env.NOVA_DB.prepare(
    `SELECT id, title, message, image_url, deep_link, mode, status,
            targeted_count, success_count, failure_count, invalid_tokens_removed,
            error_summary, created_at
     FROM broadcast_history
     ORDER BY created_at DESC
     LIMIT 30`
  ).all<{
    id: string;
    title: string;
    message: string;
    image_url: string | null;
    deep_link: string | null;
    mode: string;
    status: string;
    targeted_count: number;
    success_count: number;
    failure_count: number;
    invalid_tokens_removed: number;
    error_summary: string | null;
    created_at: string;
  }>();

  return jsonResponse({
    config,
    stats: {
      totalDevices: deviceStats?.totalDevices ?? 0,
      activeDevices: deviceStats?.activeDevices ?? 0,
      adminTestDevices: deviceStats?.adminTestDevices ?? 0,
      totalBroadcasts: historyStats?.totalBroadcasts ?? 0,
      totalDelivered: historyStats?.totalDelivered ?? 0,
      totalFailed: historyStats?.totalFailed ?? 0,
      invalidTokensRemoved: historyStats?.invalidTokensRemoved ?? 0,
    },
    devices: (recentDeviceRows.results ?? []).map((row) => ({
      maskedToken: maskToken(row.token),
      deviceId: row.device_id ? `${row.device_id.slice(0, 8)}...` : null,
      appVersion: row.app_version ?? "Unknown",
      androidSdk: row.android_sdk,
      isAdminTest: row.is_admin_test === 1,
      status: row.status,
      lastSeenAt: row.last_seen_at,
    })),
    history: (historyRows.results ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      message: row.message,
      imageUrl: row.image_url,
      deepLink: row.deep_link,
      mode: row.mode,
      status: row.status,
      targetedCount: row.targeted_count,
      successCount: row.success_count,
      failureCount: row.failure_count,
      invalidTokensRemoved: row.invalid_tokens_removed,
      errorSummary: row.error_summary,
      createdAt: row.created_at,
    })),
  });
};
