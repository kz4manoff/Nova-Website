import React, { useState } from "react";
import {
  ChevronDown,
  Send,
  Check,
  Copy,
  AlertCircle,
  Mail,
  Search,
} from "lucide-react";
import { siteConfig } from "../config/siteConfig";
import { ScrollReveal } from "../components/ScrollReveal";
import { ContactDeveloperSection } from "../components/ContactDeveloperSection";

interface FaqEntry {
  id: string;
  topic: string;
  question: string;
  answer: string;
}

const faqEntries: FaqEntry[] = [
  {
    id: "install-apk",
    topic: "Installation",
    question: "How do I install the NOVA MUSIC APK on Android?",
    answer:
      "Once the official APK is published on the Download page, download it directly to your phone, verify its SHA-256 checksum if desired, then open the APK file. Android will prompt you to allow 'Install unknown apps' for your browser or file manager before completing installation.",
  },
  {
    id: "update-app",
    topic: "Updates",
    question: "How do I update NOVA MUSIC to a newer version?",
    answer:
      "Visit the official Download page to check the latest version number and release notes. Download the newer APK and install it over your existing NOVA MUSIC installation—your local playlists and settings remain intact.",
  },
  {
    id: "compatibility",
    topic: "Compatibility",
    question: "Which Android devices and audio formats are supported?",
    answer:
      "Minimum Android version details will be finalized and published on the Download page alongside the initial APK release. NOVA MUSIC is engineered for modern Android smartphones and supports local FLAC, WAV, ALAC, MP3, AAC, and OGG playback.",
  },
  {
    id: "purchase-pro",
    topic: "NOVA PRO",
    question: "How can I purchase NOVA PRO?",
    answer: `NOVA PRO is priced at ${siteConfig.pro.priceAmount} ${siteConfig.pro.currencyLabel} (${siteConfig.pro.billingLabel}). Online checkout via a Morocco-supported payment provider is currently in preparation. Activation will strictly happen after server-side payment verification.`,
  },
  {
    id: "restore-pro",
    topic: "NOVA PRO",
    question: "How do I restore my NOVA PRO access on a new device?",
    answer:
      "Once NOVA PRO purchases are active, your license is tied to your verified purchase email and server order reference. You will be able to verify and restore your entitlement directly through the server verification flow.",
  },
  {
    id: "contact-support",
    topic: "Support",
    question: "How do I contact support or report an audio bug?",
    answer:
      "Use the Contact Support form below with your Android device model, Android version, and a clear description of the issue or question.",
  },
];

interface FormErrors {
  name?: string;
  email?: string;
  message?: string;
}

