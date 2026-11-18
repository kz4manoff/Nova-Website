-- Cloudflare D1 Schema for NOVA MUSIC Persistent APK Download Statistics
CREATE TABLE IF NOT EXISTS download_counters (
  id TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS download_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dedup_key TEXT NOT NULL,
  version TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_download_events_dedup
  ON download_events (dedup_key, created_at);
