/**
 * Server-only authentication, rate-limiting, session signing, and D1 schema helpers
 * for the NOVA BROADCAST Admin Panel (/nova-control).
 *
 * Runs exclusively on the server (Cloudflare Pages Functions). Never import into frontend code.
 */
import { inspectFirebaseConfig } from "./fcmClient";

export interface D1PreparedStatementLike {
  bind(...values: unknown[]): D1PreparedStatementLike;
  first<T = Record<string, unknown>>(colName?: string): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results?: T[] }>;
  run<T = unknown>(): Promise<{
    success: boolean;
    meta?: Record<string, unknown>;
    results?: T[];
  }>;
}

export interface D1DatabaseLike {
  prepare(query: string): D1PreparedStatementLike;
}

export interface BroadcastEnv {
  NOVA_DB?: D1DatabaseLike;
  NOVA_BROADCAST_ADMIN_CODE?: string;
  NOVA_BROADCAST_SESSION_SECRET?: string;
  NOVA_ANDROID_REG_KEY?: string;
  NOVA_BROADCAST_CLIENT_KEY?: string;
  FIREBASE_SERVICE_ACCOUNT_JSON?: string;
  FIREBASE_PROJECT_ID?: string;
  FIREBASE_CLIENT_EMAIL?: string;
  FIREBASE_PRIVATE_KEY?: string;
}

export function resolveEnvVar(
  env: BroadcastEnv | undefined,
  key: Exclude<keyof BroadcastEnv, "NOVA_DB">
): string | null {
  const fromBinding = env?.[key];
  if (typeof fromBinding === "string" && fromBinding.trim().length > 0) {
    return fromBinding.trim();
  }

  const processEnv = (
    globalThis as { process?: { env?: Record<string, string | undefined> } }
  ).process?.env;
  const fromProcess = processEnv?.[key];
  if (typeof fromProcess === "string" && fromProcess.trim().length > 0) {
    return fromProcess.trim();
  }

  return null;
}

export function getAdminCode(env: BroadcastEnv | undefined): string | null {
  return resolveEnvVar(env, "NOVA_BROADCAST_ADMIN_CODE");
}

export function getSessionSecret(env: BroadcastEnv | undefined): string | null {
  return resolveEnvVar(env, "NOVA_BROADCAST_SESSION_SECRET");
}

export const SESSION_COOKIE_NAME = "nova_broadcast_session";
export const SESSION_TTL_SECONDS = 4 * 60 * 60; // 4 hours
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_SECONDS = 15 * 60; // 15 minutes
const RATE_LIMIT_LOCKOUT_SECONDS = 15 * 60; // 15 minutes

// Isolate-level fallback rate limiter when D1 is not bound
const memoryRateLimits = new Map<
  string,
  { failedCount: number; windowStart: number; lockedUntil: number }
>();

export const JSON_NO_STORE_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

export function jsonResponse(
  data: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...JSON_NO_STORE_HEADERS,
      ...extraHeaders,
    },
  });
}

const initializedD1Instances = new WeakSet<object>();

export function maskFcmToken(token: string): string {
  if (token.length <= 14) return "***";
  return `${token.slice(0, 8)}...${token.slice(-6)}`;
}

