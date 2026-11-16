import React, { useRef, useState } from "react";
import {
  Download,
  ShieldCheck,
  Copy,
  Check,
  Clock,
  Smartphone,
  FileCode2,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  X,
} from "lucide-react";
import { siteConfig } from "../config/siteConfig";
import { useLatestRelease } from "../hooks/useLatestRelease";
import {
  downloadVerifiedApk,
  formatBytes,
  type ApkDownloadProgress,
} from "../services/releaseService";
import { ScrollReveal } from "../components/ScrollReveal";
import type { AppRoute } from "../types/navigation";

interface DownloadPageProps {
  onNavigate: (route: AppRoute) => void;
}

const installSteps = [
  {
    step: "01",
    title: "Download the verified APK",
    description:
      "Tap Download APK above once a signed GitHub Release is published. The file downloads directly from official GitHub Releases.",
  },
  {
    step: "02",
    title: "Open the APK from Notifications or Files",
    description:
      "After the download finishes, tap the APK notification or locate NOVA-MUSIC.apk inside your Android Downloads folder.",
  },
  {
    step: "03",
    title: "Allow installation from this source",
    description:
      "If Android prompts for permission, tap Settings and enable 'Allow from this source' for your browser or file manager.",
  },
  {
    step: "04",
    title: "Install and grant audio access",
    description:
      "Confirm Install, open NOVA MUSIC, and allow audio media access so the player can scan your local music library.",
  },
];

