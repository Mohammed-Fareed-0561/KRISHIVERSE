import { useEffect, useState, useCallback } from "react";
import { useOffline } from "./useOffline";
import { fetchSchemes, getCachedSchemes } from "../services/api/schemesService";
import { daysToMs, isExpired } from "../services/offline/cacheManager";

export function useSchemes() {
  const { isOnline } = useOffline();
  const [state, setState] = useState({
    status: "idle",
    schemes: [],
    error: null,
    source: null, // cache | network
  });
  
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setState((s) => ({ ...s, status: "loading", error: null }));

      const cached = await getCachedSchemes();
      if (!cancelled && cached.length) {
        setState({
          status: "success",
          schemes: cached,
          error: null,
          source: "cache",
        });
      }

      const ttlDays = Number.parseFloat(
        import.meta.env.VITE_SCHEMES_UPDATE_DAYS || "30",
      );
      const ttlMs = daysToMs(ttlDays);
      const newestUpdatedAt = cached.reduce(
        (max, s) => Math.max(max, s.updatedAt || 0),
        0,
      );
      const shouldRefresh =
        (isOnline && (!cached.length || isExpired(newestUpdatedAt, ttlMs))) || refreshTrigger > 0;

      if (!shouldRefresh) {
        if (!cancelled && !cached.length)
          setState({ status: "error", schemes: [], error: null, source: null });
        return;
      }

      try {
        const fresh = await fetchSchemes();
        if (cancelled) return;
        setState({
          status: "success",
          schemes: fresh,
          error: null,
          source: "network",
        });
      } catch (error) {
        if (cancelled) return;
        setState((s) => ({
          ...s,
          status: s.schemes.length ? "success" : "error",
          error,
        }));
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [isOnline, refreshTrigger]);

  const refetch = useCallback(async () => {
    let resolved = false;
    return new Promise((resolve) => {
      setRefreshTrigger((prev) => prev + 1);
      // Wait a short delay to allow the effect to run
      setTimeout(() => {
        resolve();
      }, 500);
    });
  }, []);

  return { ...state, refetch };
}
