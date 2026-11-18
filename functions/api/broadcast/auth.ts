import {
  buildSessionCookieHeader,
  checkAuthRateLimit,
  clearAuthFailures,
  createSessionToken,
  getAdminCode,
  getClientIpHash,
  getSessionSecret,
  jsonResponse,
  recordAuthFailure,
  timingSafeEqualStrings,
  type BroadcastEnv,
} from "../../../server/broadcast/cryptoAuth";

export const onRequestPost = async ({
  request,
  env,
}: {
  request: Request;
  env: BroadcastEnv;
}): Promise<Response> => {
  const configuredAdminCode = getAdminCode(env);
  const configuredSessionSecret = getSessionSecret(env);

  const missingAuthVars: string[] = [];
  if (!configuredAdminCode) missingAuthVars.push("NOVA_BROADCAST_ADMIN_CODE");
  if (!configuredSessionSecret) missingAuthVars.push("NOVA_BROADCAST_SESSION_SECRET");

  if (missingAuthVars.length > 0) {
    return jsonResponse(
      {
        error: `Server configuration error: Missing ${missingAuthVars.join(
          " and "
        )}. Configure ${
          missingAuthVars.length > 1 ? "both variables" : "this variable"
        } in Cloudflare Pages -> Settings -> Environment Variables before signing in.`,
        missing: missingAuthVars,
      },
      503
    );
  }

  const ipHash = await getClientIpHash(request);
  const rateLimit = await checkAuthRateLimit(ipHash, env);
  if (!rateLimit.allowed) {
    return jsonResponse(
      {
        error: `Too many invalid verification attempts. Please wait ${Math.ceil(
          rateLimit.retryAfterSeconds / 60
        )} minute(s) before trying again.`,
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      },
      429,
      { "Retry-After": String(rateLimit.retryAfterSeconds) }
    );
  }

  let body: { secretCode?: string } = {};
  try {
    body = (await request.json()) as { secretCode?: string };
  } catch {
    return jsonResponse({ error: "Invalid request payload." }, 400);
  }

  const providedCode =
    typeof body.secretCode === "string" ? body.secretCode.trim() : "";
  if (!providedCode) {
    return jsonResponse({ error: "Admin secret code is required." }, 400);
  }

  const isMatch = await timingSafeEqualStrings(
    providedCode,
    configuredAdminCode as string
  );
  if (!isMatch) {
    const failure = await recordAuthFailure(ipHash, env);
    if (failure.locked) {
      return jsonResponse(
        {
          error:
            "Too many invalid attempts. Access temporarily locked for 15 minutes.",
          retryAfterSeconds: failure.retryAfterSeconds,
        },
        429,
        { "Retry-After": String(failure.retryAfterSeconds) }
      );
    }

    return jsonResponse(
      {
        error: `Invalid secret code. ${failure.remainingAttempts} attempt(s) remaining before temporary lockout.`,
      },
      401
    );
  }

  await clearAuthFailures(ipHash, env);

  const session = await createSessionToken(env);
  if (!session) {
    return jsonResponse(
      {
        error:
          "Server configuration error: NOVA_BROADCAST_SESSION_SECRET is missing and required to sign admin session cookies.",
        missing: ["NOVA_BROADCAST_SESSION_SECRET"],
      },
      503
    );
  }

  return jsonResponse(
    {
      authenticated: true,
      expiresAt: session.expiresAt,
    },
    200,
    {
      "Set-Cookie": buildSessionCookieHeader(session.token, request),
    }
  );
};
