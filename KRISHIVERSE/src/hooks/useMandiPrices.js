import { useEffect, useState } from "react";
import { useOffline } from "./useOffline";
import {
  fetchMandiPrices,
  getCachedMandiPrices,
} from "../services/api/mandiService";
import { hoursToMs, isExpired } from "../services/offline/cacheManager";

export function useMandiPrices() {
  const { isOnline } = useOffline();
  const [trigger, setTrigger] = useState(0);
  const [state, setState] = useState({
    status: "idle",
    record: null,
    error: null,
    source: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const isManual = trigger > 0;
      // Show loading only if no data or not a manual pull-to-refresh
      if (!isManual && !state.record) {
        setState((s) => ({ ...s, status: "loading", error: null }));
      }

      // Check cache unless manual refresh
      let cached = null;
      if (!isManual) {
        cached = await getCachedMandiPrices();
        if (!cancelled && cached) {
          setState({
            status: "success",
            record: cached,
            error: null,
            source: "cache",
          });
        }
      }

      const ttlMs = hoursToMs(
        Number.parseFloat(import.meta.env.VITE_MANDI_CACHE_HOURS || "24"),
      );
      
      const shouldRefresh =
        isOnline && (isManual || !cached || isExpired(cached.fetchedAt, ttlMs));
        
      if (!shouldRefresh) {
        if (!cancelled && !cached)
          setState({
            status: "error",
            record: null,
            error: null,
            source: null,
          });
        return;
      }

      try {
        const fresh = await fetchMandiPrices();
        if (cancelled) return;
        setState({
          status: "success",
          record: fresh,
          error: null,
          source: "network",
        });
      } catch (error) {
        if (cancelled) return;
        setState((s) => ({
          ...s,
          status: s.record ? "success" : "error",
          error,
        }));
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [isOnline, trigger]);

  const refetch = async () => {
    setTrigger((t) => t + 1);
    // Simple mock delay to let PTR animation show
    return new Promise((resolve) => setTimeout(resolve, 800));
  };

  return { ...state, refetch };
}
