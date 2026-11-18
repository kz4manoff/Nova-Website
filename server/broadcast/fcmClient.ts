/**
 * Server-only Firebase Cloud Messaging (FCM HTTP v1 API) client using
 * Web Crypto RSASSA-PKCS1-v1_5 JWT signing (zero Node-only dependencies,
 * 100% compatible with Cloudflare Pages Functions / Workers runtime).
 *
 * Never import into frontend code. Service account credentials stay strictly on the server.
 */

import { resolveEnvVar, type BroadcastEnv } from "./cryptoAuth";

interface ServiceAccountCreds {
  projectId: string;
  clientEmail: string;
  privateKeyPem: string;
}

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";

let cachedAccessToken: { token: string; expiresAtMs: number; projectId: string } | null =
  null;

export function resolveFirebaseCredentials(
  env: BroadcastEnv
): ServiceAccountCreds | null {
  const serviceAccountJson = resolveEnvVar(env, "FIREBASE_SERVICE_ACCOUNT_JSON");
  if (serviceAccountJson) {
    try {
      const parsed = JSON.parse(serviceAccountJson) as {
        project_id?: string;
        client_email?: string;
        private_key?: string;
      };
      if (parsed.project_id && parsed.client_email && parsed.private_key) {
        return {
          projectId: parsed.project_id.trim(),
          clientEmail: parsed.client_email.trim(),
          privateKeyPem: parsed.private_key.replace(/\\n/g, "\n"),
        };
      }
    } catch {
      return null;
    }
  }

  const projectId = resolveEnvVar(env, "FIREBASE_PROJECT_ID");
  const clientEmail = resolveEnvVar(env, "FIREBASE_CLIENT_EMAIL");
  const privateKey = resolveEnvVar(env, "FIREBASE_PRIVATE_KEY");

  if (projectId && clientEmail && privateKey) {
    return {
      projectId,
      clientEmail,
      privateKeyPem: privateKey.replace(/\\n/g, "\n"),
    };
  }

  return null;
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
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function getFcmAccessToken(creds: ServiceAccountCreds): Promise<string> {
  const nowMs = Date.now();
  if (
    cachedAccessToken &&
    cachedAccessToken.projectId === creds.projectId &&
    nowMs < cachedAccessToken.expiresAtMs - 60_000
  ) {
    return cachedAccessToken.token;
  }

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
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(creds.privateKeyPem),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
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
    projectId: creds.projectId,
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
}> {
  const creds = resolveFirebaseCredentials(env);
  if (!creds) {
    throw new Error("Firebase Admin service account credentials are not configured.");
  }

  const accessToken = await getFcmAccessToken(creds);
  const fcmEndpoint = `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(
    creds.projectId
  )}/messages:send`;

  const invalidTokens: string[] = [];
  const errors: string[] = [];
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
      if (r.ok) {
        successCount++;
      } else {
        failureCount++;
        if (r.invalidToken) invalidTokens.push(r.token);
        if (r.errorMessage && errors.length < 5) errors.push(r.errorMessage);
      }
    }
  }

  return { successCount, failureCount, invalidTokens, errors };
}
