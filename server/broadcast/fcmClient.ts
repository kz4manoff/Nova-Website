/**
 * Server-only Firebase Cloud Messaging (FCM HTTP v1 API) client using
 * Web Crypto RSASSA-PKCS1-v1_5 JWT signing (zero Node-only dependencies,
 * 100% compatible with Cloudflare Pages Functions / Workers runtime).
 *
 * Never import into frontend code. Service account credentials stay strictly on the server.
 */

import { resolveEnvVar, type BroadcastEnv } from "./cryptoAuth";

export interface ServiceAccountCreds {
  projectId: string;
  clientEmail: string;
  privateKeyPem: string;
}

export type FcmConfigSource =
  | "firebase_service_account_json"
  | "legacy_env_vars"
  | "none";

export interface FirebaseConfigResolution {
  configured: boolean;
  source: FcmConfigSource;
  credentials: ServiceAccountCreds | null;
  error: string | null;
}

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";

let cachedAccessToken: {
  token: string;
  expiresAtMs: number;
  cacheKey: string;
} | null = null;

let cachedFirebaseContext: {
  cacheKey: string;
  creds: ServiceAccountCreds;
  privateKey: CryptoKey;
} | null = null;

/**
 * Escapes literal newline/carriage-return characters inside JSON string literals
 * when a multi-line Firebase Service Account JSON is pasted into an env input
 * that preserves raw newlines inside "private_key".
 */
function escapeRawNewlinesInJsonStrings(input: string): string {
  let out = "";
  let inString = false;
  let escaped = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (escaped) {
      out += ch;
      escaped = false;
      continue;
    }
    if (ch === "\\" && inString) {
      out += ch;
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      out += ch;
      continue;
    }
    if (inString && (ch === "\n" || ch === "\r")) {
      if (ch === "\r" && input[i + 1] === "\n") i++;
      out += "\\n";
      continue;
    }
    out += ch;
  }
  return out;
}

function parseServiceAccountJsonString(rawInput: string): unknown {
  let candidate = rawInput.trim();
  if (
    (candidate.startsWith("'") && candidate.endsWith("'")) ||
    (candidate.startsWith('"') && candidate.endsWith('"') && !candidate.startsWith('"{'))
  ) {
    if (candidate.startsWith("'") && candidate.endsWith("'")) {
      candidate = candidate.slice(1, -1).trim();
    }
  }

  try {
    const parsed = JSON.parse(candidate);
    if (typeof parsed === "string") {
      return JSON.parse(escapeRawNewlinesInJsonStrings(parsed.trim()));
    }
    return parsed;
  } catch {
    return JSON.parse(escapeRawNewlinesInJsonStrings(candidate));
  }
}

function normalizePrivateKeyPem(rawKey: string): string {
  return rawKey
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .trim();
}

function validateServiceAccountFields(
  fields: {
    projectId?: string;
    clientEmail?: string;
    privateKey?: string;
  },
  label: string
): { valid: true; credentials: ServiceAccountCreds } | { valid: false; error: string } {
  const missing: string[] = [];
  const projectId =
    typeof fields.projectId === "string" ? fields.projectId.trim() : "";
  const clientEmail =
    typeof fields.clientEmail === "string" ? fields.clientEmail.trim() : "";
  const rawPrivateKey =
    typeof fields.privateKey === "string" ? fields.privateKey.trim() : "";

  if (!projectId) missing.push("project_id");
  if (!clientEmail) missing.push("client_email");
  if (!rawPrivateKey) missing.push("private_key");

  if (missing.length > 0) {
    return {
      valid: false,
      error: `${label} is incomplete. Missing required field(s): ${missing.join(
        ", "
      )}.`,
    };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
    return {
      valid: false,
      error: `${label} has an invalid client_email format.`,
    };
  }

  const privateKeyPem = normalizePrivateKeyPem(rawPrivateKey);
  if (privateKeyPem.includes("-----BEGIN RSA PRIVATE KEY-----")) {
    return {
      valid: false,
      error: `${label} private_key uses legacy PKCS#1 format; expected PKCS#8 PEM (-----BEGIN PRIVATE KEY-----). Re-download a Firebase service account JSON key.`,
    };
  }

  if (
    !privateKeyPem.includes("-----BEGIN PRIVATE KEY-----") ||
    !privateKeyPem.includes("-----END PRIVATE KEY-----")
  ) {
    return {
      valid: false,
      error: `${label} private_key must be a valid PKCS#8 PEM private key (missing BEGIN/END PRIVATE KEY headers).`,
    };
  }

  try {
    const der = pemToArrayBuffer(privateKeyPem);
    if (der.byteLength < 128) {
      return {
        valid: false,
        error: `${label} private_key appears truncated or incomplete.`,
      };
    }
  } catch {
    return {
      valid: false,
      error: `${label} private_key contains invalid base64 PEM data.`,
    };
  }

  return {
    valid: true,
    credentials: {
      projectId,
      clientEmail,
      privateKeyPem,
    },
  };
}