export async function ensureBroadcastSchema(db: D1DatabaseLike): Promise<void> {
  if (initializedD1Instances.has(db)) {
    return;
  }

  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS fcm_devices (
        token TEXT PRIMARY KEY,
        device_id TEXT,
        package_name TEXT,
        app_version TEXT,
        app_version_code INTEGER,
        android_sdk INTEGER,
        device_model TEXT,
        manufacturer TEXT,
        notifications_enabled INTEGER NOT NULL DEFAULT 1,
        locale TEXT,
        is_admin_test INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL
      )`
    )
    .run();

  const fcmDeviceMigrations = [
    "ALTER TABLE fcm_devices ADD COLUMN package_name TEXT",
    "ALTER TABLE fcm_devices ADD COLUMN app_version_code INTEGER",
    "ALTER TABLE fcm_devices ADD COLUMN device_model TEXT",
    "ALTER TABLE fcm_devices ADD COLUMN manufacturer TEXT",
    "ALTER TABLE fcm_devices ADD COLUMN notifications_enabled INTEGER NOT NULL DEFAULT 1",
    "ALTER TABLE fcm_devices ADD COLUMN locale TEXT",
  ];
  for (const ddl of fcmDeviceMigrations) {
    try {
      await db.prepare(ddl).run();
    } catch {
      // Column already exists on initialized D1 instances
    }
  }

  await db
    .prepare(
      "CREATE INDEX IF NOT EXISTS idx_fcm_devices_status ON fcm_devices (status, is_admin_test)"
    )
    .run();

  await db
    .prepare(
      "CREATE INDEX IF NOT EXISTS idx_fcm_devices_eligible ON fcm_devices (status, notifications_enabled, is_admin_test)"
    )
    .run();

  try {
    await db
      .prepare(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_fcm_devices_device_id ON fcm_devices (device_id) WHERE device_id IS NOT NULL"
      )
      .run();
  } catch {
    // Ignore if index already exists or cannot be created retroactively
  }

  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS broadcast_history (
        id TEXT PRIMARY KEY,
        idempotency_key TEXT UNIQUE,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        image_url TEXT,
        deep_link TEXT,
        mode TEXT NOT NULL,
        status TEXT NOT NULL,
        targeted_count INTEGER NOT NULL DEFAULT 0,
        success_count INTEGER NOT NULL DEFAULT 0,
        failure_count INTEGER NOT NULL DEFAULT 0,
        invalid_tokens_removed INTEGER NOT NULL DEFAULT 0,
        error_summary TEXT,
        created_at TEXT NOT NULL
      )`
    )
    .run();

  await db
    .prepare(
      "CREATE INDEX IF NOT EXISTS idx_broadcast_history_created ON broadcast_history (created_at DESC)"
    )
    .run();

  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS broadcast_auth_attempts (
        ip_hash TEXT PRIMARY KEY,
        failed_count INTEGER NOT NULL DEFAULT 0,
        window_start INTEGER NOT NULL,
        locked_until INTEGER NOT NULL DEFAULT 0
      )`
    )
    .run();

  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS broadcast_deliveries (
        id TEXT PRIMARY KEY,
        broadcast_id TEXT NOT NULL,
        token_masked TEXT NOT NULL,
        status TEXT NOT NULL,
        error_message TEXT,
        created_at TEXT NOT NULL
      )`
    )
    .run();

  await db
    .prepare(
      "CREATE INDEX IF NOT EXISTS idx_broadcast_deliveries_broadcast ON broadcast_deliveries (broadcast_id, created_at DESC)"
    )
    .run();

  initializedD1Instances.add(db);
}

export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Constant-time string comparison using SHA-256 digests so timing leaks
 * cannot reveal secret length or prefix characters.
 */
export async function timingSafeEqualStrings(
  a: string,
  b: string
): Promise<boolean> {
  const digestA = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(a))
  );
  const digestB = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(b))
  );
  let diff = 0;
  for (let i = 0; i < digestA.length; i++) {
    diff |= digestA[i] ^ digestB[i];
  }
  return diff === 0;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str: string): Uint8Array | null {
  try {
    const padded = str.replace(/-/g, "+").replace(/_/g, "/") +
      "=".repeat((4 - (str.length % 4)) % 4);
    const binary = atob(padded);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      out[i] = binary.charCodeAt(i);
    }
    return out;
  } catch {
    return null;
  }
}

function getSigningSecret(env: BroadcastEnv | undefined): string | null {
  return getSessionSecret(env);
}

async function signHmac(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message)
  );
  return base64UrlEncode(new Uint8Array(sig));
}

export interface AdminSessionPayload {
  sub: "nova-admin";
  iat: number;
  exp: number;
  nonce: string;
}

export async function createSessionToken(
  env: BroadcastEnv
): Promise<{ token: string; expiresAt: number } | null> {
  const secret = getSigningSecret(env);
  if (!secret) return null;

  const nowSec = Math.floor(Date.now() / 1000);
  const exp = nowSec + SESSION_TTL_SECONDS;
  const nonceBytes = new Uint8Array(12);
  crypto.getRandomValues(nonceBytes);

  const payload: AdminSessionPayload = {
    sub: "nova-admin",
    iat: nowSec,
    exp,
    nonce: base64UrlEncode(nonceBytes),
  };

  const payloadB64 = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify(payload))
  );
  const signature = await signHmac(payloadB64, secret);
  return { token: `${payloadB64}.${signature}`, expiresAt: exp * 1000 };
}

export function parseCookieHeader(
  cookieHeader: string | null,
  cookieName: string
): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const name = part.slice(0, idx).trim();
    if (name === cookieName) {
      return decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return null;
}

