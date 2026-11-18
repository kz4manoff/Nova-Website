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

const D1_PAGE_SIZE = 200;

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

async function fetchPaginatedEligibleTokens(
  db: NonNullable<BroadcastEnv["NOVA_DB"]>
): Promise<string[]> {
  const tokens: string[] = [];
  let offset = 0;

  while (true) {
    const page = await db
      .prepare(
        `SELECT token
         FROM fcm_devices
         WHERE (status IS NULL OR status = 'active')
           AND (notifications_enabled IS NULL OR notifications_enabled = 1)
         ORDER BY created_at ASC, token ASC
         LIMIT ? OFFSET ?`
      )
      .bind(D1_PAGE_SIZE, offset)
      .all<{ token: string }>();

    const rows = page.results ?? [];
    for (const row of rows) {
      const candidate = typeof row.token === "string" ? row.token.trim() : "";
      if (candidate.length >= 32 && candidate.length <= 512 && !/\s/.test(candidate)) {
        tokens.push(candidate);
      }
    }

    if (rows.length < D1_PAGE_SIZE) {
      break;
    }
    offset += D1_PAGE_SIZE;
  }

  return tokens;
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
    return jsonResponse(
      { error: "Unauthorized. Admin authentication required." },
      401
    );
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
          fcmAcceptedCount: existing.success_count,
          failureCount: existing.failure_count,
          invalidTokensRemoved: existing.invalid_tokens_removed,
          createdAt: existing.created_at,
        },
      });
    }
  }

  // Gather target tokens from D1 (Send to All never depends on admin test tokens)
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
        `SELECT token
         FROM fcm_devices
         WHERE status = 'active' AND notifications_enabled = 1 AND is_admin_test = 1
         ORDER BY last_seen_at DESC
         LIMIT 5`
      ).all<{ token: string }>();
      targetTokens = (testRows.results ?? []).map((r) => r.token);
    }

    if (targetTokens.length === 0) {
      return jsonResponse(
        {
          error:
            "Optional admin test device is not configured. Add a test token below to send a single-device test, or click Send to All Devices to broadcast to every registered NOVA MUSIC user.",
        },
        400
      );
    }
  } else {
    targetTokens = await fetchPaginatedEligibleTokens(env.NOVA_DB);

    if (targetTokens.length === 0) {
      return jsonResponse(
        {
          error:
            "No notification-enabled Android devices are registered yet. Devices register automatically once users open NOVA MUSIC with notification permission enabled.",
        },
        400
      );
    }
  }

  const broadcastId = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  let successCount = 0;
  let failureCount = 0;
  const invalidTokens: string[] = [];
  const errors: string[] = [];
  const outcomes: FcmSendOutcome[] = [];

  try {
    // Process targets in paginated batches of 200 to keep memory bounded on large audiences
    for (let i = 0; i < targetTokens.length; i += D1_PAGE_SIZE) {
      const chunk = targetTokens.slice(i, i + D1_PAGE_SIZE);
      const chunkResult = await sendFcmNotificationToTokens(env, chunk, {
        broadcastId,
        title,
        message,
        imageUrl,
        deepLink,
      });

      successCount += chunkResult.successCount;
      failureCount += chunkResult.failureCount;
      invalidTokens.push(...chunkResult.invalidTokens);
      for (const e of chunkResult.errors) {
        if (errors.length < 5) errors.push(e);
      }
      if (outcomes.length < 150) {
        outcomes.push(...chunkResult.outcomes.slice(0, 150 - outcomes.length));
      }
    }
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
  for (const invalidToken of invalidTokens) {
    await env.NOVA_DB.prepare("DELETE FROM fcm_devices WHERE token = ?")
      .bind(invalidToken)
      .run();
    removedCount++;
  }

  const status =
    successCount === targetTokens.length
      ? "sent"
      : successCount > 0
      ? "partial"
      : "failed";
  const errorSummary =
    errors.length > 0 ? errors.join(" | ").slice(0, 300) : null;

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
      successCount,
      failureCount,
      removedCount,
      errorSummary,
      createdAt
    )
    .run();

  // Persist per-device broadcast delivery records (masked tokens only)
  for (const outcome of outcomes.slice(0, 100)) {
    const deliveryStatus = outcome.ok
      ? "accepted"
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
      successCount,
      fcmAcceptedCount: successCount,
      failureCount,
      invalidTokensRemoved: removedCount,
      errorSummary,
      createdAt,
    },
  });
};
