import React from "react";
import { NovaLogo } from "./NovaLogo";
import { siteConfig } from "../config/siteConfig";
import type { AppRoute } from "../types/navigation";

interface FooterProps {
  onNavigate: (route: AppRoute) => void;
}

const footerLinks: { route: AppRoute; label: string }[] = [
  { route: "home", label: "Home" },
  { route: "features", label: "Features" },
  { route: "download", label: "Download" },
  { route: "pro", label: "NOVA PRO" },
  { route: "about", label: "About" },
  { route: "support", label: "Support & FAQ" },
];

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="border-t border-white/[0.07] bg-[#040406] mt-24">
      <div className="max-w-6xl mx-auto px-6 py-14">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 pb-10 border-b border-white/[0.06]">
          <div className="space-y-3 max-w-sm">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                onNavigate("home");
              }}
              className="inline-block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 rounded-lg"
            >
              <NovaLogo size="sm" />
            </a>
            <p className="text-sm text-zinc-400 leading-relaxed">
              {siteConfig.brand.heroDescription} Crafted for Android with a
              focus on local audio clarity and Liquid Glass calm.
            </p>
          </div>

          <nav
            aria-label="Footer navigation"
            className="flex flex-wrap items-center gap-x-7 gap-y-3"
          >
            {footerLinks.map((link) => (
              <a
                key={link.route}
                href={link.route === "home" ? "/" : `/${link.route}`}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(link.route);
                }}
                className="text-sm text-zinc-400 hover:text-white transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 rounded"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-zinc-500">
          <p>{siteConfig.brand.copyright}</p>
          <p>
            Designed &amp; Engineered by{" "}
            <span className="text-zinc-300 font-medium">
              {siteConfig.brand.developer}
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
};
