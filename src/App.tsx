import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { HomePage } from "./pages/HomePage";
import { FeaturesPage } from "./pages/FeaturesPage";
import { DownloadPage } from "./pages/DownloadPage";
import { ProPage } from "./pages/ProPage";
import { AboutPage } from "./pages/AboutPage";
import { SupportPage } from "./pages/SupportPage";
import { applyPageSeo } from "./utils/seo";
import { pathToRoute, routeToPath, type AppRoute } from "./types/navigation";

const seoByRoute: Record<
  AppRoute,
  { title: string; description: string }
> = {
  home: {
    title: "NOVA MUSIC — Your Music. Your Universe.",
    description:
      "Experience music in a completely new way with NOVA MUSIC. A minimalist Android music player featuring a smooth Liquid Glass interface and local lossless playback.",
  },
  features: {
    title: "Features — NOVA MUSIC Android Music Player",
    description:
      "Explore NOVA MUSIC's Liquid Glass design system, smart local music library, multi-band audio controls, headphone detection, and playback gestures.",
  },
  download: {
    title: "Download NOVA MUSIC APK for Android",
    description:
      "Get the official NOVA MUSIC Android APK release, version details, SHA-256 checksum verification, changelog, and installation guide.",
  },
  pro: {
    title: "NOVA MUSIC PRO — Unlock the Full Experience",
    description:
      "Upgrade to NOVA PRO for 49 DH Lifetime Access: premium dark themes, exclusive Liquid Glass effects, acoustic visualizer, and on-device listening statistics.",
  },
  about: {
    title: "About NOVA MUSIC — Story & Developer",
    description:
      "Learn about the story and mission behind NOVA MUSIC, crafted independently for Android by kz4man, Mohamed.",
  },
  support: {
    title: "Support & FAQ — NOVA MUSIC",
    description:
      "Find answers on installing the NOVA MUSIC APK, updating versions, Android compatibility, NOVA PRO restoration, and direct support.",
  },
};

export default function App() {
  const shouldReduceMotion = useReducedMotion();
  const [activeRoute, setActiveRoute] = useState<AppRoute>(() =>
    pathToRoute(window.location.pathname)
  );

  const navigate = useCallback((route: AppRoute) => {
    const nextPath = routeToPath[route];
    if (window.location.pathname !== nextPath) {
      window.history.pushState({ route }, "", nextPath);
    }
    setActiveRoute(route);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setActiveRoute(pathToRoute(window.location.pathname));
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    const meta = seoByRoute[activeRoute];
    applyPageSeo({
      title: meta.title,
      description: meta.description,
      path: routeToPath[activeRoute],
    });
  }, [activeRoute]);

  const renderPage = () => {
    switch (activeRoute) {
      case "home":
        return <HomePage onNavigate={navigate} />;
      case "features":
        return <FeaturesPage onNavigate={navigate} />;
      case "download":
        return <DownloadPage onNavigate={navigate} />;
      case "pro":
        return <ProPage onNavigate={navigate} />;
      case "about":
        return <AboutPage onNavigate={navigate} />;
      case "support":
        return <SupportPage />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#050507] text-[#F4F6FB]">
      <Navbar activeRoute={activeRoute} onNavigate={navigate} />

      <div className="flex-1">
        <AnimatePresence mode="wait">
          <motion.main
            key={activeRoute}
            initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          >
            {renderPage()}
          </motion.main>
        </AnimatePresence>
      </div>

      <Footer onNavigate={navigate} />
    </div>
  );
}