export function inspectFirebaseConfig(
  env: BroadcastEnv | undefined
): FirebaseConfigResolution {
  const rawJson = resolveEnvVar(env, "FIREBASE_SERVICE_ACCOUNT_JSON");

  // Preferred method: single Cloudflare Pages secret FIREBASE_SERVICE_ACCOUNT_JSON
  if (rawJson) {
    let parsedUnknown: unknown;
    try {
      parsedUnknown = parseServiceAccountJsonString(rawJson);
    } catch {
      return {
        configured: false,
        source: "firebase_service_account_json",
        credentials: null,
        error:
          "FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON. Paste the complete Firebase service account JSON file into Cloudflare Pages Secrets.",
      };
    }

    if (
      !parsedUnknown ||
      typeof parsedUnknown !== "object" ||
      Array.isArray(parsedUnknown)
    ) {
      return {
        configured: false,
        source: "firebase_service_account_json",
        credentials: null,
        error:
          "FIREBASE_SERVICE_ACCOUNT_JSON must be a JSON object exported from Firebase Console -> Service accounts.",
      };
    }

    const parsed = parsedUnknown as Record<string, unknown>;
    if (
      parsed.type !== undefined &&
      (typeof parsed.type !== "string" ||
        parsed.type.trim() !== "service_account")
    ) {
      return {
        configured: false,
        source: "firebase_service_account_json",
        credentials: null,
        error:
          'FIREBASE_SERVICE_ACCOUNT_JSON must have "type": "service_account".',
      };
    }

    const check = validateServiceAccountFields(
      {
        projectId:
          typeof parsed.project_id === "string" ? parsed.project_id : undefined,
        clientEmail:
          typeof parsed.client_email === "string"
            ? parsed.client_email
            : undefined,
        privateKey:
          typeof parsed.private_key === "string"
            ? parsed.private_key
            : undefined,
      },
      "FIREBASE_SERVICE_ACCOUNT_JSON"
    );

    if (!check.valid) {
      return {
        configured: false,
        source: "firebase_service_account_json",
        credentials: null,
        error: check.error,
      };
    }

    return {
      configured: true,
      source: "firebase_service_account_json",
      credentials: check.credentials,
      error: null,
    };
  }

  // Optional 3-variable fallback when FIREBASE_SERVICE_ACCOUNT_JSON is not set
  const projectId = resolveEnvVar(env, "FIREBASE_PROJECT_ID");
  const clientEmail = resolveEnvVar(env, "FIREBASE_CLIENT_EMAIL");
  const privateKey = resolveEnvVar(env, "FIREBASE_PRIVATE_KEY");

  if (!projectId && !clientEmail && !privateKey) {
    return {
      configured: false,
      source: "none",
      credentials: null,
      error:
        "FIREBASE_SERVICE_ACCOUNT_JSON is not configured on the server. Add your Firebase service account JSON secret in Cloudflare Pages.",
    };
  }

  const missingLegacy: string[] = [];
  if (!projectId) missingLegacy.push("FIREBASE_PROJECT_ID");
  if (!clientEmail) missingLegacy.push("FIREBASE_CLIENT_EMAIL");
  if (!privateKey) missingLegacy.push("FIREBASE_PRIVATE_KEY");

  if (missingLegacy.length > 0) {
    return {
      configured: false,
      source: "legacy_env_vars",
      credentials: null,
      error: `FIREBASE_SERVICE_ACCOUNT_JSON is not set, and optional fallback variables are incomplete (missing: ${missingLegacy.join(
        ", "
      )}).`,
    };
  }

  const legacyCheck = validateServiceAccountFields(
    {
      projectId: projectId ?? undefined,
      clientEmail: clientEmail ?? undefined,
      privateKey: privateKey ?? undefined,
    },
    "Fallback Firebase credentials"
  );

  if (!legacyCheck.valid) {
    return {
      configured: false,
      source: "legacy_env_vars",
      credentials: null,
      error: legacyCheck.error,
    };
  }

  return {
    configured: true,
    source: "legacy_env_vars",
    credentials: legacyCheck.credentials,
    error: null,
  };
}