export const SupportPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [openFaqId, setOpenFaqId] = useState<string | null>("install-apk");

  // Contact form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("General Question");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSending, setIsSending] = useState(false);
  const [submitState, setSubmitState] = useState<{
    type: "sent" | "unconfigured" | "error";
    text: string;
  } | null>(null);
  const [copiedInquiry, setCopiedInquiry] = useState(false);

  const filteredFaqs = faqEntries.filter(
    (entry) =>
      entry.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.topic.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const validateForm = (): boolean => {
    const nextErrors: FormErrors = {};
    if (name.trim().length < 2) {
      nextErrors.name = "Please enter your name (at least 2 characters).";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = "Please enter a valid email address.";
    }
    if (message.trim().length < 15) {
      nextErrors.message =
        "Please include at least 15 characters describing your question or issue.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitState(null);

    if (!validateForm()) return;

    const endpoint = siteConfig.support.formEndpoint;
    if (!endpoint) {
      setSubmitState({
        type: "unconfigured",
        text: "No live email backend is connected in siteConfig.ts yet, so this form does not fake sending. Copy your validated message below or configure siteConfig.support.formEndpoint.",
      });
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          topic,
          message: message.trim(),
        }),
      });

      if (!response.ok) {
        const errPayload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setSubmitState({
          type: "error",
          text:
            errPayload?.error ??
            "The support server could not process your request right now.",
        });
      } else {
        setSubmitState({
          type: "sent",
          text: "Your message has been delivered to the support server.",
        });
        setName("");
        setEmail("");
        setMessage("");
      }
    } catch {
      setSubmitState({
        type: "error",
        text: "Network error while sending your message. Please try again.",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyFormattedInquiry = async () => {
    const formatted = `NOVA MUSIC Support Inquiry\nTopic: ${topic}\nFrom: ${name.trim()} (${email.trim()})\n\n${message.trim()}`;
    try {
      await navigator.clipboard.writeText(formatted);
      setCopiedInquiry(true);
      window.setTimeout(() => setCopiedInquiry(false), 2000);
    } catch {
      // Clipboard blocked
    }
  };

  return (
    <div className="pt-28 md:pt-36 pb-12 max-w-6xl mx-auto px-6">
      <ScrollReveal>
        <div className="max-w-3xl space-y-5 mb-12">
          <p className="text-xs font-medium text-sky-300">Support &amp; FAQ</p>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight text-white leading-[1.08]">
            Answers &amp; direct assistance.
          </h1>
          <p className="text-lg text-zinc-400 leading-relaxed">
            Everything you need to know about installing the Android APK,
            updating versions, compatibility, and NOVA PRO access.
          </p>
        </div>
      </ScrollReveal>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* FAQ Column */}
        <ScrollReveal className="lg:col-span-7 space-y-6">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search FAQ topics (APK, updates, NOVA PRO...)"
              aria-label="Search frequently asked questions"
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl liquid-glass-subtle text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-sky-400/70"
            />
          </div>

          <div className="space-y-3">
            {filteredFaqs.length > 0 ? (
              filteredFaqs.map((faq) => {
                const isOpen = openFaqId === faq.id;
                return (
                  <div
                    key={faq.id}
                    className="liquid-glass-subtle rounded-2xl overflow-hidden"
                  >
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                      className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 hover:bg-white/[0.03] transition-colors"
                    >
                      <div className="space-y-0.5">
                        <span className="text-[11px] font-medium text-sky-300 block">
                          {faq.topic}
                        </span>
                        <span className="text-sm font-medium text-white">
                          {faq.question}
                        </span>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform duration-200 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-6 pb-5 pt-3 border-t border-white/[0.05] text-sm text-zinc-300 leading-relaxed">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="liquid-glass-subtle rounded-2xl p-8 text-center text-sm text-zinc-400">
                No FAQ entries matched &ldquo;{searchQuery}&rdquo;. Use the
                contact form to ask directly.
              </div>
            )}
          </div>
        </ScrollReveal>

        {/* Contact Support Form Column */}
        <ScrollReveal delay={0.05} className="lg:col-span-5">
          <section className="liquid-glass rounded-3xl p-7 md:p-8 space-y-6">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl font-semibold text-white">
                  Contact Support
                </h2>
                <Mail className="w-4 h-4 text-sky-300" />
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Validate your question below. Include your Android model if
                reporting a playback issue.
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="support-name"
                  className="block text-xs font-medium text-zinc-300"
                >
                  Your Name
                </label>
                <input
                  id="support-name"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) setErrors((p) => ({ ...p, name: undefined }));
                  }}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? "support-name-err" : undefined}
                  placeholder="Mohamed"
                  className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/15 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-sky-400/70"
                />
                {errors.name && (
                  <p id="support-name-err" className="text-xs text-red-300">
                    {errors.name}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="support-email"
                  className="block text-xs font-medium text-zinc-300"
                >
                  Email Address
                </label>
                <input
                  id="support-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
                  }}
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? "support-email-err" : undefined}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/15 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-sky-400/70"
                />
                {errors.email && (
                  <p id="support-email-err" className="text-xs text-red-300">
                    {errors.email}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="support-topic"
                  className="block text-xs font-medium text-zinc-300"
                >
                  Topic
                </label>
                <select
                  id="support-topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#0B0C11] border border-white/15 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-400/70"
                >
                  <option value="General Question">General Question</option>
                  <option value="APK Installation & Updates">
                    APK Installation &amp; Updates
                  </option>
                  <option value="NOVA PRO & Licensing">
                    NOVA PRO &amp; Licensing
                  </option>
                  <option value="Audio Bug Report">Audio Bug Report</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="support-message"
                  className="block text-xs font-medium text-zinc-300"
                >
                  Message
                </label>
                <textarea
                  id="support-message"
                  rows={4}
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    if (errors.message) {
                      setErrors((p) => ({ ...p, message: undefined }));
                    }
                  }}
                  aria-invalid={Boolean(errors.message)}
                  aria-describedby={
                    errors.message ? "support-message-err" : undefined
                  }
                  placeholder="Describe your question, Android version, or device details..."
                  className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/15 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-sky-400/70 resize-y"
                />
                {errors.message && (
                  <p id="support-message-err" className="text-xs text-red-300">
                    {errors.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSending}
                className="liquid-button-primary w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-semibold transition-transform hover:-translate-y-0.5 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
              >
                <Send className="w-4 h-4" />
                <span>{isSending ? "Sending..." : "Submit Inquiry"}</span>
              </button>
            </form>

            {submitState && (
              <div
                role="status"
                className={`rounded-2xl p-4 text-xs leading-relaxed border space-y-3 ${
                  submitState.type === "sent"
                    ? "bg-emerald-500/10 border-emerald-400/25 text-emerald-200"
                    : submitState.type === "error"
                    ? "bg-red-500/10 border-red-400/25 text-red-200"
                    : "bg-sky-400/10 border-sky-300/20 text-zinc-200"
                }`}
              >
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>{submitState.text}</p>
                </div>

                {submitState.type === "unconfigured" && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleCopyFormattedInquiry}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white font-medium transition-colors"
                    >
                      {copiedInquiry ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-sky-300" />
                          <span>Copied Inquiry</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Formatted Message</span>
                        </>
                      )}
                    </button>

                    {siteConfig.support.supportEmail && (
                      <a
                        href={`mailto:${siteConfig.support.supportEmail}?subject=${encodeURIComponent(
                          `[NOVA MUSIC] ${topic}`
                        )}&body=${encodeURIComponent(
                          `From: ${name.trim()} (${email.trim()})\n\n${message.trim()}`
                        )}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-zinc-950 font-medium transition-colors"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>Open Email App</span>
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>
        </ScrollReveal>
      </div>

      <div className="mt-10">
        <ContactDeveloperSection compact />
      </div>
    </div>
  );
};