export async function verifySessionFromRequest(
  request: Request,
  env: BroadcastEnv
): Promise<{ valid: boolean; expiresAt?: number; missingSessionSecret?: boolean }> {
  const secret = getSigningSecret(env);
  if (!secret) return { valid: false, missingSessionSecret: true };

  const rawToken = parseCookieHeader(
    request.headers.get("Cookie"),
    SESSION_COOKIE_NAME
  );
  if (!rawToken) return { valid: false };

  const dotIdx = rawToken.indexOf(".");
  if (dotIdx <= 0) return { valid: false };

  const payloadB64 = rawToken.slice(0, dotIdx);
  const providedSig = rawToken.slice(dotIdx + 1);
  if (!payloadB64 || !providedSig) return { valid: false };

  const expectedSig = await signHmac(payloadB64, secret);
  const sigMatches = await timingSafeEqualStrings(providedSig, expectedSig);
  if (!sigMatches) return { valid: false };

  const decodedBytes = base64UrlDecode(payloadB64);
  if (!decodedBytes) return { valid: false };

  try {
    const parsed = JSON.parse(
      new TextDecoder().decode(decodedBytes)
    ) as Partial<AdminSessionPayload>;
    const nowSec = Math.floor(Date.now() / 1000);
    if (
      parsed.sub !== "nova-admin" ||
      typeof parsed.exp !== "number" ||
      parsed.exp <= nowSec
    ) {
      return { valid: false };
    }
    return { valid: true, expiresAt: parsed.exp * 1000 };
  } catch {
    return { valid: false };
  }
}

export function buildSessionCookieHeader(
  token: string,
  request: Request,
  maxAgeSeconds = SESSION_TTL_SECONDS
): string {
  const isHttps = request.url.startsWith("https://");
  const attrs = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (isHttps) attrs.push("Secure");
  return attrs.join("; ");
}

export async function getClientIpHash(request: Request): Promise<string> {
  const ip =
    request.headers.get("CF-Connecting-IP") ??
    request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ??
    "local";
  return sha256Hex(`nova-auth:${ip}`);
}

