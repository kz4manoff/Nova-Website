/**
 * Cloudflare Pages Function — Persistent APK Download Statistics (/api/downloads)
 *
 * Combines Cloudflare D1 persistent storage (binding: NOVA_DB) with live
 * GitHub Releases APK download counts so statistics persist across refreshes,
 * visitors, devices, and redeployments without exposing any private tokens.
 */

interface D1PreparedStatementLike {
  bind(...values: unknown[]): D1PreparedStatementLike;
  first<T = Record<string, unknown>>(colName?: string): Promise<T | null>;
  run<T = unknown>(): Promise<{ success: boolean; meta?: Record<string, unknown>; results?: T[] }>;
}

interface D1DatabaseLike {
  prepare(query: string): D1PreparedStatementLike;
}

interface DownloadsEnv {
  NOVA_DB?: D1DatabaseLike;
}

interface GitHubAsset {
  name: string;
  download_count: number;
  browser_download_url: string;
}

interface GitHubRelease {
  tag_name: string;
  draft: boolean;
  assets?: GitHubAsset[];
}

const GITHUB_RELEASES_API =
  "https://api.github.com/repos/kz4manoff/Nova-Music/releases";
const TRUSTED_APK_PREFIX =
  "https://github.com/kz4manoff/Nova-Music/releases/download/";
const DEDUP_WINDOW_SECONDS = 120;
const RETENTION_SECONDS = 7 * 24 * 60 * 60;

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

function isValidApkUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed.startsWith(TRUSTED_APK_PREFIX)) return false;
  if (!trimmed.toLowerCase().endsWith(".apk")) return false;
  try {
    const parsed = new URL(trimmed);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname.toLowerCase() === "github.com" &&
      !parsed.pathname.includes("..")
    );
  } catch {
    return false;
  }
}

async function fetchGitHubApkDownloadTotal(): Promise<number | null> {
  try {
    const res = await fetch(GITHUB_RELEASES_API, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "nova-music-website",
      },
    });
    if (!res.ok) return null;
    const releases = (await res.json()) as GitHubRelease[];
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
    return total;
  } catch {
    return null;
  }
}

async function ensureSchema(db: D1DatabaseLike): Promise<void> {
  await db
    .prepare(
      "CREATE TABLE IF NOT EXISTS download_counters (id TEXT PRIMARY KEY, count INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL)"
    )
    .run();
  await db
    .prepare(
      "CREATE TABLE IF NOT EXISTS download_events (id INTEGER PRIMARY KEY AUTOINCREMENT, dedup_key TEXT NOT NULL, version TEXT NOT NULL, created_at INTEGER NOT NULL)"
    )
    .run();
  await db
    .prepare(
      "CREATE INDEX IF NOT EXISTS idx_download_events_dedup ON download_events (dedup_key, created_at)"
    )
    .run();
}

async function readCounter(db: D1DatabaseLike, id: string): Promise<number> {
  const row = await db
    .prepare("SELECT count FROM download_counters WHERE id = ?")
    .bind(id)
    .first<{ count: number }>();
  return typeof row?.count === "number" ? row.count : 0;
}

async function upsertCounterFloor(
  db: D1DatabaseLike,
  id: string,
  floorValue: number,
  nowIso: string
): Promise<number> {
  await db
    .prepare(
      `INSERT INTO download_counters (id, count, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         count = CASE WHEN download_counters.count < excluded.count THEN excluded.count ELSE download_counters.count END,
         updated_at = excluded.updated_at`
    )
    .bind(id, floorValue, nowIso)
    .run();
  return readCounter(db, id);
}

async function incrementCounter(
  db: D1DatabaseLike,
  id: string,
  nowIso: string
): Promise<number> {
  await db
    .prepare(
      `INSERT INTO download_counters (id, count, updated_at)
       VALUES (?, 1, ?)
       ON CONFLICT(id) DO UPDATE SET
         count = download_counters.count + 1,
         updated_at = excluded.updated_at`
    )
    .bind(id, nowIso)
    .run();
  return readCounter(db, id);
}

