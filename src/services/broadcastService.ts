export interface BroadcastConfigStatus {
  adminCodeConfigured: boolean;
  sessionSecretConfigured: boolean;
  d1Configured: boolean;
  fcmConfigured: boolean;
  missing: string[];
}

export interface BroadcastSessionState {
  authenticated: boolean;
  expiresAt: number | null;
  config: BroadcastConfigStatus;
}

export interface BroadcastStats {
  totalDevices: number;
  activeDevices: number;
  adminTestDevices: number;
  totalBroadcasts: number;
  totalDelivered: number;
  totalFailed: number;
  invalidTokensRemoved: number;
}

export interface MaskedDeviceSummary {
  maskedToken: string;
  deviceId: string | null;
  appVersion: string;
  androidSdk: number | null;
  isAdminTest: boolean;
  status: string;
  lastSeenAt: string;
}

export interface BroadcastHistoryItem {
  id: string;
  title: string;
  message: string;
  imageUrl: string | null;
  deepLink: string | null;
  mode: "test" | "all";
  status: "sent" | "partial" | "failed";
  targetedCount: number;
  successCount: number;
  failureCount: number;
  invalidTokensRemoved: number;
  errorSummary: string | null;
  createdAt: string;
}

export interface BroadcastOverviewResponse {
  config: BroadcastConfigStatus;
  stats: BroadcastStats;
  devices: MaskedDeviceSummary[];
  history: BroadcastHistoryItem[];
}

export interface SendBroadcastRequest {
  title: string;
  message: string;
  imageUrl?: string;
  deepLink?: string;
  mode: "test" | "all";
  testToken?: string;
  idempotencyKey: string;
}

export interface SendBroadcastResponse {
  deduplicated: boolean;
  broadcast: BroadcastHistoryItem;
}

async function parseJsonApi<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error(
      "NOVA BROADCAST backend API (/api/broadcast/*) is not active in static local preview. Deploy via Cloudflare Pages or run with Wrangler Pages dev."
    );
  }

  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || `Server returned HTTP ${response.status}.`);
  }
  return data;
}

export async function fetchBroadcastSession(): Promise<BroadcastSessionState> {
  const res = await fetch("/api/broadcast/session", {
    credentials: "same-origin",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  return parseJsonApi<BroadcastSessionState>(res);
}

export async function authenticateBroadcastAdmin(
  secretCode: string
): Promise<{ authenticated: boolean; expiresAt: number }> {
  const res = await fetch("/api/broadcast/auth", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ secretCode }),
  });
  return parseJsonApi<{ authenticated: boolean; expiresAt: number }>(res);
}

export async function logoutBroadcastAdmin(): Promise<void> {
  await fetch("/api/broadcast/logout", {
    method: "POST",
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
}

export async function fetchBroadcastOverview(): Promise<BroadcastOverviewResponse> {
  const res = await fetch("/api/broadcast/overview", {
    credentials: "same-origin",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  return parseJsonApi<BroadcastOverviewResponse>(res);
}

export async function saveAdminTestDeviceToken(
  token: string,
  labelVersion?: string
): Promise<{ saved: boolean; maskedToken: string }> {
  const res = await fetch("/api/broadcast/test-device", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ token, labelVersion }),
  });
  return parseJsonApi<{ saved: boolean; maskedToken: string }>(res);
}

export async function sendBroadcastNotification(
  payload: SendBroadcastRequest
): Promise<SendBroadcastResponse> {
  const res = await fetch("/api/broadcast/send", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });
  return parseJsonApi<SendBroadcastResponse>(res);
}
