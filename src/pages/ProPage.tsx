import React, { useState } from "react";
import {
  Sparkles,
  Check,
  Minus,
  ShieldCheck,
  ChevronDown,
  Lock,
  Palette,
  Sliders,
  Layers,
  Activity,
  BarChart3,
  RefreshCw,
  Clock,
} from "lucide-react";
import { siteConfig } from "../config/siteConfig";
import { createProCheckoutSession } from "../services/paymentService";
import { ScrollReveal } from "../components/ScrollReveal";
import type { AppRoute } from "../types/navigation";

interface ProPageProps {
  onNavigate: (route: AppRoute) => void;
}

const proBenefits = [
  {
    title: "Premium Themes",
    description:
      "Curated obsidian, frosted silver, and midnight refraction surfaces designed for AMOLED displays.",
    icon: Palette,
  },
  {
    title: "Advanced Customization",
    description:
      "Fine-tune player corner geometry, blur depth, typography weight, and control bar layout.",
    icon: Sliders,
  },
  {
    title: "Exclusive Liquid Glass Effects",
    description:
      "Dynamic specular highlights and real-time album art color diffusion across glass layers.",
    icon: Layers,
  },
  {
    title: "Advanced Visualizer",
    description:
      "Smooth frequency-reactive acoustic waveforms rendered gently behind your playback controls.",
    icon: Activity,
  },
  {
    title: "Listening Statistics",
    description:
      "Private, on-device insights into top tracks, listening hours, and album history without cloud tracking.",
    icon: BarChart3,
  },
  {
    title: "Exclusive Premium Features",
    description:
      "Extended audio presets, custom gesture bindings, and priority access to experimental tools.",
    icon: Sparkles,
  },
  {
    title: "Future Premium Updates",
    description:
      "Every upcoming NOVA PRO capability included at no extra cost under one lifetime license.",
    icon: RefreshCw,
  },
];

const comparisonRows = [
  {
    feature: "Local FLAC, WAV, MP3, AAC & OGG playback",
    free: "Included",
    pro: "Included",
    freeHas: true,
  },
  {
    feature: "Smart library, folders & queue controls",
    free: "Included",
    pro: "Included",
    freeHas: true,
  },
  {
    feature: "Standard Liquid Glass interface",
    free: "Included",
    pro: "Included",
    freeHas: true,
  },
  {
    feature: "Premium themes & surface tints",
    free: "Standard only",
    pro: "All themes unlocked",
    freeHas: false,
  },
  {
    feature: "Exclusive Liquid Glass visual effects",
    free: "Not included",
    pro: "Full specular refraction",
    freeHas: false,
  },
  {
    feature: "Advanced acoustic visualizer",
    free: "Not included",
    pro: "Included",
    freeHas: false,
  },
  {
    feature: "Private on-device listening statistics",
    free: "Not included",
    pro: "Included",
    freeHas: false,
  },
  {
    feature: "Future NOVA PRO updates",
    free: "Core updates only",
    pro: "Lifetime access",
    freeHas: false,
  },
];

const proFaqs = [
  {
    question: "Is NOVA PRO a subscription or a one-time payment?",
    answer: `NOVA PRO is a single ${siteConfig.pro.priceAmount} ${siteConfig.pro.currencyLabel} one-time purchase for ${siteConfig.pro.billingLabel}. There are no recurring monthly or annual fees.`,
  },
  {
    question: "How is payment verified securely?",
    answer:
      "When online checkout goes live, transactions are processed directly by a Morocco-supported payment provider and confirmed via a secure server-side verification step before issuing your PRO entitlement.",
  },
  {
    question: "Can I restore NOVA PRO if I switch or reset my Android phone?",
    answer:
      "Yes. Once server-verified licensing is active, you will be able to restore your NOVA PRO access using your purchase email and verified order reference.",
  },
  {
    question: "When will Buy NOVA PRO be available?",
    answer:
      "Payment gateway integration is currently in preparation. Until merchant verification credentials are active, online checkout remains transparently marked as Coming Soon.",
  },
];

