import React, { useState } from "react";
import {
  Download,
  ShieldCheck,
  Copy,
  Check,
  Clock,
  Smartphone,
  FileCode2,
  ArrowRight,
} from "lucide-react";
import { siteConfig } from "../config/siteConfig";
import { ScrollReveal } from "../components/ScrollReveal";
import type { AppRoute } from "../types/navigation";

interface DownloadPageProps {
  onNavigate: (route: AppRoute) => void;
}

const installSteps = [
  {
    step: "01",
    title: "Download the official APK",
    description:
      "Once published, download the NOVA MUSIC APK exclusively from this official release page.",
  },
  {
    step: "02",
    title: "Verify the SHA-256 checksum",
    description:
      "Compare the downloaded file's SHA-256 hash against the official checksum listed below to confirm file integrity.",
  },
  {
    step: "03",
    title: "Allow installation from your browser",
    description:
      "When prompted by Android, open Settings and enable 'Install unknown apps' for the browser or file manager you used.",
  },
  {
    step: "04",
    title: "Install and grant local audio access",
    description:
      "Open the APK to install NOVA MUSIC, then allow storage/audio media permission so the player can index your local music.",
  },
];

export const DownloadPage: React.FC<DownloadPageProps> = ({ onNavigate }) => {
  const { release } = siteConfig;
  const isApkAvailable = Boolean(release.apkUrl);
  const [copiedHash, setCopiedHash] = useState(false);

  const handleCopySha256 = async () => {
    if (!release.sha256) return;
    try {
      await navigator.clipboard.writeText(release.sha256);
      setCopiedHash(true);
      window.setTimeout(() => setCopiedHash(false), 2000);
    } catch {
      // Clipboard blocked in restricted browser contexts
    }
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
            Direct APK distribution with transparent version metadata and
            SHA-256 integrity verification.
          </p>
        </div>
      </ScrollReveal>

      {/* Main Release Card */}
      <ScrollReveal>
        <section className="liquid-glass rounded-3xl p-8 md:p-10 mb-12 space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-white/[0.08]">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 text-xs text-zinc-400">
                <Smartphone className="w-4 h-4 text-sky-300" />
                <span>Android Package (.apk)</span>
                <span aria-hidden="true">·</span>
                <span>{isApkAvailable ? "Ready for Download" : "Coming Soon"}</span>
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-semibold text-white">
                {release.version
                  ? `NOVA MUSIC v${release.version}`
                  : "Public APK Release — Coming Soon"}
              </h2>
              <p className="text-sm text-zinc-400 max-w-xl">
                {isApkAvailable
                  ? "Official signed Android build ready for direct installation."
                  : "The first public Android APK build is currently being prepared. No unverified or placeholder files are hosted here."}
              </p>
            </div>

            <div className="shrink-0">
              {isApkAvailable && release.apkUrl ? (
                <a
                  href={release.apkUrl}
                  download
                  className="liquid-button-primary inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-2xl text-sm font-semibold whitespace-nowrap shrink-0 transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                >
                  <Download className="w-4 h-4" />
                  <span>Download APK</span>
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  className="inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-2xl bg-white/[0.08] border border-white/15 text-sm font-medium text-zinc-300 cursor-not-allowed whitespace-nowrap shrink-0"
                >
                  <Clock className="w-4 h-4 text-sky-300" />
                  <span>Coming Soon</span>
                </button>
              )}
            </div>
          </div>

          {/* Release Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-1">
              <p className="text-xs text-zinc-500">Latest Version</p>
              <p className="font-mono text-sm font-medium text-white tabular-nums">
                {release.version ? `v${release.version}` : "Coming Soon"}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-zinc-500">APK File Size</p>
              <p className="font-mono text-sm font-medium text-white tabular-nums">
                {release.fileSize ?? "Pending build"}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-zinc-500">Release Date</p>
              <p className="font-mono text-sm font-medium text-white tabular-nums">
                {release.releaseDate ?? "To be announced"}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-zinc-500">Minimum Android</p>
              <p className="font-mono text-sm font-medium text-white tabular-nums">
                {release.minAndroidVersion ?? "Pending final target"}
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
                {release.sha256 ??
                  "Will be published alongside the official APK build."}
              </p>
            </div>

            {release.sha256 && (
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

            {release.changelog.length > 0 ? (
              <div className="space-y-6">
                {release.changelog.map((entry) => (
                  <div
                    key={entry.version}
                    className="space-y-2.5 pb-5 border-b border-white/[0.06] last:border-none last:pb-0"
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
            ) : (
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 space-y-2">
                <p className="text-sm font-medium text-zinc-200">
                  Release notes pending
                </p>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Detailed release notes will appear here as soon as the first
                  public APK version is published in{" "}
                  <code className="font-mono text-zinc-300">
                    src/config/siteConfig.ts
                  </code>
                  .
                </p>
              </div>
            )}
          </section>
        </ScrollReveal>

        {/* Installation Instructions */}
        <ScrollReveal delay={0.05} className="lg:col-span-7">
          <section className="liquid-glass-subtle rounded-3xl p-7 h-full space-y-6">
            <div className="space-y-1">
              <h2 className="font-display text-xl font-semibold text-white">
                How to Install the APK
              </h2>
              <p className="text-xs text-zinc-400">
                Standard Android sideloading instructions for direct APK
                releases.
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
                Need help installing or updating on your Android device?
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
