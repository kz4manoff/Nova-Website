-- Cloudflare D1 Schema for NOVA BROADCAST (FCM Device Registry, Broadcast History, Admin Auth Rate Limiting)

CREATE TABLE IF NOT EXISTS fcm_devices (
  token TEXT PRIMARY KEY,
  device_id TEXT,
  app_version TEXT,
  android_sdk INTEGER,
  is_admin_test INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fcm_devices_status
  ON fcm_devices (status, is_admin_test);

CREATE UNIQUE INDEX IF NOT EXISTS idx_fcm_devices_device_id
  ON fcm_devices (device_id)
  WHERE device_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS broadcast_history (
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
);

CREATE INDEX IF NOT EXISTS idx_broadcast_history_created
  ON broadcast_history (created_at DESC);

CREATE TABLE IF NOT EXISTS broadcast_auth_attempts (
  ip_hash TEXT PRIMARY KEY,
  failed_count INTEGER NOT NULL DEFAULT 0,
  window_start INTEGER NOT NULL,
  locked_until INTEGER NOT NULL DEFAULT 0
);