export function resolveFirebaseCredentials(
  env: BroadcastEnv | undefined
): ServiceAccountCreds | null {
  return inspectFirebaseConfig(env).credentials;
}

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const cleaned = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  if (!cleaned) {
    throw new Error("Empty PEM key");
  }
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function getOrInitFirebaseContext(creds: ServiceAccountCreds) {
  const cacheKey = `${creds.projectId}:${creds.clientEmail}:${creds.privateKeyPem.length}`;
  if (cachedFirebaseContext && cachedFirebaseContext.cacheKey === cacheKey) {
    return cachedFirebaseContext;
  }

  let privateKey: CryptoKey;
  try {
    privateKey = await crypto.subtle.importKey(
      "pkcs8",
      pemToArrayBuffer(creds.privateKeyPem),
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"]
    );
  } catch {
    throw new Error(
      "Failed to import Firebase service account private_key as PKCS#8 RS256 key. Verify FIREBASE_SERVICE_ACCOUNT_JSON is unmodified."
    );
  }

  cachedFirebaseContext = { cacheKey, creds, privateKey };
  return cachedFirebaseContext;
}

async function getFcmAccessToken(creds: ServiceAccountCreds): Promise<string> {
  const nowMs = Date.now();
  const cacheKey = `${creds.projectId}:${creds.clientEmail}`;
  if (
    cachedAccessToken &&
    cachedAccessToken.cacheKey === cacheKey &&
    nowMs < cachedAccessToken.expiresAtMs - 60_000
  ) {
    return cachedAccessToken.token;
  }

  const { privateKey } = await getOrInitFirebaseContext(creds);
  const nowSec = Math.floor(nowMs / 1000);
  const header = base64UrlEncodeBytes(
    new TextEncoder().encode(JSON.stringify({ alg: "RS256", typ: "JWT" }))
  );
  const claim = base64UrlEncodeBytes(
    new TextEncoder().encode(
      JSON.stringify({
        iss: creds.clientEmail,
        scope: FCM_SCOPE,
        aud: GOOGLE_TOKEN_URL,
        iat: nowSec,
        exp: nowSec + 3600,
      })
    )
  );

  const unsignedJwt = `${header}.${claim}`;
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    new TextEncoder().encode(unsignedJwt)
  );
  const assertion = `${unsignedJwt}.${base64UrlEncodeBytes(new Uint8Array(sig))}`;

  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text().catch(() => "");
    throw new Error(
      `Failed to mint Firebase OAuth2 token (HTTP ${tokenRes.status}): ${errText.slice(0, 200)}`
    );
  }

  const tokenJson = (await tokenRes.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!tokenJson.access_token) {
    throw new Error("Google OAuth2 response did not contain an access_token.");
  }

  cachedAccessToken = {
    token: tokenJson.access_token,
    expiresAtMs: nowMs + (tokenJson.expires_in ?? 3600) * 1000,
    cacheKey,
  };

  return tokenJson.access_token;
}

