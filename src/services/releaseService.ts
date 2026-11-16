export interface UpdateManifest {
  latestVersion: string;
  versionCode: number;
  apkUrl: string;
  sha256: string;
  releaseNotes: string;
  mandatoryUpdate: boolean;
  minimumSupportedVersion: number;
}

export interface VerifiedReleaseState {
  manifest: UpdateManifest | null;
  verifiedApkUrl: string | null;
  verifiedSha256: string | null;
  apkFileName: string | null;
  fileSizeBytes: number | null;
  fileSizeFormatted: string | null;
  releaseDateFormatted: string | null;
  isVerifiedReleaseAvailable: boolean;
  verificationReason: string;
}

interface GitHubReleaseAsset {
  name: string;
  size: number;
  browser_download_url: string;
  content_type?: string;
}

interface GitHubReleaseResponse {
  tag_name: string;
  name?: string;
  draft: boolean;
  prerelease: boolean;
  published_at?: string;
  created_at?: string;
  assets?: GitHubReleaseAsset[];
}

const GITHUB_RELEASES_API =
  "https://api.github.com/repos/kz4manoff/Nova-Music/releases";
const TRUSTED_APK_PREFIX =
  "https://github.com/kz4manoff/Nova-Music/releases/download/";
const SHA256_REGEX = /^[0-9a-fA-F]{64}$/;

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "Unknown size";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIdx = 0;
  while (value >= 1024 && unitIdx < units.length - 1) {
    value /= 1024;
    unitIdx++;
  }
  return `${value.toFixed(unitIdx === 0 ? 0 : 1)} ${units[unitIdx]}`;
}

