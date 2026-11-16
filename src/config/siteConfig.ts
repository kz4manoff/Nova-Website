export interface ReleaseChangelogEntry {
  version: string;
  date: string;
  highlights: string[];
}

export interface AppScreenshot {
  id: string;
  title: string;
  caption: string;
  src: string;
}

export interface SiteConfig {
  brand: {
    name: string;
    heroHeadline: string;
    heroDescription: string;
    developer: string;
    copyright: string;
    siteUrl: string;
  };
  release: {
    /**
     * Optional static override URL; live release URLs are fetched dynamically from /update.json
     * and verified against official GitHub Releases.
     */
    apkUrl: string | null;
    /** e.g. "1.0.0" — keep null until the release build is published. */
    version: string | null;
    /** e.g. "18.4 MB" — keep null until the APK size is measured. */
    fileSize: string | null;
    /** e.g. "November 2026" — keep null until released. */
    releaseDate: string | null;
    /** e.g. "Android 10 (API 29) or higher" — keep null until finalized. */
    minAndroidVersion: string | null;
    /** Official SHA-256 checksum of the release APK — keep null until generated. */
    sha256: string | null;
    /** List of published release notes. Add entries here as versions ship. */
    changelog: ReleaseChangelogEntry[];
  };
  pro: {
    headline: string;
    priceAmount: number;
    currencyLabel: string;
    currencyIso: "MAD" | "USD" | "EUR";
    billingLabel: string;
    paymentProvider: {
      /**
       * Flip to `true` ONLY when your server-side payment gateway credentials
       * (e.g., CMI, Payzone, Stripe, or Lemon Squeezy) are deployed and verified.
       * Never place secret API keys in this frontend file.
       */
      configured: boolean;
      providerDisplayName: string;
      createCheckoutEndpoint: string;
      verifyPaymentEndpoint: string;
      restoreAccessEndpoint: string;
    };
  };
  support: {
    /**
     * Optional real backend or form endpoint (e.g. "/api/contact" or Formspree endpoint).
     * Keep `null` if no email relay is connected yet; the UI will never pretend a message was sent.
     */
    formEndpoint: string | null;
    /**
     * Optional public support email address (e.g. "support@novamusic.app").
     * Used for mailto fallback when configured. Keep `null` if not yet published.
     */
    supportEmail: string | null;
  };
  screenshots: {
    /**
     * Add real application screenshots once captured (e.g. "/screenshots/player.png").
     * When empty, the Features page showcases interactive Liquid Glass interface previews.
     */
    items: AppScreenshot[];
  };
}

export const siteConfig: SiteConfig = {
  brand: {
    name: "NOVA MUSIC",
    heroHeadline: "Your Music. Your Universe.",
    heroDescription: "Experience music in a completely new way.",
    developer: "kz4man, Mohamed",
    copyright: "© 2026 kz4man, Mohamed. All Rights Reserved.",
    siteUrl: "https://novamusic.app",
  },
  release: {
    apkUrl: null,
    version: null,
    fileSize: null,
    releaseDate: null,
    minAndroidVersion: null,
    sha256: null,
    changelog: [],
  },
  pro: {
    headline: "Unlock the Full Experience.",
    priceAmount: 49,
    currencyLabel: "DH",
    currencyIso: "MAD",
    billingLabel: "Lifetime Access",
    paymentProvider: {
      configured: false,
      providerDisplayName: "Morocco Payment Gateway (CMI / Payzone)",
      createCheckoutEndpoint: "/api/payments/create-checkout",
      verifyPaymentEndpoint: "/api/payments/verify",
      restoreAccessEndpoint: "/api/payments/restore",
    },
  },
  support: {
    formEndpoint: null,
    supportEmail: null,
  },
  screenshots: {
    items: [
      {
        id: "now-playing",
        title: "Now Playing",
        caption:
          "Immersive artwork backdrop with sample rate readout, lyrics shortcut, output switcher, and Liquid Glass playback controls.",
        src: "/assets/aistudio/image_0a86aad6.png",
      },
      {
        id: "listen-now",
        title: "Listen Now",
        caption:
          "Hi-Res Audio home screen with quick search, active track card, Featured Albums, Recently Played, and floating glass dock.",
        src: "/assets/aistudio/image_342f776f.png",
      },
      {
        id: "library",
        title: "Smart Library",
        caption:
          "Organize tracks across Songs, Albums, Artists, Folders, and Genres with instant Play and Shuffle controls.",
        src: "/assets/aistudio/image_d7ba7179.png",
      },
    ],
  },
};

export const officialLogoSrc = "/assets/aistudio/icon_771c1cd1.png";

