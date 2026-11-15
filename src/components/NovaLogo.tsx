import React from "react";
import { officialLogoSrc } from "../config/siteConfig";

interface NovaLogoProps {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
}

export const NovaLogo: React.FC<NovaLogoProps> = ({
  size = "md",
  showWordmark = true,
}) => {
  const iconDimensions =
    size === "lg"
      ? "w-14 h-14 rounded-2xl"
      : size === "sm"
      ? "w-8 h-8 rounded-[10px]"
      : "w-9 h-9 rounded-xl";

  const textSize =
    size === "lg"
      ? "text-lg tracking-[0.14em]"
      : size === "sm"
      ? "text-sm tracking-[0.12em]"
      : "text-sm md:text-base tracking-[0.14em]";

  return (
    <span className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 select-none">
      <span
        className={`relative overflow-hidden border border-white/20 bg-black shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_8px_20px_-6px_rgba(0,0,0,0.85)] shrink-0 ${iconDimensions}`}
      >
        <img
          src={officialLogoSrc}
          alt="NOVA MUSIC icon"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover scale-[1.08]"
        />
      </span>

      {showWordmark && (
        <span
          className={`font-display font-semibold text-white uppercase whitespace-nowrap shrink-0 ${textSize}`}
        >
          NOVA MUSIC
        </span>
      )}
    </span>
  );
};
