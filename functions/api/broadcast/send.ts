import {
  ensureBroadcastSchema,
  getServerConfigStatus,
  jsonResponse,
  maskFcmToken,
  verifySessionFromRequest,
  type BroadcastEnv,
} from "../../../server/broadcast/cryptoAuth";
import {
  sendFcmNotificationToTokens,
  type FcmSendOutcome,
} from "../../../server/broadcast/fcmClient";

interface SendBroadcastBody {
  title?: string;
  message?: string;
  imageUrl?: string;
  deepLink?: string;
  mode?: "test" | "all";
  testToken?: string;
  idempotencyKey?: string;
}

function isValidHttpsImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidDeepLink(link: string): boolean {
  const trimmed = link.trim();
  if (!trimmed || trimmed.length > 256) return false;
  if (/^(novamusic|https):\/\//i.test(trimmed)) return true;
  if (/^\/[a-zA-Z0-9\-_/]*$/.test(trimmed)) return true;
  return false;
}

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

  const config = getServerConfigStatus(env);
  if (!env.NOVA_DB) {
    return jsonResponse(
      {
        error:
          "Cloudflare D1 binding (NOVA_DB) is not configured yet. Bind NOVA_DB in Cloudflare Pages before sending broadcasts.",
        config,
      },
      503
    );
  }
  if (!config.fcmConfigured) {
    return jsonResponse(
      {
        error:
          config.fcmError ??
          "Firebase Service Account credentials are not configured on the server yet. Add FIREBASE_SERVICE_ACCOUNT_JSON in Cloudflare Pages Environment Variables.",
        config,
      },
      503
    );
  }

  let body: SendBroadcastBody = {};
  try {
    body = (await request.json()) as SendBroadcastBody;
  } catch {
    return jsonResponse({ error: "Invalid JSON payload." }, 400);
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const imageUrl =
    typeof body.imageUrl === "string" && body.imageUrl.trim()
      ? body.imageUrl.trim()
      : undefined;
  const deepLink =
    typeof body.deepLink === "string" && body.deepLink.trim()
      ? body.deepLink.trim()
      : undefined;
  const mode: "test" | "all" = body.mode === "test" ? "test" : "all";
  const explicitTestToken =
    typeof body.testToken === "string" && body.testToken.trim()
      ? body.testToken.trim()
      : undefined;
  const idempotencyKey =
    typeof body.idempotencyKey === "string" && body.idempotencyKey.trim()
      ? body.idempotencyKey.trim().slice(0, 64)
      : null;

  if (title.length < 1 || title.length > 100) {
    return jsonResponse(
      { error: "Notification title must be between 1 and 100 characters." },
      400
    );
  }
  if (message.length < 1 || message.length > 500) {
    return jsonResponse(
      { error: "Notification message must be between 1 and 500 characters." },
      400
    );
  }
  if (imageUrl && !isValidHttpsImageUrl(imageUrl)) {
    return jsonResponse(
      { error: "Optional image URL must be a valid https:// URL." },
      400
    );
  }
  if (deepLink && !isValidDeepLink(deepLink)) {
    return jsonResponse(
      {
        error:
          "Destination / deep link must start with novamusic://, https://, or /.",
      },
      400
    );
  }

  await ensureBroadcastSchema(env.NOVA_DB);

  // Prevent duplicate sends when an identical idempotencyKey is retried
  if (idempotencyKey) {
    const existing = await env.NOVA_DB.prepare(
      `SELECT id, status, targeted_count, success_count, failure_count, invalid_tokens_removed, created_at
       FROM broadcast_history
       WHERE idempotency_key = ?
       LIMIT 1`
    )
      .bind(idempotencyKey)
      .first<{
        id: string;
        status: string;
        targeted_count: number;
        success_count: number;
        failure_count: number;
        invalid_tokens_removed: number;
        created_at: string;
      }>();

    if (existing) {
      return jsonResponse({
        deduplicated: true,
        broadcast: {
          id: existing.id,
          status: existing.status,
          targetedCount: existing.targeted_count,
          successCount: existing.success_count,
          failureCount: existing.failure_count,
          invalidTokensRemoved: existing.invalid_tokens_removed,
          createdAt: existing.created_at,
        },
      });
    }
  }

  // Gather target tokens from D1 (never trust arbitrary client token arrays for "all")
  let targetTokens: string[] = [];
  if (mode === "test") {
    if (explicitTestToken) {
      if (
        explicitTestToken.length < 32 ||
        explicitTestToken.length > 512 ||
        /\s/.test(explicitTestToken)
      ) {
        return jsonResponse(
          { error: "Provided test FCM token is not valid." },
          400
        );
      }
      targetTokens = [explicitTestToken];
    } else {
      const testRows = await env.NOVA_DB.prepare(
        "SELECT token FROM fcm_devices WHERE status = 'active' AND is_admin_test = 1 ORDER BY last_seen_at DESC LIMIT 5"
      ).all<{ token: string }>();
      targetTokens = (testRows.results ?? []).map((r) => r.token);
    }

    if (targetTokens.length === 0) {
      return jsonResponse(
        {
          error:
            "No admin test device is registered yet. Register your Android test FCM token below or pass a test token.",
        },
        400
      );
    }
  } else {
    const allRows = await env.NOVA_DB.prepare(
      "SELECT token FROM fcm_devices WHERE status = 'active'"
    ).all<{ token: string }>();
    targetTokens = (allRows.results ?? []).map((r) => r.token);

    if (targetTokens.length === 0) {
      return jsonResponse(
        {
          error:
            "No registered Android devices found yet. Users must install the FCM-enabled NOVA MUSIC app and grant notification permission first.",
        },
        400
      );
    }
  }

  const broadcastId = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  let sendResult: {
    successCount: number;
    failureCount: number;
    invalidTokens: string[];
    errors: string[];
    outcomes: FcmSendOutcome[];
  };

  try {
    sendResult = await sendFcmNotificationToTokens(env, targetTokens, {
      broadcastId,
      title,
      message,
      imageUrl,
      deepLink,
    });
  } catch (err) {
    const errMsg =
      err instanceof Error ? err.message : "Failed to send FCM notification.";

    await env.NOVA_DB.prepare(
      `INSERT INTO broadcast_history
         (id, idempotency_key, title, message, image_url, deep_link, mode, status, targeted_count, success_count, failure_count, invalid_tokens_removed, error_summary, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'failed', ?, 0, ?, 0, ?, ?)`
    )
      .bind(
        broadcastId,
        idempotencyKey,
        title,
        message,
        imageUrl ?? null,
        deepLink ?? null,
        mode,
        targetTokens.length,
        targetTokens.length,
        errMsg.slice(0, 300),
        createdAt
      )
      .run();

    return jsonResponse({ error: errMsg }, 502);
  }

  // Prune invalid/unregistered FCM tokens from D1 automatically
  let removedCount = 0;
  for (const invalidToken of sendResult.invalidTokens) {
    await env.NOVA_DB.prepare("DELETE FROM fcm_devices WHERE token = ?")
      .bind(invalidToken)
      .run();
    removedCount++;
  }

  const status =
    sendResult.successCount === targetTokens.length
      ? "sent"
      : sendResult.successCount > 0
      ? "partial"
      : "failed";
  const errorSummary =
    sendResult.errors.length > 0 ? sendResult.errors.join(" | ").slice(0, 300) : null;

  await env.NOVA_DB.prepare(
    `INSERT INTO broadcast_history
       (id, idempotency_key, title, message, image_url, deep_link, mode, status, targeted_count, success_count, failure_count, invalid_tokens_removed, error_summary, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      broadcastId,
      idempotencyKey,
      title,
      message,
      imageUrl ?? null,
      deepLink ?? null,
      mode,
      status,
      targetTokens.length,
      sendResult.successCount,
      sendResult.failureCount,
      removedCount,
      errorSummary,
      createdAt
    )
    .run();

  // Persist per-device broadcast delivery records (masked tokens only)
  for (const outcome of sendResult.outcomes.slice(0, 100)) {
    const deliveryStatus = outcome.ok
      ? "delivered"
      : outcome.invalidToken
      ? "pruned"
      : "failed";
    await env.NOVA_DB.prepare(
      `INSERT INTO broadcast_deliveries (id, broadcast_id, token_masked, status, error_message, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
      .bind(
        crypto.randomUUID(),
        broadcastId,
        maskFcmToken(outcome.token),
        deliveryStatus,
        outcome.errorMessage ? outcome.errorMessage.slice(0, 200) : null,
        createdAt
      )
      .run();
  }

  return jsonResponse({
    deduplicated: false,
    broadcast: {
      id: broadcastId,
      title,
      message,
      imageUrl: imageUrl ?? null,
      deepLink: deepLink ?? null,
      mode,
      status,
      targetedCount: targetTokens.length,
      successCount: sendResult.successCount,
      failureCount: sendResult.failureCount,
      invalidTokensRemoved: removedCount,
      errorSummary,
      createdAt,
    },
  });
};