export async function checkAuthRateLimit(
  ipHash: string,
  env: BroadcastEnv
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const nowSec = Math.floor(Date.now() / 1000);

  if (env.NOVA_DB) {
    try {
      await ensureBroadcastSchema(env.NOVA_DB);
      const row = await env.NOVA_DB.prepare(
        "SELECT failed_count, window_start, locked_until FROM broadcast_auth_attempts WHERE ip_hash = ?"
      )
        .bind(ipHash)
        .first<{
          failed_count: number;
          window_start: number;
          locked_until: number;
        }>();

      if (row && row.locked_until > nowSec) {
        return {
          allowed: false,
          retryAfterSeconds: row.locked_until - nowSec,
        };
      }
      return { allowed: true, retryAfterSeconds: 0 };
    } catch {
      // Fallback to isolate map below
    }
  }

  const mem = memoryRateLimits.get(ipHash);
  if (mem && mem.lockedUntil > nowSec) {
    return { allowed: false, retryAfterSeconds: mem.lockedUntil - nowSec };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

export async function recordAuthFailure(
  ipHash: string,
  env: BroadcastEnv
): Promise<{ locked: boolean; retryAfterSeconds: number; remainingAttempts: number }> {
  const nowSec = Math.floor(Date.now() / 1000);

  if (env.NOVA_DB) {
    try {
      await ensureBroadcastSchema(env.NOVA_DB);
      const row = await env.NOVA_DB.prepare(
        "SELECT failed_count, window_start, locked_until FROM broadcast_auth_attempts WHERE ip_hash = ?"
      )
        .bind(ipHash)
        .first<{
          failed_count: number;
          window_start: number;
          locked_until: number;
        }>();

      const withinWindow =
        row && nowSec - row.window_start <= RATE_LIMIT_WINDOW_SECONDS;
      const nextCount = withinWindow ? row.failed_count + 1 : 1;
      const windowStart = withinWindow ? row.window_start : nowSec;
      const lockedUntil =
        nextCount >= RATE_LIMIT_MAX_ATTEMPTS
          ? nowSec + RATE_LIMIT_LOCKOUT_SECONDS
          : 0;

      await env.NOVA_DB.prepare(
        `INSERT INTO broadcast_auth_attempts (ip_hash, failed_count, window_start, locked_until)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(ip_hash) DO UPDATE SET
           failed_count = excluded.failed_count,
           window_start = excluded.window_start,
           locked_until = excluded.locked_until`
      )
        .bind(ipHash, nextCount, windowStart, lockedUntil)
        .run();

      return {
        locked: lockedUntil > nowSec,
        retryAfterSeconds: lockedUntil > nowSec ? RATE_LIMIT_LOCKOUT_SECONDS : 0,
        remainingAttempts: Math.max(0, RATE_LIMIT_MAX_ATTEMPTS - nextCount),
      };
    } catch {
      // Fallback below
    }
  }

  const prev = memoryRateLimits.get(ipHash);
  const withinWindow =
    prev && nowSec - prev.windowStart <= RATE_LIMIT_WINDOW_SECONDS;
  const nextCount = withinWindow ? prev.failedCount + 1 : 1;
  const windowStart = withinWindow ? prev.windowStart : nowSec;
  const lockedUntil =
    nextCount >= RATE_LIMIT_MAX_ATTEMPTS
      ? nowSec + RATE_LIMIT_LOCKOUT_SECONDS
      : 0;

  memoryRateLimits.set(ipHash, {
    failedCount: nextCount,
    windowStart,
    lockedUntil,
  });

  return {
    locked: lockedUntil > nowSec,
    retryAfterSeconds: lockedUntil > nowSec ? RATE_LIMIT_LOCKOUT_SECONDS : 0,
    remainingAttempts: Math.max(0, RATE_LIMIT_MAX_ATTEMPTS - nextCount),
  };
}

export async function clearAuthFailures(
  ipHash: string,
  env: BroadcastEnv
): Promise<void> {
  memoryRateLimits.delete(ipHash);
  if (env.NOVA_DB) {
    try {
      await ensureBroadcastSchema(env.NOVA_DB);
      await env.NOVA_DB.prepare(
        "DELETE FROM broadcast_auth_attempts WHERE ip_hash = ?"
      )
        .bind(ipHash)
        .run();
    } catch {
      // Ignore transient D1 cleanup errors
    }
  }
}

export function getServerConfigStatus(
  env: BroadcastEnv,
  d1Verification?: { ok: boolean; error: string | null }
) {
  const adminCodeConfigured = Boolean(getAdminCode(env));
  const sessionSecretConfigured = Boolean(getSessionSecret(env));
  const d1Bound = Boolean(env?.NOVA_DB && typeof env.NOVA_DB.prepare === "function");
  const d1Configured = d1Verification ? d1Verification.ok : d1Bound;
  const d1Error = d1Verification
    ? d1Verification.error
    : d1Bound
    ? null
    : "NOVA_DB (Cloudflare D1 binding) is missing from Cloudflare Pages Functions env.";

  const fcmResolution = inspectFirebaseConfig(env);

  const missing: string[] = [];
  if (!adminCodeConfigured) missing.push("NOVA_BROADCAST_ADMIN_CODE");
  if (!sessionSecretConfigured) missing.push("NOVA_BROADCAST_SESSION_SECRET");
  if (!d1Configured) {
    missing.push(d1Error || "NOVA_DB (Cloudflare D1 binding)");
  }
  if (!fcmResolution.configured) {
    missing.push(
      fcmResolution.error ||
        "FIREBASE_SERVICE_ACCOUNT_JSON (preferred single secret)"
    );
  }

  return {
    adminCodeConfigured,
    sessionSecretConfigured,
    d1Configured,
    d1Error,
    fcmConfigured: fcmResolution.configured,
    fcmSource: fcmResolution.source,
    fcmError: fcmResolution.error,
    missing,
  };
}

export async function checkServerConfigStatus(env: BroadcastEnv) {
  if (!env?.NOVA_DB || typeof env.NOVA_DB.prepare !== "function") {
    return getServerConfigStatus(env, {
      ok: false,
      error:
        "NOVA_DB (Cloudflare D1 binding) is not attached to this deployment. Bind NOVA_DB under Settings -> Bindings -> Production and retry deployment.",
    });
  }

  try {
    await env.NOVA_DB.prepare("SELECT 1 AS ok").first<{ ok: number }>();
    await ensureBroadcastSchema(env.NOVA_DB);
    return getServerConfigStatus(env, { ok: true, error: null });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Unknown D1 error";
    return getServerConfigStatus(env, {
      ok: false,
      error: `NOVA_DB binding detected, but D1 query failed: ${detail.slice(0, 120)}`,
    });
  }
}
