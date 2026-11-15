import React, { useState } from "react";
import {
  Disc3,
  FolderKanban,
  SlidersHorizontal,
  Palette,
  Layers,
  HardDrive,
  Headphones,
  Hand,
  ArrowRight,
  Image as ImageIcon,
  Maximize2,
  X,
} from "lucide-react";
import { siteConfig, type AppScreenshot } from "../config/siteConfig";
import { ScrollReveal } from "../components/ScrollReveal";
import { AndroidPlayerMockup } from "../components/AndroidPlayerMockup";
import type { AppRoute } from "../types/navigation";

interface FeaturesPageProps {
  onNavigate: (route: AppRoute) => void;
}

type FeatureCategory = "all" | "playback" | "interface" | "library";

interface FeatureItem {
  id: string;
  number: string;
  category: Exclude<FeatureCategory, "all">;
  title: string;
  summary: string;
  details: string[];
  icon: React.ComponentType<{ className?: string }>;
}

const featuresList: FeatureItem[] = [
  {
    id: "player",
    number: "01",
    category: "playback",
    title: "Beautiful Music Player",
    summary:
      "A calm, responsive Now Playing surface that adapts subtly to each track's artwork without visual noise.",
    details: [
      "Full-bleed artwork framing with soft glass refraction",
      "Precision time scrubbing with clear tabular timestamps",
      "Distraction-free lock screen and notification controls",
    ],
    icon: Disc3,
  },
  {
    id: "glass",
    number: "02",
    category: "interface",
    title: "Smooth Liquid Glass Interface",
    summary:
      "Inspired by iOS 26 Liquid Glass principles, bringing translucent depth and specular edges natively to Android.",
    details: [
      "Layered frosted panels that preserve spatial context",
      "Hardware-accelerated blur tuned for 60–120 Hz screens",
      "Dark-first contrast engineered for comfortable night listening",
    ],
    icon: Layers,
  },
  {
    id: "library",
    number: "03",
    category: "library",
    title: "Smart Music Library",
    summary:
      "Instant indexing of local tracks across albums, artists, genres, and device folders.",
    details: [
      "Clean metadata parsing with folder-level browsing",
      "Fast instant search across thousands of local songs",
      "Lightweight queue management and custom playlists",
    ],
    icon: FolderKanban,
  },
  {
    id: "audio",
    number: "04",
    category: "playback",
    title: "Powerful Audio Controls",
    summary:
      "Shape your listening signature with multi-band EQ presets, bass tuning, and output balance.",
    details: [
      "Interactive equalizer bands with custom profile saving",
      "Gapless playback transitions for live albums & mixes",
      "Fine-grained playback speed and pitch stability",
    ],
    icon: SlidersHorizontal,
  },
  {
    id: "custom",
    number: "05",
    category: "interface",
    title: "Customizable Experience",
    summary:
      "Adjust surface tints, artwork corners, and glass intensity to match your personal setup.",
    details: [
      "Multiple dark & frosted surface presets",
      "Configurable Now Playing layout density",
      "Expanded theme library unlocked with NOVA PRO",
    ],
    icon: Palette,
  },
  {
    id: "local",
    number: "06",
    category: "library",
    title: "Local Music Playback",
    summary:
      "100% offline-first playback from your Android internal storage or microSD card.",
    details: [
      "Supports FLAC, WAV, ALAC, MP3, AAC, and OGG files",
      "No accounts, tracking, or internet connection required",
      "Zero ads interrupting albums or playlists",
    ],
    icon: HardDrive,
  },
  {
    id: "headphones",
    number: "07",
    category: "playback",
    title: "Smart Headphone Detection",
    summary:
      "Intelligent audio routing aware of wired jacks, USB-C DACs, and Bluetooth headsets.",
    details: [
      "Automatic pause on headphone disconnect",
      "Quick output switching without restarting playback",
      "Consistent volume protection across devices",
    ],
    icon: Headphones,
  },
  {
    id: "gestures",
    number: "08",
    category: "interface",
    title: "Advanced Playback Gestures",
    summary:
      "Natural one-handed interactions built for large smartphone screens.",
    details: [
      "Horizontal artwork swipe for next and previous track",
      "Double-tap seek zones for quick track navigation",
      "Pull-up gesture to reveal queue and track details",
    ],
    icon: Hand,
  },
];

