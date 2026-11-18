import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, Check, Copy } from "lucide-react";
import { ScrollReveal } from "./ScrollReveal";
import { siteConfig } from "../config/siteConfig";

const INSTAGRAM_USERNAME = "@mohavmed.__";
const INSTAGRAM_PROFILE_URL =
  "https://www.instagram.com/mohavmed.__?gwpx=NHFtc2h4cXRjcGV6";
const INSTAGRAM_APP_URL = "instagram://user?username=mohavmed.__";
const DISCORD_USERNAME = "k4zman_.";

const InstagramIcon: React.FC<{ className?: string }> = ({
  className = "w-5 h-5",
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={className}
  >
    <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
    <circle cx="12" cy="12" r="4.2" />
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const DiscordIcon: React.FC<{ className?: string }> = ({
  className = "w-5 h-5",
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    className={className}
  >
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028ZM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418Zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418Z" />
  </svg>
);

interface ContactDeveloperSectionProps {
  compact?: boolean;
}

export const ContactDeveloperSection: React.FC<ContactDeveloperSectionProps> = ({
  compact = false,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [discordCopied, setDiscordCopied] = useState(false);
  const copyTimerRef = useRef<number | null>(null);
  const fallbackTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
      if (fallbackTimerRef.current) window.clearTimeout(fallbackTimerRef.current);
    };
  }, []);

  const handleInstagramClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (!isMobile) {
      // Desktop browsers follow the standard <a href={INSTAGRAM_PROFILE_URL} target="_blank">
      return;
    }

    e.preventDefault();

    let appOpened = false;
    const cancelFallback = () => {
      appOpened = true;
      if (fallbackTimerRef.current) {
        window.clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", cancelFallback);
    };
    const onVisibility = () => {
      if (document.hidden) cancelFallback();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", cancelFallback);

    window.location.href = INSTAGRAM_APP_URL;

    fallbackTimerRef.current = window.setTimeout(() => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", cancelFallback);
      if (!appOpened && !document.hidden) {
        window.location.href = INSTAGRAM_PROFILE_URL;
      }
    }, 750);
  };

  const handleCopyDiscord = async () => {
    let copied = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(DISCORD_USERNAME);
        copied = true;
      }
    } catch {
      copied = false;
    }

    if (!copied) {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = DISCORD_USERNAME;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        copied = document.execCommand("copy");
        document.body.removeChild(textarea);
      } catch {
        copied = false;
      }
    }

    if (copied) {
      setDiscordCopied(true);
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(() => {
        setDiscordCopied(false);
      }, 2600);
    }
  };

  return (
    <ScrollReveal>
      <section
        aria-labelledby="contact-developer-heading"
        className={`liquid-glass rounded-3xl ${
          compact ? "p-6 sm:p-8" : "p-8 md:p-10"
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-2.5 max-w-xl">
            <p className="text-xs font-medium text-sky-300 tracking-wide">
              Contact Developer
            </p>
            <h2
              id="contact-developer-heading"
              className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-white"
            >
              Connect directly with {siteConfig.brand.developer}.
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Have feedback, feature ideas, or audio questions? Reach out on
              Instagram or copy my Discord username below.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full lg:w-auto lg:min-w-[440px] shrink-0">
            {/* Instagram Social Button */}
            <motion.a
              href={INSTAGRAM_PROFILE_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleInstagramClick}
              whileHover={shouldReduceMotion ? undefined : { y: -2, scale: 1.01 }}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.985 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="group relative rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/15 hover:border-white/25 p-4 flex items-center justify-between gap-3.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-white/15 to-white/[0.04] border border-white/15 flex items-center justify-center text-white shrink-0 group-hover:border-sky-300/40 transition-colors">
                  <InstagramIcon className="w-5 h-5" />
                </span>
                <div className="min-w-0">
                  <span className="block text-xs text-zinc-400 font-medium">
                    Instagram
                  </span>
                  <span className="block font-mono text-sm font-medium text-white truncate">
                    {INSTAGRAM_USERNAME}
                  </span>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-zinc-400 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
            </motion.a>

            {/* Discord Copy Button */}
            <div className="relative">
              <motion.button
                type="button"
                onClick={() => void handleCopyDiscord()}
                whileHover={shouldReduceMotion ? undefined : { y: -2, scale: 1.01 }}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.985 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="group w-full rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/15 hover:border-white/25 p-4 flex items-center justify-between gap-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-400/20 to-white/[0.04] border border-white/15 flex items-center justify-center text-white shrink-0 group-hover:border-sky-300/40 transition-colors">
                    <DiscordIcon className="w-5 h-5" />
                  </span>
                  <div className="min-w-0">
                    <span className="block text-xs text-zinc-400 font-medium">
                      Discord
                    </span>
                    <span className="block font-mono text-sm font-medium text-white truncate">
                      {DISCORD_USERNAME}
                    </span>
                  </div>
                </div>
                {discordCopied ? (
                  <Check className="w-4 h-4 text-emerald-300 shrink-0" />
                ) : (
                  <Copy className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors shrink-0" />
                )}
              </motion.button>

              <AnimatePresence>
                {discordCopied && (
                  <motion.div
                    role="status"
                    aria-live="polite"
                    initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
                    transition={{ duration: 0.18 }}
                    className="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-300 px-1"
                  >
                    <Check className="w-3.5 h-3.5 shrink-0" />
                    <span>Discord username copied!</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>
    </ScrollReveal>
  );
};
