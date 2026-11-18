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
    title: "NOVA MUSIC — Your Music, Your Experience",
    description:
      "Discover NOVA MUSIC, a modern music player designed for a premium listening experience. Explore music, enjoy powerful audio features and download the latest version.",
  },
  features: {
    title: "Features — NOVA MUSIC Android Music Player",
    description:
      "Explore NOVA MUSIC features: smooth Liquid Glass UI, smart local library organization, multi-band audio controls, headphone detection, and playback gestures.",
  },
  download: {
    title: "Download NOVA MUSIC APK for Android",
    description:
      "Download the official NOVA MUSIC APK for Android directly from GitHub Releases. View latest version details, SHA-256 checksum verification, and install steps.",
  },
  pro: {
    title: "NOVA MUSIC PRO — Lifetime Audio Experience",
    description:
      "Explore NOVA MUSIC PRO features including premium dark themes, exclusive Liquid Glass effects, acoustic visualizer, and on-device listening insights.",
  },
  about: {
    title: "About NOVA MUSIC — Design & Developer Story",
    description:
      "Learn about the vision and minimalist engineering behind NOVA MUSIC, an independent Android music player crafted by kz4man, Mohamed.",
  },
  support: {
    title: "Support & FAQ — NOVA MUSIC Android App",
    description:
      "Find answers on installing the NOVA MUSIC Android APK, automatic in-app updates, device compatibility, and direct support options.",
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