export const DownloadPage: React.FC<DownloadPageProps> = ({ onNavigate }) => {
  const { release } = siteConfig;
  const {
    releaseInfo,
    isChecking,
    checkError,
    lastCheckedAt,
    checkForLatestVersion,
  } = useLatestRelease();

  const [copiedHash, setCopiedHash] = useState(false);
  const [downloadProgress, setDownloadProgress] =
    useState<ApkDownloadProgress | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const manifest = releaseInfo?.manifest ?? null;
  const isVerifiedReady = Boolean(
    releaseInfo?.isVerifiedReleaseAvailable && releaseInfo?.verifiedApkUrl
  );

  const displayVersion = manifest
    ? `v${manifest.latestVersion} (Build ${manifest.versionCode})`
    : isChecking
    ? "Checking..."
    : "Unavailable";

  const displaySize =
    releaseInfo?.fileSizeFormatted ??
    (isChecking ? "Checking..." : "Pending APK release");

  const displayDate =
    releaseInfo?.releaseDateFormatted ??
    (isChecking ? "Checking..." : "Pending release");

  const displaySha256 = releaseInfo?.verifiedSha256 ?? null;

  const handleCopySha256 = async () => {
    if (!displaySha256) return;
    try {
      await navigator.clipboard.writeText(displaySha256);
      setCopiedHash(true);
      window.setTimeout(() => setCopiedHash(false), 2000);
    } catch {
      // Clipboard blocked in restricted browser contexts
    }
  };

  const handleStartDownload = async () => {
    if (!releaseInfo?.verifiedApkUrl || !isVerifiedReady) return;

    setDownloadError(null);
    setIsDownloading(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const fileName =
      releaseInfo.apkFileName ??
      `NOVA-MUSIC-v${manifest?.latestVersion ?? "release"}.apk`;

    try {
      await downloadVerifiedApk({
        apkUrl: releaseInfo.verifiedApkUrl,
        fileName,
        expectedSha256: releaseInfo.verifiedSha256,
        expectedBytes: releaseInfo.fileSizeBytes,
        signal: controller.signal,
        onProgress: (progress) => setDownloadProgress(progress),
      });
    } catch (err) {
      setDownloadProgress(null);
      setDownloadError(
        err instanceof Error
          ? err.message
          : "Download failed. Please check your connection and try again."
      );
    } finally {
      setIsDownloading(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancelDownload = () => {
    abortControllerRef.current?.abort();
  };

  return (
    <div className="pt-28 md:pt-36 pb-12 max-w-5xl mx-auto px-6">
      {/* Header */}
      <ScrollReveal>
        <div className="max-w-3xl space-y-5 mb-12">
          <p className="text-xs font-medium text-sky-300">
            Official Android Release
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight text-white leading-[1.08]">
            Download NOVA MUSIC for Android.
          </h1>
          <p className="text-lg text-zinc-400 leading-relaxed">
            Live version status fetched from{" "}
            <code className="font-mono text-sm text-zinc-300">/update.json</code>{" "}
            and verified directly against official GitHub Releases.
          </p>
        </div>
      </ScrollReveal>

      {/* Main Release Card */}
      <ScrollReveal>
        <section className="liquid-glass rounded-3xl p-6 sm:p-8 md:p-10 mb-12 space-y-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-8 border-b border-white/[0.08]">
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-2.5 text-xs text-zinc-400">
                <Smartphone className="w-4 h-4 text-sky-300 shrink-0" />
                <span>Android Package (.apk)</span>
                <span aria-hidden="true">·</span>
                <span
                  className={
                    isVerifiedReady
                      ? "text-emerald-300"
                      : isChecking
                      ? "text-zinc-300"
                      : "text-red-300"
                  }
                >
                  {isChecking
                    ? "Verifying release..."
                    : isVerifiedReady
                    ? "Verified GitHub Release Ready"
                    : "Release APK Unavailable"}
                </span>
              </div>

              <h2 className="font-display text-2xl sm:text-3xl font-semibold text-white">
                {manifest
                  ? `NOVA MUSIC v${manifest.latestVersion}`
                  : isChecking
                  ? "Checking Latest Release..."
                  : "Unable to Load Release Manifest"}
              </h2>

              <p className="text-sm text-zinc-400 max-w-xl leading-relaxed">
                {isVerifiedReady
                  ? `Signed release asset (${releaseInfo?.apkFileName}) verified on GitHub Releases and ready for direct download.`
                  : checkError
                  ? checkError
                  : releaseInfo?.verificationReason ??
                    "Checking /update.json and GitHub Releases for an active signed APK."}
              </p>
            </div>

            {/* Action Buttons: Download APK + Separate Check for Latest Version */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              {isVerifiedReady && manifest ? (
                <button
                  type="button"
                  onClick={() => void handleStartDownload()}
                  disabled={isDownloading}
                  className="liquid-button-primary inline-flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl text-sm font-semibold whitespace-nowrap shrink-0 transition-transform hover:-translate-y-0.5 disabled:opacity-75 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                >
                  <Download className="w-4 h-4" />
                  <span>
                    {isDownloading
                      ? `Downloading v${manifest.latestVersion}...`
                      : `Download APK v${manifest.latestVersion}${
                          releaseInfo?.fileSizeFormatted
                            ? ` (${releaseInfo.fileSizeFormatted})`
                            : ""
                        }`}
                  </span>
                </button>
              ) : isChecking ? (
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  className="inline-flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl bg-white/[0.06] border border-white/15 text-sm font-medium text-zinc-400 cursor-not-allowed whitespace-nowrap shrink-0"
                >
                  <Clock className="w-4 h-4 text-sky-300" />
                  <span>Verifying APK...</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  className="inline-flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl bg-red-500/10 border border-red-400/25 text-sm font-medium text-red-200 cursor-not-allowed whitespace-nowrap shrink-0"
                >
                  <AlertCircle className="w-4 h-4 text-red-300" />
                  <span>APK Unavailable</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => void checkForLatestVersion(true)}
                disabled={isChecking}
                className="inline-flex items-center justify-center gap-2 px-5 py-4 rounded-2xl bg-white/[0.08] hover:bg-white/[0.13] border border-white/15 text-sm font-medium text-white whitespace-nowrap shrink-0 transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
              >
                <RefreshCw
                  className={`w-4 h-4 text-sky-300 ${
                    isChecking ? "animate-spin" : ""
                  }`}
                />
                <span>
                  {isChecking ? "Checking..." : "Check for Latest Version"}
                </span>
              </button>
            </div>
          </div>

          {/* Download Progress Indicator */}
          {downloadProgress && (
            <div
              role="status"
              aria-live="polite"
              className="rounded-2xl bg-white/[0.04] border border-sky-300/25 p-5 space-y-3"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-white">
                    {downloadProgress.message}
                  </p>
                  <p className="font-mono text-xs text-zinc-400 tabular-nums">
                    {downloadProgress.totalBytes && downloadProgress.bytesDownloaded > 0
                      ? `${formatBytes(downloadProgress.bytesDownloaded)} / ${formatBytes(
                          downloadProgress.totalBytes
                        )}`
                      : downloadProgress.bytesDownloaded > 0
                      ? formatBytes(downloadProgress.bytesDownloaded)
                      : downloadProgress.phase === "browser_handoff" &&
                        releaseInfo?.verifiedApkUrl
                      ? (
                        <span>
                          Downloading{" "}
                          {releaseInfo.apkFileName ?? "Nova.Music.apk"} in your
                          browser.{" "}
                          <a
                            href={releaseInfo.verifiedApkUrl}
                            download={releaseInfo.apkFileName ?? "Nova.Music.apk"}
                            rel="noopener noreferrer"
                            className="text-sky-300 underline hover:text-sky-200"
                          >
                            Click here if it did not start automatically
                          </a>
                          .
                        </span>
                      )
                      : "Preparing stream..."}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {downloadProgress.percent !== null && (
                    <span className="font-mono text-sm font-semibold text-sky-300 tabular-nums">
                      {downloadProgress.percent}%
                    </span>
                  )}
                  {isDownloading && (
                    <button
                      type="button"
                      onClick={handleCancelDownload}
                      aria-label="Cancel download"
                      className="p-2 rounded-xl bg-white/10 hover:bg-white/15 text-zinc-200 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-400 to-white transition-all duration-200"
                  style={{
                    width: `${downloadProgress.percent ?? 35}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Error Feedback Banner (Manifest Fetch, Missing APK, or Download Error) */}
          {(checkError || downloadError || (!isChecking && !isVerifiedReady)) && (
            <div
              role="alert"
              className="rounded-2xl bg-red-500/10 border border-red-400/25 p-4 flex items-start gap-3 text-xs text-red-200 leading-relaxed"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-300" />
              <div className="space-y-1">
                <p className="font-medium text-red-100">
                  {downloadError
                    ? "Download Error"
                    : checkError
                    ? "Release Check Error"
                    : "No Verified APK Release Available"}
                </p>
                <p>
                  {downloadError ??
                    checkError ??
                    releaseInfo?.verificationReason ??
                    "No valid downloadable APK was found in /update.json or GitHub Releases."}
                </p>
              </div>
            </div>
          )}

          {/* Release Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-1">
              <p className="text-xs text-zinc-500">Latest Version</p>
              <p className="font-mono text-sm font-medium text-white tabular-nums">
                {displayVersion}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-zinc-500">APK File Size</p>
              <p className="font-mono text-sm font-medium text-white tabular-nums">
                {displaySize}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-zinc-500">Release Date</p>
              <p className="font-mono text-sm font-medium text-white tabular-nums">
                {displayDate}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-zinc-500">Minimum Android</p>
              <p className="font-mono text-sm font-medium text-white tabular-nums">
                Android 8.0+ (API 26)
              </p>
            </div>
          </div>

          {/* SHA-256 Checksum Box */}
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 text-xs text-zinc-300 font-medium">
                <ShieldCheck className="w-4 h-4 text-sky-300 shrink-0" />
                <span>SHA-256 Checksum</span>
              </div>
              <p className="font-mono text-xs text-zinc-400 break-all tabular-nums">
                {displaySha256 ??
                  "Checksum will appear here once a signed release APK is published."}
              </p>
            </div>

            {displaySha256 && (
              <button
                type="button"
                onClick={handleCopySha256}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-medium text-white whitespace-nowrap shrink-0 transition-colors"
              >
                {copiedHash ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-sky-300" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Hash</span>
                  </>
                )}
              </button>
            )}
          </div>

          {lastCheckedAt && (
            <p className="text-[11px] text-zinc-500 font-mono tabular-nums">
              Last checked /update.json at{" "}
              {lastCheckedAt.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </p>
          )}
        </section>
      </ScrollReveal>

      {/* What's New & Installation Instructions Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-12">
        {/* What's New */}
        <ScrollReveal className="lg:col-span-5">
          <section className="liquid-glass-subtle rounded-3xl p-7 h-full space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold text-white">
                What&apos;s New
              </h2>
              <FileCode2 className="w-4 h-4 text-zinc-400" />
            </div>

            {manifest && (
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-medium text-white">
                    v{manifest.latestVersion}
                  </span>
                  <span className="font-mono text-zinc-400 tabular-nums">
                    Build {manifest.versionCode}
                  </span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  {manifest.releaseNotes}
                </p>
              </div>
            )}

            {release.changelog.length > 0 && (
              <div className="space-y-4 pt-2 border-t border-white/[0.06]">
                {release.changelog.map((entry) => (
                  <div
                    key={entry.version}
                    className="space-y-2 pb-4 border-b border-white/[0.06] last:border-none last:pb-0"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-medium text-white">
                        v{entry.version}
                      </span>
                      <span className="text-zinc-500">{entry.date}</span>
                    </div>
                    <ul className="space-y-1.5">
                      {entry.highlights.map((line) => (
                        <li
                          key={line}
                          className="text-xs text-zinc-400 leading-relaxed flex items-start gap-2"
                        >
                          <span
                            aria-hidden="true"
                            className="mt-1.5 w-1 h-1 rounded-full bg-sky-300 shrink-0"
                          />
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>
        </ScrollReveal>

        {/* Installation Instructions */}
        <ScrollReveal delay={0.05} className="lg:col-span-7">
          <section className="liquid-glass-subtle rounded-3xl p-7 h-full space-y-6">
            <div className="space-y-1">
              <h2 className="font-display text-xl font-semibold text-white">
                How to Install on Android
              </h2>
              <p className="text-xs text-zinc-400">
                Follow these steps to install the official signed NOVA MUSIC APK
                on your Android smartphone.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {installSteps.map((item) => (
                <div
                  key={item.step}
                  className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-4 space-y-2"
                >
                  <p className="font-mono text-xs text-sky-300">{item.step}</p>
                  <h3 className="text-sm font-medium text-white">
                    {item.title}
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.06]">
              <p className="text-xs text-zinc-400">
                Future updates can be installed directly inside the NOVA MUSIC
                app.
              </p>
              <button
                type="button"
                onClick={() => onNavigate("support")}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-300 hover:text-sky-200 transition-colors whitespace-nowrap shrink-0"
              >
                <span>Open Support &amp; FAQ</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </section>
        </ScrollReveal>
      </div>
    </div>
  );
};