const gestureDemos = [
  {
    action: "Swipe Artwork Left / Right",
    result: "Skips cleanly to next or previous track in your queue.",
  },
  {
    action: "Double-Tap Left / Right Edge",
    result: "Seeks backward or forward by 10 seconds with haptic confirmation.",
  },
  {
    action: "Swipe Up on Player Sheet",
    result: "Expands upcoming queue & audio format inspector smoothly.",
  },
];

export const FeaturesPage: React.FC<FeaturesPageProps> = ({ onNavigate }) => {
  const [activeCategory, setActiveCategory] = useState<FeatureCategory>("all");
  const [activeGestureIdx, setActiveGestureIdx] = useState(0);
  const [lightboxShot, setLightboxShot] = useState<AppScreenshot | null>(null);

  const visibleFeatures =
    activeCategory === "all"
      ? featuresList
      : featuresList.filter((item) => item.category === activeCategory);

  const hasRealScreenshots = siteConfig.screenshots.items.length > 0;

  return (
    <div className="pt-28 md:pt-36 pb-12 max-w-6xl mx-auto px-6">
      {/* Header */}
      <ScrollReveal>
        <div className="max-w-3xl space-y-5 mb-12">
          <p className="text-xs font-medium text-sky-300">
            Features &amp; Architecture
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight text-white leading-[1.08]">
            Designed for clarity. Engineered for local audio.
          </h1>
          <p className="text-lg text-zinc-400 leading-relaxed">
            Every layer of NOVA MUSIC combines Android audio performance with a
            quiet, tactile Liquid Glass interface.
          </p>
        </div>
      </ScrollReveal>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-10">
        {(
          [
            { id: "all", label: "All Features" },
            { id: "playback", label: "Playback & Audio" },
            { id: "interface", label: "Liquid Glass UI" },
            { id: "library", label: "Local Library" },
          ] as { id: FeatureCategory; label: string }[]
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveCategory(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
              activeCategory === tab.id
                ? "bg-white text-zinc-950"
                : "bg-white/[0.06] text-zinc-300 hover:bg-white/[0.1] hover:text-white border border-white/10"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Feature Architecture Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20">
        {visibleFeatures.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <ScrollReveal key={feature.id} delay={index * 0.03}>
              <article className="liquid-glass glass-specular rounded-3xl p-7 h-full flex flex-col justify-between gap-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>
                      {feature.number}. {feature.title}
                    </span>
                    <Icon className="w-4 h-4 text-sky-300 shrink-0" />
                  </div>
                  <h2 className="font-display text-2xl font-semibold text-white">
                    {feature.title}
                  </h2>
                  <p className="text-sm text-zinc-300 leading-relaxed">
                    {feature.summary}
                  </p>
                </div>

                <ul className="space-y-2 pt-4 border-t border-white/[0.07]">
                  {feature.details.map((point) => (
                    <li
                      key={point}
                      className="text-xs text-zinc-400 flex items-start gap-2.5"
                    >
                      <span
                        aria-hidden="true"
                        className="mt-1.5 w-1 h-1 rounded-full bg-sky-300 shrink-0"
                      />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </article>
            </ScrollReveal>
          );
        })}
      </div>

      {/* Interactive Device & Gesture Demonstration */}
      <ScrollReveal>
        <section className="liquid-glass rounded-3xl p-8 md:p-12 mb-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 space-y-6">
              <div className="space-y-3">
                <p className="text-xs font-medium text-sky-300">
                  Real Android Interface
                </p>
                <h2 className="font-display text-3xl font-semibold tracking-tight text-white">
                  Explore NOVA MUSIC screen by screen.
                </h2>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Switch between Now Playing, Listen Now, and Smart Library in
                  the Android device frame, or inspect playback gestures below.
                </p>
              </div>

              <div className="space-y-2.5">
                {gestureDemos.map((demo, idx) => {
                  const selected = idx === activeGestureIdx;
                  return (
                    <button
                      key={demo.action}
                      type="button"
                      onClick={() => setActiveGestureIdx(idx)}
                      className={`w-full text-left p-4 rounded-2xl border transition-colors ${
                        selected
                          ? "bg-white/[0.1] border-white/25"
                          : "bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06]"
                      }`}
                    >
                      <p className="text-sm font-medium text-white">
                        {demo.action}
                      </p>
                      <p className="text-xs text-zinc-400 mt-1">
                        {demo.result}
                      </p>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 flex flex-wrap gap-4">
                <button
                  type="button"
                  onClick={() => onNavigate("download")}
                  className="liquid-button-primary inline-flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0"
                >
                  <span>Check APK Release</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate("pro")}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-medium text-white whitespace-nowrap shrink-0"
                >
                  <span>Explore NOVA PRO</span>
                </button>
              </div>
            </div>

            <div className="lg:col-span-6">
              <AndroidPlayerMockup />
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* Honest Real Screenshots Section */}
      <ScrollReveal>
        <section className="liquid-glass-subtle rounded-3xl p-8 md:p-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="font-display text-2xl font-semibold text-white">
                Application Screenshots
              </h2>
              <p className="text-sm text-zinc-400 mt-1">
                Verified screenshots captured directly from Android release
                builds.
              </p>
            </div>
            <ImageIcon className="w-5 h-5 text-zinc-400 shrink-0" />
          </div>

          {hasRealScreenshots ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
              {siteConfig.screenshots.items.map((shot) => (
                <figure
                  key={shot.id}
                  className="group rounded-3xl border border-white/10 bg-white/[0.025] p-5 flex flex-col items-center text-center gap-4 transition-colors hover:bg-white/[0.05]"
                >
                  <button
                    type="button"
                    onClick={() => setLightboxShot(shot)}
                    aria-label={`Enlarge ${shot.title} screenshot`}
                    className="relative w-full max-w-[230px] rounded-[32px] p-[6px] bg-gradient-to-b from-zinc-500/45 via-zinc-800/85 to-zinc-950 border border-white/15 shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                  >
                    <div className="relative rounded-[26px] overflow-hidden aspect-[9/19.5] bg-black">
                      <img
                        src={shot.src}
                        alt={`NOVA MUSIC ${shot.title} screenshot`}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                      <span className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/15 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <Maximize2 className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </button>
                  <figcaption className="space-y-1">
                    <p className="font-display text-base font-semibold text-white">
                      {shot.title}
                    </p>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {shot.caption}
                    </p>
                  </figcaption>
                </figure>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 text-center space-y-2">
              <p className="text-sm font-medium text-zinc-200">
                In-App Screenshots Coming Soon
              </p>
              <p className="text-xs text-zinc-400 max-w-lg mx-auto leading-relaxed">
                Real Android device screenshots are not published in this
                repository yet.
              </p>
            </div>
          )}
        </section>
      </ScrollReveal>

      {/* Screenshot Lightbox Modal */}
      {lightboxShot && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${lightboxShot.title} screenshot preview`}
          onClick={() => setLightboxShot(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl p-4 sm:p-8 flex items-center justify-center"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="liquid-glass rounded-3xl p-5 sm:p-6 max-w-md w-full space-y-4 relative"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="font-display text-lg font-semibold text-white">
                  {lightboxShot.title}
                </h3>
                <p className="text-xs text-zinc-400">NOVA MUSIC for Android</p>
              </div>
              <button
                type="button"
                onClick={() => setLightboxShot(null)}
                aria-label="Close preview"
                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/15 flex items-center justify-center text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mx-auto max-w-[290px] rounded-[34px] p-[7px] bg-gradient-to-b from-zinc-500/45 via-zinc-800/85 to-zinc-950 border border-white/15">
              <div className="rounded-[27px] overflow-hidden aspect-[9/19.5] bg-black">
                <img
                  src={lightboxShot.src}
                  alt={lightboxShot.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-top"
                />
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed text-center">
              {lightboxShot.caption}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
