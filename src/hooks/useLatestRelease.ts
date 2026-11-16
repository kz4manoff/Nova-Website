import { useCallback, useEffect, useState } from "react";
import {
  fetchAndVerifyLatestRelease,
  type VerifiedReleaseState,
} from "../services/releaseService";

export function useLatestRelease() {
  const [releaseInfo, setReleaseInfo] = useState<VerifiedReleaseState | null>(
    null
  );
  const [isChecking, setIsChecking] = useState(true);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);

  const checkForLatestVersion = useCallback(async (bypassCache = true) => {
    setIsChecking(true);
    setCheckError(null);
    try {
      const state = await fetchAndVerifyLatestRelease(bypassCache);
      setReleaseInfo(state);
      setLastCheckedAt(new Date());
    } catch (err) {
      setCheckError(
        err instanceof Error
          ? err.message
          : "Unable to check for the latest NOVA MUSIC version."
      );
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    void checkForLatestVersion(false);
  }, [checkForLatestVersion]);

  return {
    releaseInfo,
    isChecking,
    checkError,
    lastCheckedAt,
    checkForLatestVersion,
  };
}
