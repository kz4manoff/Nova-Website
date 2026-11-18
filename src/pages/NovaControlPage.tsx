import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Link2,
  Lock,
  LogOut,
  RefreshCw,
  Send,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trash2,
} from "lucide-react";
import { officialLogoSrc } from "../config/siteConfig";
import { NovaLogo } from "../components/NovaLogo";
import {
  authenticateBroadcastAdmin,
  fetchBroadcastOverview,
  fetchBroadcastSession,
  logoutBroadcastAdmin,
  saveAdminTestDeviceToken,
  sendBroadcastNotification,
  type BroadcastConfigStatus,
  type BroadcastOverviewResponse,
} from "../services/broadcastService";

const DEEP_LINK_PRESETS = [
  { label: "Home", value: "novamusic://home" },
  { label: "Library", value: "novamusic://library" },
  { label: "Update", value: "novamusic://download" },
  { label: "NOVA PRO", value: "novamusic://pro" },
] as const;

function formatTimeRemaining(expiresAtMs: number | null): string {
  if (!expiresAtMs) return "";
  const diffSec = Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000));
  const hrs = Math.floor(diffSec / 3600);
  const mins = Math.floor((diffSec % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m remaining`;
  return `${mins}m remaining`;
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export const NovaControlPage: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();

  // Session & Authentication state
  const [checkingSession, setCheckingSession] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [configStatus, setConfigStatus] = useState<BroadcastConfigStatus | null>(
    null
  );
  const [sessionError, setSessionError] = useState<string | null>(null);

  const [secretCode, setSecretCode] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Dashboard Overview state
  const [overview, setOverview] = useState<BroadcastOverviewResponse | null>(
    null
  );
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  // Compose Notification state
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [deepLink, setDeepLink] = useState("");
  const [previewExpanded, setPreviewExpanded] = useState(true);
  const [previewImageError, setPreviewImageError] = useState(false);

  // Test device registration
  const [testTokenInput, setTestTokenInput] = useState("");
  const [savingTestToken, setSavingTestToken] = useState(false);
  const [testTokenFeedback, setTestTokenFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Send broadcast state
  const [confirmBroadcastAll, setConfirmBroadcastAll] = useState(false);
  const [isSending, setIsSending] = useState<"test" | "all" | null>(null);
  const [sendFeedback, setSendFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const loadOverview = useCallback(async () => {
    setLoadingOverview(true);
    setOverviewError(null);
    try {
      const data = await fetchBroadcastOverview();
      setOverview(data);
      setConfigStatus(data.config);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Unable to load NOVA BROADCAST overview.";
      if (msg.toLowerCase().includes("unauthorized")) {
        setAuthenticated(false);
        setExpiresAt(null);
      } else {
        setOverviewError(msg);
      }
    } finally {
      setLoadingOverview(false);
    }
  }, []);

  const checkSession = useCallback(async () => {
    setCheckingSession(true);
    setSessionError(null);
    try {
      const state = await fetchBroadcastSession();
      setAuthenticated(state.authenticated);
      setExpiresAt(state.expiresAt);
      setConfigStatus(state.config);
      if (state.authenticated) {
        await loadOverview();
      }
    } catch (err) {
      setSessionError(
        err instanceof Error
          ? err.message
          : "Unable to reach NOVA BROADCAST authentication API."
      );
    } finally {
      setCheckingSession(false);
    }
  }, [loadOverview]);

  useEffect(() => {
    void checkSession();
  }, [checkSession]);

  // Auto-lock UI when server session expires
  useEffect(() => {
    if (!authenticated || !expiresAt) return;
    const msLeft = expiresAt - Date.now();
    if (msLeft <= 0) {
      setAuthenticated(false);
      setExpiresAt(null);
      return;
    }
    const timer = window.setTimeout(() => {
      setAuthenticated(false);
      setExpiresAt(null);
      setAuthError("Admin session expired. Please authenticate again.");
    }, msLeft);
    return () => window.clearTimeout(timer);
  }, [authenticated, expiresAt]);

  useEffect(() => {
    setPreviewImageError(false);
  }, [imageUrl]);

  const handleAuthenticate = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!secretCode.trim()) {
      setAuthError("Enter the server-configured NOVA BROADCAST secret code.");
      return;
    }

    setIsAuthenticating(true);
    try {
      const result = await authenticateBroadcastAdmin(secretCode.trim());
      if (result.authenticated) {
        setAuthenticated(true);
        setExpiresAt(result.expiresAt);
        setSecretCode("");
        await loadOverview();
      }
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : "Authentication failed."
      );
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = async () => {
    await logoutBroadcastAdmin().catch(() => undefined);
    setAuthenticated(false);
    setExpiresAt(null);
    setOverview(null);
    setConfirmBroadcastAll(false);
    setSendFeedback(null);
  };

  const handleSaveTestDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestTokenFeedback(null);
    if (!testTokenInput.trim()) {
      setTestTokenFeedback({
        type: "error",
        text: "Paste an Android FCM registration token first.",
      });
      return;
    }

    setSavingTestToken(true);
    try {
      const res = await saveAdminTestDeviceToken(testTokenInput.trim());
      setTestTokenInput("");
      setTestTokenFeedback({
        type: "success",
        text: `Admin test device registered (${res.maskedToken}).`,
      });
      await loadOverview();
    } catch (err) {
      setTestTokenFeedback({
        type: "error",
        text:
          err instanceof Error
            ? err.message
            : "Failed to save admin test device.",
      });
    } finally {
      setSavingTestToken(false);
    }
  };

  const handleSend = async (mode: "test" | "all") => {
    setSendFeedback(null);

    if (!title.trim() || !message.trim()) {
      setSendFeedback({
        type: "error",
        text: "Both notification title and message are required.",
      });
      return;
    }

    if (mode === "all" && !confirmBroadcastAll) {
      setConfirmBroadcastAll(true);
      return;
    }

    setIsSending(mode);
    setConfirmBroadcastAll(false);

    const idempotencyKey =
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    try {
      const result = await sendBroadcastNotification({
        title: title.trim(),
        message: message.trim(),
        imageUrl: imageUrl.trim() || undefined,
        deepLink: deepLink.trim() || undefined,
        mode,
        testToken:
          mode === "test" && testTokenInput.trim()
            ? testTokenInput.trim()
            : undefined,
        idempotencyKey,
      });

      const b = result.broadcast;
      setSendFeedback({
        type: b.status === "failed" ? "error" : "success",
        text:
          b.status === "failed"
            ? `Delivery failed for all ${b.targetedCount} target(s). ${
                b.errorSummary ?? ""
              }`
            : `Notification ${
                mode === "test" ? "sent to test device" : "broadcasted"
              }: ${b.successCount} delivered of ${b.targetedCount} targeted${
                b.invalidTokensRemoved > 0
                  ? ` (${b.invalidTokensRemoved} invalid token(s) cleaned)`
                  : ""
              }.`,
      });

      if (mode === "all" && b.successCount > 0) {
        setTitle("");
        setMessage("");
        setImageUrl("");
        setDeepLink("");
      }

      await loadOverview();
    } catch (err) {
      setSendFeedback({
        type: "error",
        text:
          err instanceof Error
            ? err.message
            : "Unable to send notification.",
      });
    } finally {
      setIsSending(null);
    }
  };

  const sessionRemainingLabel = useMemo(
    () => formatTimeRemaining(expiresAt),
    [expiresAt]
  );

  // Loading initial session check
  if (checkingSession) {
    return (
      <div className="pt-32 pb-24 max-w-md mx-auto px-6">
        <div className="liquid-glass rounded-3xl p-8 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-sky-300" />
          </div>
          <p className="text-sm text-zinc-300">
            Verifying NOVA STUDIO session...
          </p>
        </div>
      </div>
    );
  }

  // Unauthenticated Secret Code Gate
  if (!authenticated) {
    const missingAuthVars: string[] = [];
    if (configStatus && !configStatus.adminCodeConfigured) {
      missingAuthVars.push("NOVA_BROADCAST_ADMIN_CODE");
    }
    if (configStatus && !configStatus.sessionSecretConfigured) {
      missingAuthVars.push("NOVA_BROADCAST_SESSION_SECRET");
    }
    const authConfigMissing = missingAuthVars.length > 0;

    return (
      <div className="pt-28 md:pt-36 pb-20 max-w-lg mx-auto px-6">
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="liquid-glass glass-specular rounded-3xl p-7 sm:p-9 space-y-7"
        >
          <div className="flex items-center justify-between gap-4">
            <NovaLogo size="sm" />
            <span className="inline-flex items-center gap-1.5 text-xs font-mono text-sky-300">
              <Lock className="w-3.5 h-3.5" />
              <span>NOVA STUDIO</span>
            </span>
          </div>

          <div className="space-y-2">
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-white tracking-tight">
              NOVA BROADCAST
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Restricted Android push notification control center. Enter your
              server-verified admin secret code to authenticate this session.
            </p>
          </div>

          {sessionError && (
            <div
              role="alert"
              className="rounded-2xl bg-amber-500/10 border border-amber-400/25 p-4 flex items-start gap-3 text-xs text-amber-200 leading-relaxed"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-300" />
              <p>{sessionError}</p>
            </div>
          )}

          {authConfigMissing && (
            <div
              role="alert"
              className="rounded-2xl bg-red-500/10 border border-red-400/30 p-4 flex items-start gap-3 text-xs text-red-100 leading-relaxed"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-300" />
              <div className="space-y-1.5">
                <p className="font-semibold text-white">
                  Server Authentication Configuration Error
                </p>
                <p className="text-red-200/90">
                  Authentication is disabled until the required server-side
                  secret variable(s) are configured in Cloudflare Pages →
                  Settings → Environment Variables:
                </p>
                <ul className="space-y-1 pt-0.5 font-mono text-[11px] text-white">
                  {!configStatus?.adminCodeConfigured && (
                    <li>
                      • NOVA_BROADCAST_ADMIN_CODE (personal admin login code)
                    </li>
                  )}
                  {!configStatus?.sessionSecretConfigured && (
                    <li>
                      • NOVA_BROADCAST_SESSION_SECRET (HMAC key for signing
                      HttpOnly session cookies)
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}

          <form onSubmit={(e) => void handleAuthenticate(e)} className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="nova-secret-code"
                className="block text-xs font-medium text-zinc-300"
              >
                Admin Secret Code
              </label>
              <div className="relative">
                <input
                  id="nova-secret-code"
                  type={showSecret ? "text" : "password"}
                  autoComplete="current-password"
                  value={secretCode}
                  onChange={(e) => setSecretCode(e.target.value)}
                  disabled={authConfigMissing}
                  placeholder={
                    authConfigMissing
                      ? "Configure server secrets before unlocking"
                      : "Enter admin secret code"
                  }
                  className="w-full pl-4 pr-11 py-3.5 rounded-2xl bg-black/45 border border-white/15 text-sm text-white font-mono placeholder:font-sans placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-sky-400/70 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret((prev) => !prev)}
                  aria-label={showSecret ? "Hide secret code" : "Show secret code"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-zinc-400 hover:text-white transition-colors"
                >
                  {showSecret ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {authError && (
              <div
                role="alert"
                className="rounded-2xl bg-red-500/10 border border-red-400/25 p-3.5 flex items-start gap-2.5 text-xs text-red-200 leading-relaxed"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-300" />
                <p>{authError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isAuthenticating || authConfigMissing}
              className="liquid-button-primary w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-semibold transition-transform hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>
                {authConfigMissing
                  ? "Server Configuration Required"
                  : isAuthenticating
                  ? "Verifying..."
                  : "Unlock NOVA BROADCAST"}
              </span>
            </button>
          </form>

          <p className="text-[11px] text-zinc-500 leading-relaxed">
            Validated server-side with constant-time comparison, brute-force
            rate limiting, and signed HttpOnly session cookies.
          </p>
        </motion.div>
      </div>
    );
  }

  const stats = overview?.stats;
  const activeConfig = overview?.config ?? configStatus;

  return (
    <div className="pt-28 md:pt-32 pb-16 max-w-6xl mx-auto px-6 space-y-8">
      {/* Control Center Header */}
      <div className="liquid-glass rounded-3xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3 text-xs text-sky-300 font-medium">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>NOVA STUDIO · Internal Control Center</span>
            {sessionRemainingLabel && (
              <>
                <span aria-hidden="true" className="text-zinc-600">
                  ·
                </span>
                <span className="font-mono text-zinc-400">
                  {sessionRemainingLabel}
                </span>
              </>
            )}
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-white tracking-tight">
            NOVA BROADCAST
          </h1>
          <p className="text-sm text-zinc-400 max-w-2xl">
            Manage registered Android devices and deliver real-time system
            notifications via Firebase Cloud Messaging HTTP v1.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => void loadOverview()}
            disabled={loadingOverview}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.13] border border-white/15 text-xs font-medium text-white transition-colors disabled:opacity-60 whitespace-nowrap shrink-0"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-sky-300 ${
                loadingOverview ? "animate-spin" : ""
              }`}
            />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => void handleLogout()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-400/25 text-xs font-medium text-red-200 transition-colors whitespace-nowrap shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Lock &amp; Logout</span>
          </button>
        </div>
      </div>

      {/* Server Readiness Banner */}
      {activeConfig && activeConfig.missing.length > 0 && (
        <div
          role="status"
          className="rounded-3xl bg-amber-500/10 border border-amber-400/25 p-6 space-y-3"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
            <div className="space-y-1.5 text-xs text-amber-100 leading-relaxed">
              <p className="text-sm font-semibold text-white">
                Backend Configuration Incomplete
              </p>
              <p className="text-amber-200/90">
                Real FCM delivery and persistent token storage require the
                following Cloudflare Pages bindings / environment variables:
              </p>
              <ul className="space-y-1 pt-1 font-mono text-[11px] text-amber-100">
                {activeConfig.missing.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {overviewError && (
        <div
          role="alert"
          className="rounded-2xl bg-red-500/10 border border-red-400/25 p-4 flex items-start gap-3 text-xs text-red-200"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-300" />
          <p>{overviewError}</p>
        </div>
      )}

      {/* Overview Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="liquid-glass-subtle rounded-2xl p-6 space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Registered Devices</span>
            <Smartphone className="w-4 h-4 text-sky-300" />
          </div>
          <p className="font-display text-3xl font-semibold text-white tabular-nums">
            {stats ? stats.activeDevices.toLocaleString() : "—"}
          </p>
          <p className="text-xs text-zinc-500 tabular-nums">
            {stats
              ? `${stats.adminTestDevices} admin test device(s)`
              : "Loading registry..."}
          </p>
        </div>

        <div className="liquid-glass-subtle rounded-2xl p-6 space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Notifications Sent</span>
            <Send className="w-4 h-4 text-emerald-300" />
          </div>
          <p className="font-display text-3xl font-semibold text-white tabular-nums">
            {stats ? stats.totalDelivered.toLocaleString() : "—"}
          </p>
          <p className="text-xs text-zinc-500 tabular-nums">
            {stats
              ? `${stats.totalFailed} failed delivery attempt(s)`
              : "Loading metrics..."}
          </p>
        </div>

        <div className="liquid-glass-subtle rounded-2xl p-6 space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Recent Broadcasts</span>
            <Bell className="w-4 h-4 text-sky-300" />
          </div>
          <p className="font-display text-3xl font-semibold text-white tabular-nums">
            {stats ? stats.totalBroadcasts.toLocaleString() : "—"}
          </p>
          <p className="text-xs text-zinc-500">
            {activeConfig?.fcmConfigured
              ? "FCM HTTP v1 connected"
              : "Waiting for FCM credentials"}
          </p>
        </div>

        <div className="liquid-glass-subtle rounded-2xl p-6 space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Tokens Auto-Cleaned</span>
            <Trash2 className="w-4 h-4 text-zinc-300" />
          </div>
          <p className="font-display text-3xl font-semibold text-white tabular-nums">
            {stats ? stats.invalidTokensRemoved.toLocaleString() : "—"}
          </p>
          <p className="text-xs text-zinc-500">
            Invalid / uninstalled tokens removed
          </p>
        </div>
      </div>

      {/* Main Workspace: Compose Notification + Live Android Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Compose Column */}
        <section className="lg:col-span-7 liquid-glass rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="space-y-1">
            <h2 className="font-display text-xl sm:text-2xl font-semibold text-white">
              Compose Notification
            </h2>
            <p className="text-xs text-zinc-400">
              Deliver announcements, new APK release alerts, or curated listening
              notes directly to NOVA MUSIC on Android.
            </p>
          </div>

          <div className="space-y-4">
            {/* Title */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label
                  htmlFor="broadcast-title"
                  className="font-medium text-zinc-300"
                >
                  Notification Title
                </label>
                <span className="font-mono text-[11px] text-zinc-500 tabular-nums">
                  {title.length}/100
                </span>
              </div>
              <input
                id="broadcast-title"
                type="text"
                maxLength={100}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="NOVA MUSIC v1.1.5 is now available"
                className="w-full px-4 py-3 rounded-xl bg-black/45 border border-white/15 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-sky-400/70"
              />
            </div>

            {/* Message */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label
                  htmlFor="broadcast-message"
                  className="font-medium text-zinc-300"
                >
                  Notification Message
                </label>
                <span className="font-mono text-[11px] text-zinc-500 tabular-nums">
                  {message.length}/500
                </span>
              </div>
              <textarea
                id="broadcast-message"
                rows={4}
                maxLength={500}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Update now for smoother Liquid Glass transitions and audio engine refinements."
                className="w-full px-4 py-3 rounded-xl bg-black/45 border border-white/15 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-sky-400/70 resize-y"
              />
            </div>

            {/* Image URL & Deep Link */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="broadcast-image"
                  className="flex items-center gap-1.5 text-xs font-medium text-zinc-300"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-sky-300" />
                  <span>Optional Image URL</span>
                </label>
                <input
                  id="broadcast-image"
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://nova-website-1tg.pages.dev/..."
                  className="w-full px-4 py-3 rounded-xl bg-black/45 border border-white/15 text-xs text-white font-mono placeholder:font-sans placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-sky-400/70"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="broadcast-deeplink"
                  className="flex items-center gap-1.5 text-xs font-medium text-zinc-300"
                >
                  <Link2 className="w-3.5 h-3.5 text-sky-300" />
                  <span>Optional Deep Link</span>
                </label>
                <input
                  id="broadcast-deeplink"
                  type="text"
                  value={deepLink}
                  onChange={(e) => setDeepLink(e.target.value)}
                  placeholder="novamusic://download"
                  className="w-full px-4 py-3 rounded-xl bg-black/45 border border-white/15 text-xs text-white font-mono placeholder:font-sans placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-sky-400/70"
                />
              </div>
            </div>

            {/* Deep link quick presets */}
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="text-zinc-500">Quick destination:</span>
              {DEEP_LINK_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setDeepLink(preset.value)}
                  className={`px-2.5 py-1 rounded-lg border transition-colors ${
                    deepLink === preset.value
                      ? "bg-white/15 border-white/25 text-white"
                      : "bg-white/[0.04] border-white/10 text-zinc-400 hover:text-white"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Feedback */}
          {sendFeedback && (
            <div
              role={sendFeedback.type === "error" ? "alert" : "status"}
              className={`rounded-2xl p-4 flex items-start gap-3 text-xs leading-relaxed border ${
                sendFeedback.type === "success"
                  ? "bg-emerald-500/10 border-emerald-400/25 text-emerald-200"
                  : "bg-red-500/10 border-red-400/25 text-red-200"
              }`}
            >
              {sendFeedback.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-300" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-300" />
              )}
              <p>{sendFeedback.text}</p>
            </div>
          )}

          {/* Two-step confirmation alert for All Devices */}
          {confirmBroadcastAll && (
            <div className="rounded-2xl bg-sky-400/10 border border-sky-300/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
              <p className="text-sky-100 leading-relaxed">
                Confirm sending this notification to{" "}
                <span className="font-semibold text-white">
                  all {stats?.activeDevices ?? 0} registered Android device(s)
                </span>
                ?
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setConfirmBroadcastAll(false)}
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-zinc-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleSend("all")}
                  className="px-4 py-2 rounded-xl bg-white text-zinc-950 font-semibold hover:bg-zinc-200"
                >
                  Confirm Broadcast
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            <button
              type="button"
              disabled={isSending !== null}
              onClick={() => {
                setConfirmBroadcastAll(false);
                void handleSend("test");
              }}
              className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 text-sm font-medium text-white whitespace-nowrap shrink-0 transition-colors disabled:opacity-60"
            >
              <Smartphone className="w-4 h-4 text-sky-300" />
              <span>
                {isSending === "test"
                  ? "Sending Test..."
                  : "Send Test Notification"}
              </span>
            </button>

            <button
              type="button"
              disabled={isSending !== null}
              onClick={() => void handleSend("all")}
              className="liquid-button-primary inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-semibold whitespace-nowrap shrink-0 transition-transform hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
            >
              <Send className="w-4 h-4" />
              <span>
                {isSending === "all"
                  ? "Broadcasting..."
                  : confirmBroadcastAll
                  ? "Confirm Send to All Devices"
                  : "Send to All Devices"}
              </span>
            </button>
          </div>

          {/* Admin Test Device Token Registry */}
          <div className="pt-6 border-t border-white/[0.08] space-y-3">
            <div className="space-y-1">
              <h3 className="text-xs font-semibold text-white">
                Admin Test Device Token
              </h3>
              <p className="text-xs text-zinc-400">
                Save your personal Android device&apos;s FCM token to D1 so{" "}
                <span className="text-zinc-200">Send Test Notification</span>{" "}
                targets your phone directly.
              </p>
            </div>

            <form
              onSubmit={(e) => void handleSaveTestDevice(e)}
              className="flex flex-col sm:flex-row gap-2.5"
            >
              <input
                type="text"
                value={testTokenInput}
                onChange={(e) => setTestTokenInput(e.target.value)}
                placeholder="Paste Android FCM token (or use directly for one-off test)"
                aria-label="Admin Android FCM registration token"
                className="flex-1 px-4 py-2.5 rounded-xl bg-black/45 border border-white/15 text-xs text-white font-mono placeholder:font-sans placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-sky-400/70"
              />
              <button
                type="submit"
                disabled={savingTestToken}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-medium text-white whitespace-nowrap shrink-0 disabled:opacity-60"
              >
                {savingTestToken ? "Saving..." : "Save Test Device"}
              </button>
            </form>

            {testTokenFeedback && (
              <p
                role={testTokenFeedback.type === "error" ? "alert" : "status"}
                className={`text-xs ${
                  testTokenFeedback.type === "success"
                    ? "text-emerald-300"
                    : "text-red-300"
                }`}
              >
                {testTokenFeedback.text}
              </p>
            )}
          </div>
        </section>

        {/* Live Android Notification Preview Column */}
        <section className="lg:col-span-5 liquid-glass rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <h2 className="font-display text-xl font-semibold text-white">
                Android Shade Preview
              </h2>
              <p className="text-xs text-zinc-400">
                Channel: <code className="font-mono text-zinc-300">nova_broadcasts</code>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPreviewExpanded((prev) => !prev)}
              className="px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.13] border border-white/10 text-xs text-zinc-200"
            >
              {previewExpanded ? "Collapse" : "Expand"}
            </button>
          </div>

          {/* Realistic Android System Notification Shade */}
          <div className="rounded-[28px] bg-[#0B0D12] border border-white/15 p-4 space-y-4 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)]">
            <div className="flex items-center justify-between px-2 text-[11px] font-mono text-zinc-400">
              <span>9:41</span>
              <span>5G · Android Notification Shade</span>
            </div>

            <div className="rounded-2xl bg-[#161922] border border-white/12 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <img
                    src={officialLogoSrc}
                    alt="NOVA MUSIC notification icon"
                    referrerPolicy="no-referrer"
                    className="w-5 h-5 rounded-md object-cover border border-white/15 shrink-0"
                  />
                  <span className="text-[11px] font-medium text-zinc-300 truncate">
                    NOVA MUSIC
                  </span>
                  <span className="text-[11px] text-zinc-500 shrink-0">
                    · now
                  </span>
                </div>
                <span className="text-[10px] font-mono text-zinc-500">
                  {previewExpanded ? "▲" : "▼"}
                </span>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-semibold text-white break-words">
                  {title.trim() || "NOVA MUSIC v1.1.5 is now available"}
                </p>
                <p
                  className={`text-xs text-zinc-300 leading-relaxed break-words ${
                    previewExpanded ? "" : "line-clamp-2"
                  }`}
                >
                  {message.trim() ||
                    "Update now for smoother Liquid Glass transitions and audio engine refinements."}
                </p>
              </div>

              {previewExpanded && imageUrl.trim() && !previewImageError && (
                <div className="rounded-xl overflow-hidden border border-white/10 bg-black/40 aspect-[16/9]">
                  <img
                    src={imageUrl.trim()}
                    alt="Notification attachment preview"
                    referrerPolicy="no-referrer"
                    onError={() => setPreviewImageError(true)}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {previewExpanded && imageUrl.trim() && previewImageError && (
                <p className="text-[11px] text-amber-300">
                  Image URL could not be loaded in browser preview. Verify it is
                  publicly accessible over HTTPS.
                </p>
              )}

              {deepLink.trim() && (
                <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-zinc-400">
                  <span>Tap action</span>
                  <span className="font-mono text-sky-300 truncate max-w-[200px]">
                    {deepLink.trim()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Registered Device Summaries (Masked) */}
          <div className="space-y-3 pt-2 border-t border-white/[0.08]">
            <h3 className="text-xs font-semibold text-zinc-300">
              Recent Registered Devices (Masked)
            </h3>
            {overview && overview.devices.length > 0 ? (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {overview.devices.map((dev) => (
                  <div
                    key={dev.maskedToken}
                    className="rounded-xl bg-white/[0.03] border border-white/[0.07] px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-zinc-200 truncate">
                        {dev.maskedToken}
                      </p>
                      <p className="text-[11px] text-zinc-500">
                        v{dev.appVersion}
                        {dev.androidSdk ? ` · API ${dev.androidSdk}` : ""}
                      </p>
                    </div>
                    <span
                      className={`text-[11px] font-medium shrink-0 ${
                        dev.isAdminTest ? "text-sky-300" : "text-zinc-400"
                      }`}
                    >
                      {dev.isAdminTest ? "Admin Test" : "Active"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-500 leading-relaxed">
                No Android FCM device tokens registered in D1 yet. Tokens appear
                here automatically when users open the FCM-integrated NOVA MUSIC
                app or when you save an Admin Test token.
              </p>
            )}
          </div>
        </section>
      </div>

      {/* Notification History */}
      <section className="liquid-glass rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-semibold text-white">
              Notification History
            </h2>
            <p className="text-xs text-zinc-400">
              Recent broadcast logs, targeted device counts, and FCM delivery
              results.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-400">
            <Clock className="w-3.5 h-3.5" />
            <span>Showing latest 30</span>
          </span>
        </div>

        {overview && overview.history.length > 0 ? (
          <div className="space-y-3">
            {overview.history.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5 text-xs">
                    <span
                      className={`font-medium ${
                        item.status === "sent"
                          ? "text-emerald-300"
                          : item.status === "partial"
                          ? "text-amber-300"
                          : "text-red-300"
                      }`}
                    >
                      {item.status === "sent"
                        ? "Delivered"
                        : item.status === "partial"
                        ? "Partial Delivery"
                        : "Failed"}
                    </span>
                    <span aria-hidden="true" className="text-zinc-600">
                      ·
                    </span>
                    <span className="text-zinc-400">
                      {item.mode === "test" ? "Test Device" : "All Devices"}
                    </span>
                    <span aria-hidden="true" className="text-zinc-600">
                      ·
                    </span>
                    <span className="font-mono text-zinc-500">
                      {formatDateTime(item.createdAt)}
                    </span>
                  </div>

                  <h3 className="text-base font-semibold text-white break-words">
                    {item.title}
                  </h3>
                  <p className="text-xs text-zinc-300 leading-relaxed break-words">
                    {item.message}
                  </p>
                  {item.errorSummary && (
                    <p className="text-[11px] text-red-300 font-mono break-all">
                      {item.errorSummary}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4 pt-3 lg:pt-0 lg:pl-6 border-t lg:border-t-0 lg:border-l border-white/[0.08] shrink-0 text-xs">
                  <div>
                    <span className="text-zinc-500 block">Targeted</span>
                    <span className="font-mono font-semibold text-white tabular-nums">
                      {item.targetedCount}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Delivered</span>
                    <span className="font-mono font-semibold text-emerald-300 tabular-nums">
                      {item.successCount}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Pruned</span>
                    <span className="font-mono font-semibold text-zinc-300 tabular-nums">
                      {item.invalidTokensRemoved}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-8 text-center text-sm text-zinc-400">
            No notifications have been sent yet. Compose a notification above
            and send a test or broadcast to populate history.
          </div>
        )}
      </section>
    </div>
  );
};
