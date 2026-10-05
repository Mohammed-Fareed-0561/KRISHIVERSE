import { useEffect, useState, useCallback } from "react";
import { useOffline } from "./useOffline";
import {
  fetchFinanceData,
  getCachedFinanceData,
  computeCreditScore,
  computePreApprovedLimit,
  getMarketplaceTransactionCount,
} from "../services/api/financeService";
import { daysToMs, isExpired } from "../services/offline/cacheManager";

export function useFinance() {
  const { isOnline } = useOffline();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [state, setState] = useState({
    status: "idle",
    data: null,
    error: null,
    source: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setState((s) => ({ ...s, status: "loading", error: null }));

      const cached = getCachedFinanceData();
      if (!cancelled && cached) {
        setState({
          status: "success",
          data: cached,
          error: null,
          source: "cache",
        });
      }

      const ttlDays = Number.parseFloat(
        import.meta.env.VITE_FINANCE_UPDATE_DAYS || "7",
      );
      const ttlMs = daysToMs(ttlDays);
      const cacheRaw = localStorage.getItem("kv_finance_cache");
      let fetchedAt = 0;
      try {
        fetchedAt = cacheRaw ? JSON.parse(cacheRaw).fetchedAt ?? 0 : 0;
      } catch {
        fetchedAt = 0;
      }

      const shouldRefresh =
        (isOnline && (!cached || isExpired(fetchedAt, ttlMs))) ||
        refreshTrigger > 0;

      if (!shouldRefresh) {
        if (!cancelled && !cached) {
          setState({ status: "error", data: null, error: null, source: null });
        }
        return;
      }

      try {
        const fresh = await fetchFinanceData();
        if (cancelled) return;
        setState({
          status: "success",
          data: fresh,
          error: null,
          source: "network",
        });
      } catch (error) {
        if (cancelled) return;
        setState((s) => ({
          ...s,
          status: s.data ? "success" : "error",
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
    setRefreshTrigger((prev) => prev + 1);
    return new Promise((resolve) => setTimeout(resolve, 500));
  }, []);

  const txCount = getMarketplaceTransactionCount();
  const profile = state.data?.creditProfile;
  const creditScore = profile ? computeCreditScore(profile, txCount) : null;
  const preApprovedLimit = profile
    ? computePreApprovedLimit(profile, creditScore)
    : null;

  return {
    ...state,
    refetch,
    creditScore,
    preApprovedLimit,
    marketplaceTxCount: txCount,
  };
}