export function isValidGitHubApkUrl(url: string): boolean {
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

export function isValidSha256(hash: string): boolean {
  return SHA256_REGEX.test(hash.trim());
}

const CACHE_TTL_MS = 60_000;
let cachedReleaseState: VerifiedReleaseState | null = null;
let cachedReleaseTimestamp = 0;

/**
 * Fetches /update.json, validates its schema, and cross-verifies any APK URL
 * against published assets in kz4manoff/Nova-Music GitHub Releases.
 */
export async function fetchAndVerifyLatestRelease(
  bypassCache = false
): Promise<VerifiedReleaseState> {
  if (
    !bypassCache &&
    cachedReleaseState &&
    Date.now() - cachedReleaseTimestamp < CACHE_TTL_MS
  ) {
    return cachedReleaseState;
  }

  const manifestUrl = bypassCache
    ? `/update.json?t=${Date.now()}`
    : "/update.json";

  const manifestRes = await fetch(manifestUrl, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });

  if (!manifestRes.ok) {
    throw new Error(
      `Unable to load /update.json (HTTP ${manifestRes.status}).`
    );
  }

  const contentType = manifestRes.headers.get("content-type") ?? "";
  if (contentType.toLowerCase().includes("text/html")) {
    throw new Error(
      "Server returned HTML instead of /update.json JSON manifest."
    );
  }

  const raw = (await manifestRes.json()) as Partial<UpdateManifest>;

  if (
    typeof raw.latestVersion !== "string" ||
    !raw.latestVersion.trim() ||
    typeof raw.versionCode !== "number" ||
    !Number.isInteger(raw.versionCode) ||
    raw.versionCode <= 0 ||
    typeof raw.apkUrl !== "string"
  ) {
    throw new Error("Invalid /update.json manifest format.");
  }

  const manifest: UpdateManifest = {
    latestVersion: raw.latestVersion.trim().replace(/^[vV]/, ""),
    versionCode: raw.versionCode,
    apkUrl: raw.apkUrl.trim(),
    sha256: typeof raw.sha256 === "string" ? raw.sha256.trim() : "",
    releaseNotes:
      typeof raw.releaseNotes === "string" && raw.releaseNotes.trim()
        ? raw.releaseNotes.trim()
        : "Performance improvements and bug fixes.",
    mandatoryUpdate: Boolean(raw.mandatoryUpdate),
    minimumSupportedVersion:
      typeof raw.minimumSupportedVersion === "number" &&
      Number.isInteger(raw.minimumSupportedVersion)
        ? raw.minimumSupportedVersion
        : 1,
  };

  if (!isValidGitHubApkUrl(manifest.apkUrl)) {
    return {
      manifest,
      verifiedApkUrl: null,
      verifiedSha256: isValidSha256(manifest.sha256)
        ? manifest.sha256.toLowerCase()
        : null,
      apkFileName: null,
      fileSizeBytes: null,
      fileSizeFormatted: null,
      releaseDateFormatted: null,
      isVerifiedReleaseAvailable: false,
      verificationReason:
        "No published APK download URL is configured in /update.json yet.",
    };
  }

  // Verify the release asset actually exists on GitHub Releases and fetch exact size/date
  try {
    const ghRes = await fetch(GITHUB_RELEASES_API, {
      headers: { Accept: "application/vnd.github+json" },
    });

    if (!ghRes.ok) {
      return {
        manifest,
        verifiedApkUrl: null,
        verifiedSha256: isValidSha256(manifest.sha256)
          ? manifest.sha256.toLowerCase()
          : null,
        apkFileName: null,
        fileSizeBytes: null,
        fileSizeFormatted: null,
        releaseDateFormatted: null,
        isVerifiedReleaseAvailable: false,
        verificationReason: `Could not verify release asset via GitHub Releases API (HTTP ${ghRes.status}).`,
      };
    }

    const releases = (await ghRes.json()) as GitHubReleaseResponse[];
    const publishedReleases = Array.isArray(releases)
      ? releases.filter((r) => !r.draft)
      : [];

    let matchedRelease: GitHubReleaseResponse | undefined;
    let matchedAsset: GitHubReleaseAsset | undefined;

    for (const rel of publishedReleases) {
      const found = (rel.assets ?? []).find(
        (asset) =>
          asset.browser_download_url === manifest.apkUrl &&
          asset.name.toLowerCase().endsWith(".apk") &&
          asset.size > 0
      );
      if (found) {
        matchedRelease = rel;
        matchedAsset = found;
        break;
      }
    }

    if (!matchedRelease || !matchedAsset) {
      return {
        manifest,
        verifiedApkUrl: null,
        verifiedSha256: isValidSha256(manifest.sha256)
          ? manifest.sha256.toLowerCase()
          : null,
        apkFileName: null,
        fileSizeBytes: null,
        fileSizeFormatted: null,
        releaseDateFormatted: null,
        isVerifiedReleaseAvailable: false,
        verificationReason:
          "The APK URL in /update.json does not match an active published GitHub Release asset yet.",
      };
    }

    const rawDate = matchedRelease.published_at ?? matchedRelease.created_at;
    const formattedDate = rawDate
      ? new Date(rawDate).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : null;

    const verified: VerifiedReleaseState = {
      manifest,
      verifiedApkUrl: matchedAsset.browser_download_url,
      verifiedSha256: isValidSha256(manifest.sha256)
        ? manifest.sha256.toLowerCase()
        : null,
      apkFileName: matchedAsset.name,
      fileSizeBytes: matchedAsset.size,
      fileSizeFormatted: formatBytes(matchedAsset.size),
      releaseDateFormatted: formattedDate,
      isVerifiedReleaseAvailable: true,
      verificationReason: "Verified against official GitHub Releases.",
    };

    cachedReleaseState = verified;
    cachedReleaseTimestamp = Date.now();
    return verified;
  } catch {
    return {
      manifest,
      verifiedApkUrl: null,
      verifiedSha256: isValidSha256(manifest.sha256)
        ? manifest.sha256.toLowerCase()
        : null,
      apkFileName: null,
      fileSizeBytes: null,
      fileSizeFormatted: null,
      releaseDateFormatted: null,
      isVerifiedReleaseAvailable: false,
      verificationReason:
        "Unable to reach GitHub Releases to verify the APK download link.",
    };
  }
}

