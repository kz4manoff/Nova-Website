import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  fetchDownloadStats,
  recordApkDownload,
  type DownloadStats,
} from "../services/downloadStatsService";

interface DownloadStatsContextValue {
  stats: DownloadStats | null;
  isLoadingStats: boolean;
  refreshStats: () => Promise<void>;
  trackDownloadStart: (version: string, apkUrl: string) => Promise<void>;
}

const DownloadStatsContext = createContext<DownloadStatsContextValue | null>(
  null
);

export const DownloadStatsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [stats, setStats] = useState<DownloadStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  const refreshStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const next = await fetchDownloadStats();
      if (next) {
        setStats(next);
      }
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    void refreshStats();
  }, [refreshStats]);

  const trackDownloadStart = useCallback(
    async (version: string, apkUrl: string) => {
      const updated = await recordApkDownload(version, apkUrl);
      if (updated) {
        setStats((prev) =>
          prev
            ? {
                ...updated,
                totalDownloads: Math.max(
                  prev.totalDownloads,
                  updated.totalDownloads
                ),
              }
            : updated
        );
      }
    },
    []
  );

  return (
    <DownloadStatsContext.Provider
      value={{ stats, isLoadingStats, refreshStats, trackDownloadStart }}
    >
      {children}
    </DownloadStatsContext.Provider>
  );
};

export function useDownloadStats(): DownloadStatsContextValue {
  const ctx = useContext(DownloadStatsContext);
  if (!ctx) {
    throw new Error(
      "useDownloadStats must be used inside DownloadStatsProvider"
    );
  }
  return ctx;
}