export const ProPage: React.FC<ProPageProps> = ({ onNavigate }) => {
  const { pro } = siteConfig;
  const isGatewayReady = pro.paymentProvider.configured;
  const [email, setEmail] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<"info" | "error">("info");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isGatewayReady) {
      setStatusKind("info");
      setStatusMessage(
        "Coming Soon: NOVA PRO checkout is not active yet. Online payment will only unlock PRO access once server-side payment provider verification is connected."
      );
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setStatusKind("error");
      setStatusMessage("Please enter a valid email address for your license receipt.");
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    const result = await createProCheckoutSession({ email: email.trim() });
    setIsSubmitting(false);

    if (result.status === "redirect_ready" && result.checkoutUrl) {
      window.location.assign(result.checkoutUrl);
      return;
    }

    setStatusKind(result.status === "error" ? "error" : "info");
    setStatusMessage(result.message);
  };

  return (
    <div className="pt-28 md:pt-36 pb-12 max-w-6xl mx-auto px-6">
      {/* Hero + Pricing Card Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start mb-20">
        <ScrollReveal className="lg:col-span-7 space-y-6">
          <div className="flex items-center gap-2.5 text-xs font-medium text-sky-300">
            <Sparkles className="w-4 h-4" />
            <span>NOVA PRO</span>
          </div>

          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-white leading-[1.06]">
            {pro.headline}
          </h1>

          <p className="text-lg text-zinc-300 leading-relaxed max-w-2xl">
            Elevate NOVA MUSIC with exclusive Liquid Glass visual effects,
            curated dark themes, a real-time acoustic visualizer, and private
            on-device listening statistics.
          </p>

          <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="liquid-glass-subtle rounded-2xl p-4 space-y-1">
              <p className="font-medium text-white">One-Time Ownership</p>
              <p className="text-xs text-zinc-400">
                No subscriptions, no recurring charges, no hidden tiers.
              </p>
            </div>
            <div className="liquid-glass-subtle rounded-2xl p-4 space-y-1">
              <p className="font-medium text-white">Server-Verified Licensing</p>
              <p className="text-xs text-zinc-400">
                Activation is issued strictly after confirmed gateway payment.
              </p>
            </div>
          </div>
        </ScrollReveal>

        {/* Pricing & Checkout Box */}
        <ScrollReveal delay={0.06} className="lg:col-span-5">
          <section className="liquid-glass rounded-3xl p-7 md:p-8 space-y-6">
            <div className="flex items-start justify-between gap-4 pb-6 border-b border-white/[0.08]">
              <div>
                <p className="text-xs font-medium text-zinc-400">
                  NOVA PRO License
                </p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-display text-4xl sm:text-5xl font-semibold text-white tabular-nums">
                    {pro.priceAmount} {pro.currencyLabel}
                  </span>
                </div>
                <p className="mt-1 text-xs text-sky-300 font-medium">
                  {pro.billingLabel}
                </p>
              </div>

              <span className="text-xs font-medium text-zinc-300 border border-white/15 bg-white/[0.06] px-3 py-1 rounded-lg whitespace-nowrap shrink-0">
                {isGatewayReady ? "Checkout Active" : "Coming Soon"}
              </span>
            </div>

            <form onSubmit={handleCheckoutSubmit} className="space-y-4">
              {isGatewayReady && (
                <div className="space-y-1.5">
                  <label
                    htmlFor="pro-license-email"
                    className="block text-xs font-medium text-zinc-300"
                  >
                    License Receipt Email
                  </label>
                  <input
                    id="pro-license-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/15 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-sky-400/70"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full inline-flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                  isGatewayReady
                    ? "liquid-button-primary hover:-translate-y-0.5"
                    : "bg-white/[0.09] hover:bg-white/[0.13] text-white border border-white/15"
                }`}
              >
                {isGatewayReady ? (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>
                      {isSubmitting ? "Preparing Checkout..." : "Buy NOVA PRO"}
                    </span>
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4 text-sky-300" />
                    <span>Buy NOVA PRO — Coming Soon</span>
                  </>
                )}
              </button>
            </form>

            {statusMessage && (
              <div
                role="status"
                className={`rounded-2xl p-4 text-xs leading-relaxed border ${
                  statusKind === "error"
                    ? "bg-red-500/10 border-red-400/25 text-red-200"
                    : "bg-sky-400/10 border-sky-300/20 text-zinc-200"
                }`}
              >
                {statusMessage}
              </div>
            )}

            <div className="pt-2 border-t border-white/[0.06] space-y-2 text-xs text-zinc-400">
              <div className="flex items-center gap-2 text-zinc-300 font-medium">
                <ShieldCheck className="w-4 h-4 text-sky-300 shrink-0" />
                <span>Secure Payment Information</span>
              </div>
              <p className="leading-relaxed">
                Prepared for {pro.paymentProvider.providerDisplayName} with
                strict server-side verification. No secret keys are stored in
                browser code, and PRO activation occurs only after verified
                payment confirmation.
              </p>
            </div>
          </section>
        </ScrollReveal>
      </div>

      {/* 7 Benefits Grid */}
      <ScrollReveal>
        <section className="mb-20">
          <div className="mb-10 space-y-2">
            <p className="text-xs font-medium text-sky-300">
              Included in NOVA PRO
            </p>
            <h2 className="font-display text-3xl font-semibold tracking-tight text-white">
              Crafted for listeners who want complete control.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {proBenefits.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <div
                  key={benefit.title}
                  className="liquid-glass-subtle glass-specular rounded-3xl p-6 space-y-3"
                >
                  <Icon className="w-5 h-5 text-sky-300" />
                  <h3 className="font-display text-lg font-semibold text-white">
                    {benefit.title}
                  </h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    {benefit.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </ScrollReveal>

      {/* Feature Comparison Table */}
      <ScrollReveal>
        <section className="liquid-glass rounded-3xl p-6 sm:p-10 mb-20 overflow-hidden">
          <div className="mb-8 space-y-2">
            <h2 className="font-display text-2xl sm:text-3xl font-semibold text-white">
              NOVA MUSIC vs. NOVA PRO
            </h2>
            <p className="text-sm text-zinc-400">
              The core player remains clean and ad-free. NOVA PRO unlocks visual
              refinement, telemetry insights, and future exclusives.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[540px]">
              <thead>
                <tr className="border-b border-white/10 text-xs text-zinc-400">
                  <th className="py-3.5 pr-4 font-medium">Capability</th>
                  <th className="py-3.5 px-4 font-medium">NOVA MUSIC (Free)</th>
                  <th className="py-3.5 pl-4 font-medium text-sky-300">
                    NOVA PRO ({pro.priceAmount} {pro.currencyLabel})
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] text-sm">
                {comparisonRows.map((row) => (
                  <tr key={row.feature}>
                    <td className="py-4 pr-4 text-zinc-200">{row.feature}</td>
                    <td className="py-4 px-4 text-zinc-400">
                      <span className="inline-flex items-center gap-2">
                        {row.freeHas ? (
                          <Check className="w-4 h-4 text-zinc-300 shrink-0" />
                        ) : (
                          <Minus className="w-4 h-4 text-zinc-600 shrink-0" />
                        )}
                        <span>{row.free}</span>
                      </span>
                    </td>
                    <td className="py-4 pl-4 text-white font-medium">
                      <span className="inline-flex items-center gap-2">
                        <Check className="w-4 h-4 text-sky-300 shrink-0" />
                        <span>{row.pro}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </ScrollReveal>

      {/* PRO FAQ */}
      <ScrollReveal>
        <section className="max-w-3xl mx-auto space-y-6">
          <div className="text-center space-y-2 mb-8">
            <h2 className="font-display text-2xl sm:text-3xl font-semibold text-white">
              NOVA PRO Questions
            </h2>
            <p className="text-sm text-zinc-400">
              Pricing, payment security, and license restoration details.
            </p>
          </div>

          <div className="space-y-3">
            {proFaqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={faq.question}
                  className="liquid-glass-subtle rounded-2xl overflow-hidden"
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 hover:bg-white/[0.03] transition-colors"
                  >
                    <span className="text-sm font-medium text-white">
                      {faq.question}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5 text-sm text-zinc-400 leading-relaxed border-t border-white/[0.05] pt-3">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-6 text-center">
            <button
              type="button"
              onClick={() => onNavigate("support")}
              className="text-xs font-medium text-sky-300 hover:text-sky-200 transition-colors"
            >
              Have more questions? Visit Support &amp; FAQ
            </button>
          </div>
        </section>
      </ScrollReveal>
    </div>
  );
};