export interface ApkDownloadProgress {
  phase:
    | "connecting"
    | "downloading"
    | "verifying"
    | "complete"
    | "browser_handoff";
  bytesDownloaded: number;
  totalBytes: number | null;
  percent: number | null;
  message: string;
}

/**
 * Attempts streamed APK download with real byte-level progress and Web Crypto SHA-256 verification.
 * If GitHub's asset CDN rejects cross-origin browser fetch (CORS), hands off cleanly to native
 * browser download using the verified GitHub Release URL.
 */
export async function downloadVerifiedApk(options: {
  apkUrl: string;
  fileName: string;
  expectedSha256: string | null;
  expectedBytes: number | null;
  signal: AbortSignal;
  onProgress: (progress: ApkDownloadProgress) => void;
}): Promise<void> {
  const { apkUrl, fileName, expectedSha256, expectedBytes, signal, onProgress } =
    options;

  if (!isValidGitHubApkUrl(apkUrl)) {
    throw new Error("Blocked download: URL is not a verified GitHub Release APK.");
  }

  onProgress({
    phase: "connecting",
    bytesDownloaded: 0,
    totalBytes: expectedBytes,
    percent: 0,
    message: "Connecting to GitHub Releases...",
  });

  try {
    const response = await fetch(apkUrl, { signal, mode: "cors" });
    if (!response.ok) {
      throw new Error(`GitHub Releases returned HTTP ${response.status}.`);
    }

    const headerLength = Number(response.headers.get("content-length"));
    const totalBytes =
      Number.isFinite(headerLength) && headerLength > 0
        ? headerLength
        : expectedBytes;

    if (!response.body) {
      const blob = await response.blob();
      triggerBlobDownload(blob, fileName);
      onProgress({
        phase: "complete",
        bytesDownloaded: blob.size,
        totalBytes: blob.size,
        percent: 100,
        message: "Download complete.",
      });
      return;
    }

    const reader = response.body.getReader();
    const chunks: BlobPart[] = [];
    let received = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        received += value.byteLength;
        const percent =
          totalBytes && totalBytes > 0
            ? Math.min(99, Math.round((received / totalBytes) * 100))
            : null;
        onProgress({
          phase: "downloading",
          bytesDownloaded: received,
          totalBytes,
          percent,
          message: `Downloading ${fileName}...`,
        });
      }
    }

    const blob = new Blob(chunks, {
      type: "application/vnd.android.package-archive",
    });

    if (expectedSha256 && window.crypto?.subtle) {
      onProgress({
        phase: "verifying",
        bytesDownloaded: received,
        totalBytes: received,
        percent: 99,
        message: "Verifying SHA-256 checksum...",
      });
      const arrayBuf = await blob.arrayBuffer();
      const digest = await window.crypto.subtle.digest("SHA-256", arrayBuf);
      const actualHex = Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      if (actualHex.toLowerCase() !== expectedSha256.toLowerCase()) {
        throw new Error(
          "SHA-256 integrity mismatch detected. Download discarded."
        );
      }
    }

    triggerBlobDownload(blob, fileName);
    onProgress({
      phase: "complete",
      bytesDownloaded: received,
      totalBytes: received,
      percent: 100,
      message: expectedSha256
        ? "APK verified (SHA-256 matched) and saved."
        : "Download complete.",
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("Download canceled.");
    }

    // Cross-origin fetch to GitHub Releases CDN redirects can trigger a TypeError due to CORS;
    // hand off cleanly to native browser download using the verified GitHub Release URL.
    if (err instanceof TypeError) {
      const link = document.createElement("a");
      link.href = apkUrl;
      link.download = fileName;
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      onProgress({
        phase: "browser_handoff",
        bytesDownloaded: 0,
        totalBytes: expectedBytes,
        percent: 100,
        message:
          "Download started directly from GitHub Releases in your browser.",
      });
      return;
    }

    throw err;
  }
}

function triggerBlobDownload(blob: Blob, fileName: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
}
