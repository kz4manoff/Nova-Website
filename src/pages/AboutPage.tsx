import React from "react";
import { ArrowRight, Code2, Compass, HeartHandshake } from "lucide-react";
import { siteConfig } from "../config/siteConfig";
import { ScrollReveal } from "../components/ScrollReveal";
import { NovaLogo } from "../components/NovaLogo";
import { ContactDeveloperSection } from "../components/ContactDeveloperSection";
import type { AppRoute } from "../types/navigation";

interface AboutPageProps {
  onNavigate: (route: AppRoute) => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ onNavigate }) => {
  return (
    <div className="pt-28 md:pt-36 pb-12 max-w-5xl mx-auto px-6 space-y-16">
      {/* Intro */}
      <ScrollReveal>
        <div className="max-w-3xl space-y-5">
          <p className="text-xs font-medium text-sky-300">About NOVA MUSIC</p>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight text-white leading-[1.08]">
            Built for people who still cherish their music collection.
          </h1>
          <p className="text-lg text-zinc-300 leading-relaxed">
            NOVA MUSIC started from a simple conviction: playing the audio
            files stored on your Android phone should feel as refined as holding
            a dedicated acoustic instrument—not scrolling through an ad feed.
          </p>
        </div>
      </ScrollReveal>

      {/* Story & Mission Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ScrollReveal>
          <section className="liquid-glass rounded-3xl p-8 h-full space-y-4">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Our Story</span>
              <Compass className="w-4 h-4 text-sky-300" />
            </div>
            <h2 className="font-display text-2xl font-semibold text-white">
              Reclaiming calm on Android.
            </h2>
            <p className="text-sm text-zinc-300 leading-relaxed">
              Too many mobile music players either look outdated or drown local
              albums under social feeds and subscriptions. NOVA MUSIC brings the
              fluidity and light refraction of Liquid Glass aesthetics to a
              fast, offline-first Android player.
            </p>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Every visual element—from subtle specular rim highlights to clean
              gestures—exists to make browsing albums and shaping sound feel
              effortless.
            </p>
          </section>
        </ScrollReveal>

        <ScrollReveal delay={0.05}>
          <section className="liquid-glass rounded-3xl p-8 h-full space-y-4">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Our Mission</span>
              <HeartHandshake className="w-4 h-4 text-sky-300" />
            </div>
            <h2 className="font-display text-2xl font-semibold text-white">
              Privacy, craft, and ownership.
            </h2>
            <p className="text-sm text-zinc-300 leading-relaxed">
              Your local library stays on your device. NOVA MUSIC never forces
              account sign-ups to play an MP3 or FLAC file, never injects ads,
              and respects your battery and attention.
            </p>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Independent development lets us focus on genuine user feedback and
              steady craft rather than engagement metrics.
            </p>
          </section>
        </ScrollReveal>
      </div>

      {/* Developer Profile */}
      <ScrollReveal>
        <section className="liquid-glass-subtle rounded-3xl p-8 md:p-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4 max-w-2xl">
            <div className="flex items-center gap-2.5 text-xs text-sky-300 font-medium">
              <Code2 className="w-4 h-4" />
              <span>Independent Developer</span>
            </div>
            <h2 className="font-display text-3xl font-semibold text-white">
              {siteConfig.brand.developer}
            </h2>
            <p className="text-sm text-zinc-300 leading-relaxed">
              NOVA MUSIC is designed, engineered, and maintained by{" "}
              <span className="text-white font-medium">
                {siteConfig.brand.developer}
              </span>
              , combining precision Android engineering with minimalist dark-first
              interface design.
            </p>
            <p className="text-xs text-zinc-500">{siteConfig.brand.copyright}</p>
          </div>

          <div className="flex flex-col items-start md:items-end gap-4 shrink-0">
            <NovaLogo size="lg" showWordmark={false} />
            <button
              type="button"
              onClick={() => onNavigate("support")}
              className="liquid-button-primary inline-flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0"
            >
              <span>Contact &amp; Support</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>
      </ScrollReveal>
      {/* Contact Developer */}
      <ContactDeveloperSection compact />
    </div>
  );
};
