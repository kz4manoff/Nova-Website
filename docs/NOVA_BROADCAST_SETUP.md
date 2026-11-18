# NOVA BROADCAST & Firebase Cloud Messaging (FCM) Setup Guide

## 1. Cloudflare D1 Database & Migrations
1. Create a D1 database in the Cloudflare Dashboard (or via Wrangler):
   ```bash
   npx wrangler d1 create nova-music-stats
   ```
2. Apply both SQL migrations:
   - `migrations/0001_download_stats.sql` (APK download counter)
   - `migrations/0002_broadcast_fcm.sql` (FCM device registry, broadcast logs, auth rate limits)
   ```bash
   npx wrangler d1 execute nova-music-stats --remote --file=migrations/0001_download_stats.sql
   npx wrangler d1 execute nova-music-stats --remote --file=migrations/0002_broadcast_fcm.sql
   ```
   *(The Cloudflare Pages Functions also run `CREATE TABLE IF NOT EXISTS` automatically on first request.)*
3. In **Cloudflare Dashboard -> Workers & Pages -> Nova-Website -> Settings -> Bindings**:
   - Add a **D1 database binding** named **`NOVA_DB`** pointing to `nova-music-stats` for **Production** and **Preview**.

---

## 2. Cloudflare Pages Environment Variables (Secrets)
Configure these under **Settings -> Environment Variables** (encrypt as **Secret**):

| Variable | Required | Purpose |
| --- | --- | --- |
| `NOVA_BROADCAST_ADMIN_CODE` | Yes | Personal admin secret code required to sign into `/nova-control` |
| `NOVA_BROADCAST_SESSION_SECRET` | Yes | Dedicated HMAC-SHA256 key for signing & verifying `HttpOnly` admin session cookies (never shares or falls back to any default) |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Yes (or 3 fields below) | Single-line Firebase Service Account JSON for FCM HTTP v1 |
| `FIREBASE_PROJECT_ID` | Alternative to JSON | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | Alternative to JSON | Firebase service account `client_email` |
| `FIREBASE_PRIVATE_KEY` | Alternative to JSON | Firebase service account `private_key` (PEM) |
| `NOVA_ANDROID_REG_KEY` | Optional | Shared header `X-Nova-App-Key` checked on `/api/broadcast/devices/register` |

### How to get the Firebase Service Account
1. Open **Firebase Console -> Project Settings -> Service accounts**.
2. Click **Generate new private key** (JSON file).
3. **Never** commit this JSON file to Git or embed it inside the website frontend or Android APK.
4. Paste its contents as a single-line secret in `FIREBASE_SERVICE_ACCOUNT_JSON` (or split `project_id`, `client_email`, `private_key`).

---

## 3. Android App Integration (`kz4manoff/Nova-Music`)
Add these pieces in your Android repository (`com.novamusic.player`):

1. **Firebase SDK & `google-services.json`**:
   - Download `google-services.json` from Firebase Console (package `com.novamusic.player`) and place it in `app/google-services.json`.
   - Add `com.google.gms.google-services` plugin and `com.google.firebase:firebase-messaging-ktx`.
2. **Android 13+ Permission (`AndroidManifest.xml` + `MainActivity`)**:
   - Declare `<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />`.
   - Request `Manifest.permission.POST_NOTIFICATIONS` at runtime on `Build.VERSION_CODES.TIRAMISU` (API 33+) and above.
3. **Notification Channel (`nova_broadcasts`)**:
   - Create `NotificationChannel("nova_broadcasts", "NOVA MUSIC Updates", NotificationManager.IMPORTANCE_HIGH)` at app startup so background system notifications matching `channel_id: "nova_broadcasts"` appear in the notification shade.
4. **Register & Refresh FCM Token (`POST https://nova-website-1tg.pages.dev/api/broadcast/devices/register`)**:
   - Call on app launch (`FirebaseMessaging.getInstance().token`) and inside `FirebaseMessagingService.onNewToken(token)`:
     ```json
     {
       "token": "<fcm_token>",
       "deviceId": "<stable_app_instance_uuid>",
       "platform": "android",
       "appVersion": "1.1.5",
       "androidSdk": 34
     }
     ```
5. **Handle Taps, Images & Duplicate Prevention (`FirebaseMessagingService.onMessageReceived`)**:
   - When the app is in background/closed, FCM automatically renders the system notification (`notification.title`, `notification.body`, `android.notification.image`, `channel_id: "nova_broadcasts"`).
   - Configure the launch `Intent` / `OPEN_NOVA_MUSIC` intent filter in `MainActivity` to read `deepLink` (`intent.getStringExtra("deepLink")`) when tapped.
   - When foregrounded (`onMessageReceived`), deduplicate by `data["broadcastId"]` (and use `broadcastId.hashCode()` as the Android `NotificationManager.notify(id, ...)` ID) so duplicate deliveries never stack.