async function computeDedupKey(
  request: Request,
  version: string
): Promise<string> {
  const ip =
    request.headers.get("CF-Connecting-IP") ??
    request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ??
    "anonymous";
  const ua = request.headers.get("User-Agent") ?? "unknown";
  const raw = `${ip}|${ua}|${version}`;
  const encoded = new TextEncoder().encode(raw);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const onRequestGet = async ({
  env,
}: {
  request: Request;
  env: DownloadsEnv;
}): Promise<Response> => {
  const nowIso = new Date().toISOString();
  const githubTotal = await fetchGitHubApkDownloadTotal();

  if (env.NOVA_DB) {
    try {
      await ensureSchema(env.NOVA_DB);
      let d1Total = await readCounter(env.NOVA_DB, "total");

      if (githubTotal !== null && githubTotal > d1Total) {
        d1Total = await upsertCounterFloor(env.NOVA_DB, "total", githubTotal, nowIso);
      }

      return new Response(
        JSON.stringify({
          totalDownloads: Math.max(d1Total, githubTotal ?? 0),
          d1Downloads: d1Total,
          githubDownloads: githubTotal,
          d1Enabled: true,
          source: githubTotal !== null ? "cloudflare-d1+github" : "cloudflare-d1",
          updatedAt: nowIso,
        }),
        { status: 200, headers: JSON_HEADERS }
      );
    } catch {
      // Fall through to GitHub-only statistics if D1 has a transient error
    }
  }

  return new Response(
    JSON.stringify({
      totalDownloads: githubTotal ?? 0,
      d1Downloads: null,
      githubDownloads: githubTotal,
      d1Enabled: false,
      source: "github-releases",
      updatedAt: nowIso,
    }),
    { status: 200, headers: JSON_HEADERS }
  );
};

export const onRequestPost = async ({
  request,
  env,
}: {
  request: Request;
  env: DownloadsEnv;
}): Promise<Response> => {
  let body: { version?: string; apkUrl?: string } = {};
  try {
    body = (await request.json()) as { version?: string; apkUrl?: string };
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON payload." }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  const version =
    typeof body.version === "string" && body.version.trim()
      ? body.version.trim().slice(0, 32)
      : "unknown";
  const apkUrl = typeof body.apkUrl === "string" ? body.apkUrl.trim() : "";

  if (!isValidApkUrl(apkUrl)) {
    return new Response(
      JSON.stringify({ error: "Invalid or unverified APK download URL." }),
      { status: 400, headers: JSON_HEADERS }
    );
  }

  const nowIso = new Date().toISOString();
  const nowSec = Math.floor(Date.now() / 1000);
  const githubTotal = await fetchGitHubApkDownloadTotal();

  if (!env.NOVA_DB) {
    return new Response(
      JSON.stringify({
        totalDownloads: githubTotal ?? 0,
        counted: false,
        deduplicated: false,
        d1Enabled: false,
        source: "github-releases",
        updatedAt: nowIso,
      }),
      { status: 200, headers: JSON_HEADERS }
    );
  }

  try {
    await ensureSchema(env.NOVA_DB);

    let currentTotal = await readCounter(env.NOVA_DB, "total");
    if (githubTotal !== null && githubTotal > currentTotal) {
      currentTotal = await upsertCounterFloor(
        env.NOVA_DB,
        "total",
        githubTotal,
        nowIso
      );
    }

    const dedupKey = await computeDedupKey(request, version);
    const cutoff = nowSec - DEDUP_WINDOW_SECONDS;

    const recent = await env.NOVA_DB.prepare(
      "SELECT id FROM download_events WHERE dedup_key = ? AND created_at >= ? LIMIT 1"
    )
      .bind(dedupKey, cutoff)
      .first<{ id: number }>();

    if (recent) {
      return new Response(
        JSON.stringify({
          totalDownloads: Math.max(currentTotal, githubTotal ?? 0),
          counted: false,
          deduplicated: true,
          d1Enabled: true,
          source: "cloudflare-d1+github",
          updatedAt: nowIso,
        }),
        { status: 200, headers: JSON_HEADERS }
      );
    }

    await env.NOVA_DB.prepare(
      "INSERT INTO download_events (dedup_key, version, created_at) VALUES (?, ?, ?)"
    )
      .bind(dedupKey, version, nowSec)
      .run();

    // Prune expired deduplication rows
    await env.NOVA_DB.prepare(
      "DELETE FROM download_events WHERE created_at < ?"
    )
      .bind(nowSec - RETENTION_SECONDS)
      .run();

    const updatedTotal = await incrementCounter(env.NOVA_DB, "total", nowIso);
    await incrementCounter(env.NOVA_DB, `version:${version}`, nowIso);

    return new Response(
      JSON.stringify({
        totalDownloads: Math.max(updatedTotal, githubTotal ?? 0),
        counted: true,
        deduplicated: false,
        d1Enabled: true,
        source: "cloudflare-d1+github",
        updatedAt: nowIso,
      }),
      { status: 200, headers: JSON_HEADERS }
    );
  } catch {
    return new Response(
      JSON.stringify({
        totalDownloads: githubTotal ?? 0,
        counted: false,
        deduplicated: false,
        d1Enabled: false,
        source: "github-releases",
        updatedAt: nowIso,
      }),
      { status: 200, headers: JSON_HEADERS }
    );
  }
};
