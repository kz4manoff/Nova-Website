import React, { useState } from "react";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { NovaLogo } from "./NovaLogo";
import type { AppRoute } from "../types/navigation";

interface NavbarProps {
  activeRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
}

const navItems: { route: AppRoute; label: string }[] = [
  { route: "home", label: "Home" },
  { route: "features", label: "Features" },
  { route: "download", label: "Download" },
  { route: "pro", label: "NOVA PRO" },
  { route: "about", label: "About" },
];

export const Navbar: React.FC<NavbarProps> = ({ activeRoute, onNavigate }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLinkClick = (route: AppRoute) => {
    setMobileMenuOpen(false);
    onNavigate(route);
  };

  return (
    <header className="fixed top-0 inset-x-0 z-50 px-4 pt-3 md:pt-5 pointer-events-none">
      <div className="max-w-5xl mx-auto pointer-events-auto">
        <div className="liquid-glass-nav rounded-2xl px-4 md:px-6 h-14 md:h-16 flex items-center justify-between gap-4 md:gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              handleLinkClick("home");
            }}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 rounded-lg py-1 shrink-0"
            aria-label="NOVA MUSIC Home"
          >
            <NovaLogo size="sm" />
          </a>

          {/* Zone 2: Clean Desktop Navigation Links */}
          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-6 lg:gap-7"
          >
            {navItems.map((item) => {
              const isActive = activeRoute === item.route;
              return (
                <a
                  key={item.route}
                  href={item.route === "home" ? "/" : `/${item.route}`}
                  onClick={(e) => {
                    e.preventDefault();
                    handleLinkClick(item.route);
                  }}
                  aria-current={isActive ? "page" : undefined}
                  className={`relative py-2 text-sm font-medium whitespace-nowrap shrink-0 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 rounded-md ${
                    isActive
                      ? "text-white"
                      : "text-zinc-400 hover:text-zinc-100"
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <motion.span
                      layoutId="nav-active-indicator"
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 34,
                      }}
                      className="absolute left-0 right-0 -bottom-0.5 h-[2px] rounded-full bg-gradient-to-r from-sky-300/60 via-white to-sky-300/60"
                    />
                  )}
                </a>
              );
            })}
          </nav>

          {/* Zone 3: Single Primary Action + Mobile Menu Trigger */}
          <div className="flex items-center gap-2 shrink-0">
            <a
              href="/support"
              onClick={(e) => {
                e.preventDefault();
                handleLinkClick("support");
              }}
              aria-current={activeRoute === "support" ? "page" : undefined}
              className={`hidden md:inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 ${
                activeRoute === "support"
                  ? "bg-white text-zinc-950"
                  : "bg-white/10 hover:bg-white/15 text-white border border-white/15"
              }`}
            >
              Support
            </a>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-xl text-zinc-200 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.nav
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              aria-label="Mobile navigation"
              className="md:hidden mt-2 liquid-glass-nav rounded-2xl p-3 flex flex-col gap-1"
            >
              {[...navItems, { route: "support" as AppRoute, label: "Support & FAQ" }].map(
                (item) => {
                  const isActive = activeRoute === item.route;
                  return (
                    <a
                      key={item.route}
                      href={item.route === "home" ? "/" : `/${item.route}`}
                      onClick={(e) => {
                        e.preventDefault();
                        handleLinkClick(item.route);
                      }}
                      aria-current={isActive ? "page" : undefined}
                      className={`flex items-center justify-between px-4 min-h-[44px] rounded-xl text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-white/12 text-white"
                          : "text-zinc-300 hover:bg-white/6 hover:text-white"
                      }`}
                    >
                      <span>{item.label}</span>
                      {isActive && (
                        <span className="text-xs text-sky-300 font-normal">
                          Active
                        </span>
                      )}
                    </a>
                  );
                }
              )}
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
};