export interface FcmBroadcastPayload {
  broadcastId: string;
  title: string;
  message: string;
  imageUrl?: string;
  deepLink?: string;
}

export interface FcmSendOutcome {
  token: string;
  ok: boolean;
  invalidToken: boolean;
  errorMessage?: string;
}

function isInvalidTokenError(status: number, bodyText: string): boolean {
  if (status === 404) return true;
  const upper = bodyText.toUpperCase();
  return (
    upper.includes("UNREGISTERED") ||
    upper.includes("SENDER_ID_MISMATCH") ||
    (status === 400 && upper.includes("REGISTRATION TOKEN IS NOT A VALID FCM"))
  );
}

export async function sendFcmNotificationToTokens(
  env: BroadcastEnv,
  tokens: string[],
  payload: FcmBroadcastPayload
): Promise<{
  successCount: number;
  failureCount: number;
  invalidTokens: string[];
  errors: string[];
  outcomes: FcmSendOutcome[];
}> {
  const resolution = inspectFirebaseConfig(env);
  if (!resolution.configured || !resolution.credentials) {
    throw new Error(
      resolution.error ||
        "Firebase Admin service account credentials are not configured."
    );
  }
  const creds = resolution.credentials;

  const accessToken = await getFcmAccessToken(creds);
  const fcmEndpoint = `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(
    creds.projectId
  )}/messages:send`;

  const invalidTokens: string[] = [];
  const errors: string[] = [];
  const outcomes: FcmSendOutcome[] = [];
  let successCount = 0;
  let failureCount = 0;

  const BATCH_SIZE = 15;
  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    const batch = tokens.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (token): Promise<FcmSendOutcome> => {
        const androidNotification: Record<string, string> = {
          channel_id: "nova_broadcasts",
          tag: payload.broadcastId,
          sound: "default",
          click_action: "OPEN_NOVA_MUSIC",
        };
        if (payload.imageUrl) {
          androidNotification.image = payload.imageUrl;
        }

        const fcmBody = {
          message: {
            token,
            notification: {
              title: payload.title,
              body: payload.message,
              ...(payload.imageUrl ? { image: payload.imageUrl } : {}),
            },
            data: {
              broadcastId: payload.broadcastId,
              title: payload.title,
              body: payload.message,
              ...(payload.deepLink ? { deepLink: payload.deepLink } : {}),
              ...(payload.imageUrl ? { imageUrl: payload.imageUrl } : {}),
            },
            android: {
              priority: "HIGH",
              collapse_key: payload.broadcastId,
              notification: androidNotification,
            },
          },
        };

        try {
          const res = await fetch(fcmEndpoint, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(fcmBody),
          });

          if (res.ok) {
            return { token, ok: true, invalidToken: false };
          }

          const errText = await res.text().catch(() => "");
          return {
            token,
            ok: false,
            invalidToken: isInvalidTokenError(res.status, errText),
            errorMessage: `HTTP ${res.status}: ${errText.slice(0, 140)}`,
          };
        } catch (err) {
          return {
            token,
            ok: false,
            invalidToken: false,
            errorMessage:
              err instanceof Error ? err.message : "Network error calling FCM",
          };
        }
      })
    );

    for (const r of results) {
      outcomes.push(r);
      if (r.ok) {
        successCount++;
      } else {
        failureCount++;
        if (r.invalidToken) invalidTokens.push(r.token);
        if (r.errorMessage && errors.length < 5) errors.push(r.errorMessage);
      }
    }
  }

  return { successCount, failureCount, invalidTokens, errors, outcomes };
}
