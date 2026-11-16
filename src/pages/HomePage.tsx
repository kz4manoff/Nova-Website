import React, { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  Download,
  Sparkles,
  Disc3,
  FolderKanban,
  SlidersHorizontal,
  Palette,
  Layers,
  HardDrive,
  Headphones,
  Hand,
} from "lucide-react";
import { siteConfig, officialLogoSrc } from "../config/siteConfig";
import { mediaAssets } from "../assets/media";
import { useLatestRelease } from "../hooks/useLatestRelease";
import { AndroidPlayerMockup } from "../components/AndroidPlayerMockup";
import { NovaLogo } from "../components/NovaLogo";
import { ScrollReveal } from "../components/ScrollReveal";
import type { AppRoute } from "../types/navigation";

interface HomePageProps {
  onNavigate: (route: AppRoute) => void;
}

const themeSwatches = [
  { id: "obsidian", label: "Obsidian", bg: "bg-zinc-950", ring: "ring-zinc-400" },
  { id: "midnight", label: "Midnight", bg: "bg-slate-900", ring: "ring-sky-300" },
  { id: "frosted", label: "Silver Glass", bg: "bg-zinc-800", ring: "ring-white" },
] as const;

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const shouldReduceMotion = useReducedMotion();
  const { releaseInfo } = useLatestRelease();
  const [selectedSurface, setSelectedSurface] = useState<"obsidian" | "midnight" | "frosted">("midnight");
  const [glassIntensity, setGlassIntensity] = useState<"balanced" | "deep">("deep");

  return (
    <div>
      {/* Hero Section */}
      <section className="relative pt-28 md:pt-36 pb-20 md:pb-28 overflow-hidden">
        {/* Background Atmospheric Liquid Glass Artwork */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none select-none overflow-hidden"
        >
          <img
            src={mediaAssets.heroLiquidGlassBg}
            alt=""
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover opacity-35 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#050507]/70 via-[#050507]/75 to-[#050507]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#050507]/90 via-[#050507]/50 to-[#050507]/85" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center">
            {/* Hero Copy */}
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-7 space-y-7"
            >
              <div className="flex items-center gap-4">
                <NovaLogo size="lg" showWordmark={false} />
                <div className="flex items-center gap-2.5 text-xs font-medium text-zinc-400">
                  <span className="text-zinc-200">{siteConfig.brand.name}</span>
                  <span aria-hidden="true">·</span>
                  <span>Android Audio Player</span>
                  <span aria-hidden="true">·</span>
                  <span>Liquid Glass</span>
                </div>
              </div>

              <h1 className="font-display text-4xl sm:text-5xl lg:text-[4rem] font-semibold tracking-tight leading-[1.05] text-white max-w-2xl">
                {siteConfig.brand.heroHeadline}
              </h1>

              <p className="text-lg sm:text-xl text-zinc-300 leading-relaxed max-w-xl">
                {siteConfig.brand.heroDescription}{" "}
                <span className="text-zinc-400">
                  Crafted for Android with translucent depth, lossless local
                  playback, and tactile audio precision.
                </span>
              </p>

              {/* Primary & Secondary CTAs */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                {releaseInfo?.isVerifiedReleaseAvailable &&
                releaseInfo.verifiedApkUrl &&
                releaseInfo.manifest ? (
                  <a
                    href={releaseInfo.verifiedApkUrl}
                    download={releaseInfo.apkFileName ?? "Nova.Music.apk"}
                    rel="noopener noreferrer"
                    onClick={() => onNavigate("download")}
                    className="liquid-button-primary inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-2xl text-sm font-semibold whitespace-nowrap shrink-0 transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                  >
                    <Download className="w-4 h-4" />
                    <span>
                      Download APK v{releaseInfo.manifest.latestVersion}
                    </span>
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => onNavigate("download")}
                    className="liquid-button-primary inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-2xl text-sm font-semibold whitespace-nowrap shrink-0 transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                  >
                    <Download className="w-4 h-4" />
                    <span>
                      {releaseInfo?.manifest
                        ? `Download APK v${releaseInfo.manifest.latestVersion}`
                        : "Download APK"}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onNavigate("pro")}
                  className="liquid-glass inline-flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl text-sm font-medium text-white hover:bg-white/[0.1] whitespace-nowrap shrink-0 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                >
                  <Sparkles className="w-4 h-4 text-sky-300" />
                  <span>Discover NOVA PRO</span>
                </button>
              </div>

              {/* Clean Metadata Row (No pills) */}
              <div className="pt-4 border-t border-white/[0.08] flex flex-wrap items-center gap-x-8 gap-y-3 text-xs text-zinc-400">
                <div>
                  <span className="text-zinc-500 block mb-0.5">Latest Version</span>
                  <span className="text-zinc-200 font-medium font-mono tabular-nums">
                    {releaseInfo?.manifest
                      ? `v${releaseInfo.manifest.latestVersion}${
                          releaseInfo.fileSizeFormatted
                            ? ` · ${releaseInfo.fileSizeFormatted}`
                            : ""
                        }`
                      : "Android 8.0+"}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block mb-0.5">Audio Engine</span>
                  <span className="text-zinc-200 font-medium">Offline Local Playback</span>
                </div>
                <div>
                  <span className="text-zinc-500 block mb-0.5">NOVA PRO</span>
                  <span className="text-zinc-200 font-medium tabular-nums">
                    {siteConfig.pro.priceAmount} {siteConfig.pro.currencyLabel} ·{" "}
                    {siteConfig.pro.billingLabel}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Hero Interactive Mockup */}
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-5"
            >
              <AndroidPlayerMockup />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Real App Interface Showcase */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <ScrollReveal>
          <div className="liquid-glass rounded-3xl p-8 md:p-12 overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
              <div className="space-y-3 max-w-2xl">
                <div className="flex items-center gap-2.5 text-xs font-medium text-sky-300">
                  <img
                    src={officialLogoSrc}
                    alt=""
                    aria-hidden="true"
                    className="w-5 h-5 rounded-md object-cover border border-white/15"
                  />
                  <span>Inside NOVA MUSIC</span>
                </div>
                <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-white">
                  Real Liquid Glass screens on Android.
                </h2>
                <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
                  From Hi-Res Listen Now discovery to full-bleed Now Playing
                  artwork and organized local library tabs—every screen shares
                  a unified translucent surface language.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate("features")}
                className="inline-flex items-center gap-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors whitespace-nowrap shrink-0"
              >
                <span>Inspect full gallery</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
              {[
                siteConfig.screenshots.items[1], // Listen Now
                siteConfig.screenshots.items[0], // Now Playing (centerpiece)
                siteConfig.screenshots.items[2], // Library
              ]
                .filter(Boolean)
                .map((shot, idx) => (
                  <div
                    key={shot.id}
                    className={`flex flex-col items-center text-center space-y-4 ${
                      idx === 1 ? "md:-mt-4" : "md:mt-3"
                    }`}
                  >
                    <div className="w-full max-w-[260px] rounded-[36px] p-[7px] bg-gradient-to-b from-zinc-500/45 via-zinc-800/85 to-zinc-950 border border-white/15 shadow-[0_30px_70px_-18px_rgba(0,0,0,0.9)]">
                      <div className="rounded-[29px] overflow-hidden bg-black aspect-[9/19.5] border border-white/10">
                        <img
                          src={shot.src}
                          alt={`NOVA MUSIC ${shot.title} Android screen`}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover object-top"
                        />
                      </div>
                    </div>
                    <div className="space-y-1 max-w-[260px]">
                      <h3 className="font-display text-base font-semibold text-white">
                        {shot.title}
                      </h3>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        {shot.caption}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* Core Features Bento Grid */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <ScrollReveal>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div className="space-y-3 max-w-2xl">
              <p className="text-xs font-medium text-sky-300 tracking-wide">
                Core Capabilities
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-white">
                Eight pillars of an effortless listening experience.
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("features")}
              className="inline-flex items-center gap-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded-lg py-1"
            >
              <span>Explore full architecture</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-5">
          {/* 01. Beautiful Music Player */}
          <ScrollReveal className="md:col-span-6 lg:col-span-7">
            <div className="liquid-glass glass-specular rounded-3xl p-7 h-full flex flex-col justify-between gap-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>01. Beautiful Music Player</span>
                  <Disc3 className="w-4 h-4 text-sky-300" />
                </div>
                <h3 className="font-display text-2xl font-semibold text-white">
                  Album artwork that shapes the atmosphere.
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed max-w-xl">
                  Every track projects subtle color and light through layered
                  translucent panels, keeping focus squarely on your music and
                  transport controls.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2">
                {[
                  { src: mediaAssets.albumArtNocturne, title: "Obsidian" },
                  { src: mediaAssets.albumArtHorizon, title: "Horizon" },
                  { src: mediaAssets.albumArtMonolith, title: "Monolith" },
                ].map((art) => (
                  <div
                    key={art.title}
                    className="rounded-2xl overflow-hidden border border-white/10 bg-zinc-900 aspect-square relative group"
                  >
                    <img
                      src={art.src}
                      alt={`${art.title} artwork sample`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>

          {/* 02. Smooth Liquid Glass Interface */}
          <ScrollReveal delay={0.05} className="md:col-span-6 lg:col-span-5">
            <div className="liquid-glass glass-specular rounded-3xl p-7 h-full flex flex-col justify-between gap-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>02. Smooth Liquid Glass Interface</span>
                  <Layers className="w-4 h-4 text-sky-300" />
                </div>
                <h3 className="font-display text-2xl font-semibold text-white">
                  Optical depth inspired by iOS 26.
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Specular highlights, multi-layer translucency, and fluid
                  spring transitions crafted specifically for modern Android
                  displays.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-300 font-medium">
                    Refraction Depth Preview
                  </span>
                  <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/10">
                    <button
                      type="button"
                      onClick={() => setGlassIntensity("balanced")}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                        glassIntensity === "balanced"
                          ? "bg-white/15 text-white"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      Balanced
                    </button>
                    <button
                      type="button"
                      onClick={() => setGlassIntensity("deep")}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                        glassIntensity === "deep"
                          ? "bg-white/15 text-white"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      Deep Glass
                    </button>
                  </div>
                </div>
                <div
                  className={`h-16 rounded-xl border border-white/15 flex items-center justify-between px-4 transition-all duration-300 ${
                    glassIntensity === "deep"
                      ? "bg-gradient-to-r from-sky-400/20 via-white/10 to-white/5 backdrop-blur-2xl"
                      : "bg-white/[0.05] backdrop-blur-md"
                  }`}
                >
                  <span className="text-xs text-white font-medium">
                    Floating Control Sheet
                  </span>
                  <span className="font-mono text-[11px] text-zinc-300">
                    {glassIntensity === "deep" ? "28px blur · 160% sat" : "14px blur · 120% sat"}
                  </span>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* 03. Smart Music Library */}
          <ScrollReveal delay={0.08} className="md:col-span-3 lg:col-span-4">
            <div className="liquid-glass-subtle glass-specular rounded-3xl p-6 h-full flex flex-col justify-between gap-5">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>03. Smart Music Library</span>
                  <FolderKanban className="w-4 h-4 text-zinc-300" />
                </div>
                <h3 className="font-display text-xl font-semibold text-white">
                  Instant organization across folders &amp; tags.
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Browse effortlessly by albums, artists, playlists, or raw
                  device directories with fast indexing.
                </p>
              </div>
              <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-zinc-400">
                <span>Artists · Albums · Folders</span>
                <span className="text-zinc-200 font-medium">Zero lag</span>
              </div>
            </div>
          </ScrollReveal>

          {/* 04. Powerful Audio Controls */}
          <ScrollReveal delay={0.1} className="md:col-span-3 lg:col-span-4">
            <div className="liquid-glass-subtle glass-specular rounded-3xl p-6 h-full flex flex-col justify-between gap-5">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>04. Powerful Audio Controls</span>
                  <SlidersHorizontal className="w-4 h-4 text-zinc-300" />
                </div>
                <h3 className="font-display text-xl font-semibold text-white">
                  Sculpt sound to your headphones.
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Fine-tune frequency bands, bass response, stereo balance, and
                  playback speed with clean tactile sliders.
                </p>
              </div>
              <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-zinc-400">
                <span>Multi-band EQ · Gain</span>
                <span className="text-zinc-200 font-medium">Custom Presets</span>
              </div>
            </div>
          </ScrollReveal>

          {/* 05. Customizable Experience */}
          <ScrollReveal delay={0.12} className="md:col-span-6 lg:col-span-4">
            <div className="liquid-glass-subtle glass-specular rounded-3xl p-6 h-full flex flex-col justify-between gap-5">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>05. Customizable Experience</span>
                  <Palette className="w-4 h-4 text-zinc-300" />
                </div>
                <h3 className="font-display text-xl font-semibold text-white">
                  Tailor surfaces to your taste.
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Adjust layout density, accent highlights, and visual glass
                  themes to make the player unmistakably yours.
                </p>
              </div>
              <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-3">
                <span className="text-xs text-zinc-400">Surface Tint</span>
                <div className="flex items-center gap-2">
                  {themeSwatches.map((swatch) => (
                    <button
                      key={swatch.id}
                      type="button"
                      onClick={() => setSelectedSurface(swatch.id)}
                      aria-label={`Select ${swatch.label} surface tint`}
                      className={`w-6 h-6 rounded-full ${swatch.bg} border border-white/25 transition-transform ${
                        selectedSurface === swatch.id
                          ? `ring-2 ${swatch.ring} scale-110`
                          : "opacity-70 hover:opacity-100"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* 06. Local Music Playback */}
          <ScrollReveal delay={0.14} className="md:col-span-3 lg:col-span-5">
            <div className="liquid-glass-subtle glass-specular rounded-3xl p-6 h-full flex flex-col justify-between gap-5">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>06. Local Music Playback</span>
                  <HardDrive className="w-4 h-4 text-zinc-300" />
                </div>
                <h3 className="font-display text-xl font-semibold text-white">
                  Your files, offline and uninterrupted.
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Built for people who own their music library. Play FLAC, WAV,
                  MP3, AAC, and OGG files directly from device storage with zero
                  accounts or streaming ads.
                </p>
              </div>
              <p className="font-mono text-xs text-zinc-400">
                FLAC · WAV · AAC · MP3 · OGG
              </p>
            </div>
          </ScrollReveal>

          {/* 07. Smart Headphone Detection */}
          <ScrollReveal delay={0.16} className="md:col-span-3 lg:col-span-4">
            <div className="liquid-glass-subtle glass-specular rounded-3xl p-6 h-full flex flex-col justify-between gap-5">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>07. Smart Headphone Detection</span>
                  <Headphones className="w-4 h-4 text-zinc-300" />
                </div>
                <h3 className="font-display text-xl font-semibold text-white">
                  Seamless wired &amp; Bluetooth handoff.
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Automatically pauses when headphones disconnect and adapts
                  output behavior the moment you plug in or pair.
                </p>
              </div>
              <p className="text-xs text-zinc-400">
                Auto-pause · Output-aware controls
              </p>
            </div>
          </ScrollReveal>

          {/* 08. Advanced Playback Gestures */}
          <ScrollReveal delay={0.18} className="md:col-span-6 lg:col-span-3">
            <div className="liquid-glass-subtle glass-specular rounded-3xl p-6 h-full flex flex-col justify-between gap-5">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>08. Playback Gestures</span>
                  <Hand className="w-4 h-4 text-zinc-300" />
                </div>
                <h3 className="font-display text-xl font-semibold text-white">
                  Fluid one-handed control.
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Swipe album art to skip, double-tap to seek, and pull to
                  reorder your queue naturally.
                </p>
              </div>
              <p className="text-xs text-zinc-400">Swipe · Seek · Queue</p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Acoustic Craftsmanship Split Section */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <ScrollReveal>
          <div className="liquid-glass rounded-3xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch">
            <div className="lg:col-span-6 min-h-[280px] lg:min-h-[400px] bg-zinc-900">
              <img
                src={mediaAssets.spatialAudioGlass}
                alt="Anodized black studio headphones next to curved smoked acoustic glass"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="lg:col-span-6 p-8 md:p-12 flex flex-col justify-between gap-8">
              <div className="space-y-4">
                <p className="text-xs font-medium text-sky-300">
                  Design &amp; Engineering Philosophy
                </p>
                <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-white">
                  Quiet software for serious listening.
                </h2>
                <p className="text-base text-zinc-300 leading-relaxed">
                  Modern music apps bury your library beneath feeds, algorithmic
                  clutter, and noisy banners. NOVA MUSIC strips away everything
                  that does not serve the track currently playing.
                </p>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Developed independently by {siteConfig.brand.developer}, every
                  gesture, glass blur, and audio transition is tuned for clarity
                  and battery efficiency on Android.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => onNavigate("features")}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-sm font-medium text-white transition-colors whitespace-nowrap shrink-0"
                >
                  <span>Explore All Features</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate("about")}
                  className="text-sm font-medium text-zinc-400 hover:text-white transition-colors px-2 py-2 whitespace-nowrap shrink-0"
                >
                  Read the story
                </button>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* Final Conversion Band */}
      <section className="max-w-6xl mx-auto px-6 pt-10 pb-8">
        <ScrollReveal>
          <div className="liquid-glass rounded-3xl p-8 md:p-14 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="space-y-3 max-w-xl">
              <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-white">
                Ready for NOVA MUSIC on Android?
              </h2>
              <p className="text-base text-zinc-400 leading-relaxed">
                Check the official APK release status or explore the lifetime{" "}
                <span className="text-zinc-200 font-medium">NOVA PRO</span>{" "}
                experience.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 shrink-0">
              {releaseInfo?.isVerifiedReleaseAvailable &&
              releaseInfo.verifiedApkUrl &&
              releaseInfo.manifest ? (
                <a
                  href={releaseInfo.verifiedApkUrl}
                  download={releaseInfo.apkFileName ?? "Nova.Music.apk"}
                  rel="noopener noreferrer"
                  onClick={() => onNavigate("download")}
                  className="liquid-button-primary inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-semibold whitespace-nowrap shrink-0 transition-transform hover:-translate-y-0.5"
                >
                  <Download className="w-4 h-4" />
                  <span>
                    Download APK v{releaseInfo.manifest.latestVersion}
                  </span>
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => onNavigate("download")}
                  className="liquid-button-primary inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-semibold whitespace-nowrap shrink-0 transition-transform hover:-translate-y-0.5"
                >
                  <Download className="w-4 h-4" />
                  <span>
                    {releaseInfo?.manifest
                      ? `Download APK v${releaseInfo.manifest.latestVersion}`
                      : "Download APK"}
                  </span>
                </button>
              )}
              <button
                type="button"
                onClick={() => onNavigate("pro")}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-sm font-medium text-white whitespace-nowrap shrink-0 transition-colors"
              >
                <span>View NOVA PRO</span>
              </button>
            </div>
          </div>
        </ScrollReveal>
      </section>
    </div>
  );
};
