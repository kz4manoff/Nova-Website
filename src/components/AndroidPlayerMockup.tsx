import React, { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Disc3, Home, Library } from "lucide-react";
import { siteConfig } from "../config/siteConfig";

const screenIcons = {
  "now-playing": Disc3,
  "listen-now": Home,
  library: Library,
} as const;

export const AndroidPlayerMockup: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();
  const screens = siteConfig.screenshots.items;
  const [activeIndex, setActiveIndex] = useState(0);

  const activeScreen = screens[activeIndex] ?? screens[0];

  if (!activeScreen) {
    return null;
  }

  return (
    <div className="relative mx-auto w-full max-w-[332px] select-none">
      {/* Subtle Ambient Aura Behind Android Frame */}
      <div
        aria-hidden="true"
        className="absolute -inset-6 rounded-[52px] bg-gradient-to-b from-amber-500/10 via-sky-400/10 to-transparent blur-2xl pointer-events-none"
      />

      {/* Screen Switcher Controls */}
      <div
        role="tablist"
        aria-label="NOVA MUSIC app screen switcher"
        className="relative z-10 mb-4 grid grid-cols-3 gap-1 p-1 rounded-2xl liquid-glass-subtle"
      >
        {screens.map((screen, index) => {
          const isSelected = index === activeIndex;
          const Icon =
            screenIcons[screen.id as keyof typeof screenIcons] ?? Disc3;
          return (
            <button
              key={screen.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => setActiveIndex(index)}
              className={`py-2 px-2 rounded-xl text-[11px] font-medium whitespace-nowrap transition-all flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                isSelected
                  ? "bg-white text-zinc-950 shadow-sm"
                  : "text-zinc-300 hover:text-white hover:bg-white/[0.06]"
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{screen.title}</span>
            </button>
          );
        })}
      </div>

      {/* Floating Titanium Android Device Frame */}
      <motion.div
        animate={
          shouldReduceMotion
            ? undefined
            : {
                y: [0, -7, 0],
              }
        }
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="relative rounded-[44px] p-[9px] bg-gradient-to-b from-zinc-500/55 via-zinc-800/85 to-zinc-950 shadow-[0_38px_90px_-18px_rgba(0,0,0,0.95)] border border-white/15"
      >
        {/* Subtle Glass Specular Edge */}
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-[44px] pointer-events-none shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]"
        />

        {/* Real Android Screenshot Viewport */}
        <div className="relative rounded-[35px] overflow-hidden bg-[#0A0808] border border-white/10 aspect-[9/19.5]">
          <AnimatePresence mode="wait">
            <motion.img
              key={activeScreen.id}
              src={activeScreen.src}
              alt={`NOVA MUSIC Android app — ${activeScreen.title} screen`}
              referrerPolicy="no-referrer"
              initial={shouldReduceMotion ? false : { opacity: 0.2, scale: 0.985 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={shouldReduceMotion ? undefined : { opacity: 0.2, scale: 0.985 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="w-full h-full object-cover object-top"
            />
          </AnimatePresence>

          {/* Delicate Glass Reflection Overlay */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.03] to-white/[0.07] pointer-events-none"
          />
        </div>
      </motion.div>

      <p className="mt-4 text-center text-xs text-zinc-400 leading-relaxed px-2">
        {activeScreen.caption}
      </p>
    </div>
  );
};
