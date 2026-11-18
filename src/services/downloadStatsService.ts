export interface DownloadStats {
  totalDownloads: number;
  d1Enabled: boolean;
  source: string;
  updatedAt: string;
}

interface GitHubReleaseSummary {
  draft: boolean;
  assets?: {
    name: string;
    download_count: number;
  }[];
}

const GITHUB_RELEASES_API =
  "https://api.github.com/repos/kz4manoff/Nova-Music/releases";
const CLIENT_COOLDOWN_MS = 60_000;
const recentClientDownloads = new Map<string, number>();

async function fetchGitHubFallbackStats(): Promise<DownloadStats | null> {
  try {
    const res = await fetch(GITHUB_RELEASES_API, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!res.ok) return null;
    const releases = (await res.json()) as GitHubReleaseSummary[];
    if (!Array.isArray(releases)) return null;

    let total = 0;
    for (const rel of releases) {
      if (rel.draft) continue;
      for (const asset of rel.assets ?? []) {
        if (asset.name.toLowerCase().endsWith(".apk")) {
          total += Number(asset.download_count) || 0;
        }
      }
    }

    return {
      totalDownloads: total,
      d1Enabled: false,
      source: "github-releases",
      updatedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * Fetches persistent APK download statistics from Cloudflare D1 + GitHub Releases (/api/downloads).
 * Falls back directly to GitHub Releases download statistics when /api/downloads is unavailable locally.
 */
export async function fetchDownloadStats(): Promise<DownloadStats | null> {
  try {
    const res = await fetch("/api/downloads", {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });

    const contentType = res.headers.get("content-type") ?? "";
    if (res.ok && contentType.toLowerCase().includes("application/json")) {
      const data = (await res.json()) as Partial<DownloadStats>;
      if (typeof data.totalDownloads === "number" && Number.isFinite(data.totalDownloads)) {
        return {
          totalDownloads: Math.max(0, Math.floor(data.totalDownloads)),
          d1Enabled: Boolean(data.d1Enabled),
          source: typeof data.source === "string" ? data.source : "cloudflare-d1",
          updatedAt:
            typeof data.updatedAt === "string"
              ? data.updatedAt
              : new Date().toISOString(),
        };
      }
    }
  } catch {
    // Fallback below if Pages Functions are not active (e.g. local vite dev)
  }

  return fetchGitHubFallbackStats();
}

/**
 * Records a started APK download in the persistent backend (/api/downloads),
 * with a short client-side click-burst guard + server-side IP/UA cooldown deduplication.
 */
export async function recordApkDownload(
  version: string,
  apkUrl: string
): Promise<DownloadStats | null> {
  const key = version.trim() || "latest";
  const now = Date.now();
  const lastMem = recentClientDownloads.get(key) ?? 0;

  // Guard against accidental double-clicks within 60 seconds
  if (now - lastMem < CLIENT_COOLDOWN_MS) {
    return null;
  }

  try {
    const sessionKey = `nova_dl_guard_${key}`;
    const stored = window.sessionStorage.getItem(sessionKey);
    if (stored && now - Number(stored) < CLIENT_COOLDOWN_MS) {
      return null;
    }
    window.sessionStorage.setItem(sessionKey, String(now));
  } catch {
    // sessionStorage unavailable in restricted privacy modes
  }

  recentClientDownloads.set(key, now);

  try {
    const res = await fetch("/api/downloads", {
      method: "POST",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ version: key, apkUrl }),
    });

    const contentType = res.headers.get("content-type") ?? "";
    if (res.ok && contentType.toLowerCase().includes("application/json")) {
      const data = (await res.json()) as Partial<DownloadStats> & {
        counted?: boolean;
      };
      if (
        typeof data.totalDownloads === "number" &&
        Number.isFinite(data.totalDownloads)
      ) {
        return {
          totalDownloads: Math.max(0, Math.floor(data.totalDownloads)),
          d1Enabled: Boolean(data.d1Enabled),
          source: typeof data.source === "string" ? data.source : "cloudflare-d1",
          updatedAt:
            typeof data.updatedAt === "string"
              ? data.updatedAt
              : new Date().toISOString(),
        };
      }
    }
  } catch {
    // Keep UI resilient if network drops during navigation
  }

  return null;
}
