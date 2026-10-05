import { useEffect, useMemo, useState } from "react";
import { appConfig } from "../services/config/appConfig";
import { hoursToMs, isExpired } from "../services/offline/cacheManager";
import {
  fetchWeather,
  getCachedWeather,
  getForecast,
  getCachedForecast,
} from "../services/api/weatherService";
import { useOffline } from "./useOffline";

export function useWeather({ lat, lon } = {}) {
  const { isOnline } = useOffline();
  const [trigger, setTrigger] = useState(0);
  const effectiveLat = lat ?? appConfig.defaultLat;
  const effectiveLon = lon ?? appConfig.defaultLon;

  const location = useMemo(
    () => ({ lat: effectiveLat, lon: effectiveLon }),
    [effectiveLat, effectiveLon],
  );

  const [state, setState] = useState({
    status: "idle",
    record: null,
    forecast: null, // { data: OWM list[], fetchedAt, fromCache }
    forecastSource: null, // 'cache' | 'network'
    error: null,
    source: null, // 'cache' | 'network'
    refreshing: false,
  });

  useEffect(() => {
    let cancelled = false;
    let timeoutId;

    async function run() {
      // Set a timeout to prevent infinite loading
      timeoutId = setTimeout(() => {
        if (!cancelled) {
          console.warn("Weather fetch timeout after 30 seconds");
          setState((s) => ({
            ...s,
            status: "error",
            error: new Error("Weather fetch timed out. Please try again."),
            refreshing: false,
          }));
        }
      }, 30000); // 30 second timeout
      const isManual = trigger > 0;
      if (isManual) {
        setState((s) => ({ ...s, refreshing: true, error: null }));
      }
      if (!isManual) {
        setState((s) => ({ ...s, status: "loading", error: null }));
      }

      // ── Current weather ──────────────────────────────────────────────────
      let cached = null;
      if (!isManual) {
        cached = await getCachedWeather(location);
        if (!cancelled && cached) {
          setState((s) => ({
            ...s,
            status: "success",
            record: cached,
            source: "cache",
          }));
        }
      }

      const ttlMs = hoursToMs(
        Number.parseFloat(import.meta.env.VITE_WEATHER_CACHE_HOURS || "24"),
      );
      const shouldRefresh =
        isOnline && (isManual || !cached || isExpired(cached.fetchedAt, ttlMs));

      if (shouldRefresh) {
        try {
          const fresh = await fetchWeather(location);
          if (!cancelled)
            setState((s) => ({
              ...s,
              status: "success",
              record: fresh,
              source: "network",
              error: null,
            }));
        } catch (error) {
          console.error("Weather fetch error:", error);
          if (!cancelled) {
            setState((s) => ({
              ...s,
              status: s.record ? "success" : "error",
              error: error.message || "Failed to fetch weather data",
            }));
          }
        }
      } else if (!cancelled && !cached) {
        setState((s) => ({ 
          ...s, 
          status: "error",
          error: new Error("No weather data available. Please check your internet connection.")
        }));
      }

      // ── Forecast (5-day) ─────────────────────────────────────────────────
      let cachedFc = null;
      if (!isManual) {
        cachedFc = await getCachedForecast(location);
        if (!cancelled && cachedFc) {
          setState((s) => ({
            ...s,
            forecast: cachedFc,
            forecastSource: "cache",
          }));
        }
      }

      if (isOnline && (isManual || !cachedFc || isExpired(cachedFc.fetchedAt, ttlMs))) {
        try {
          const freshFc = await getForecast(location);
          if (!cancelled) {
            setState((s) => ({
              ...s,
              forecast: freshFc,
              forecastSource: "network",
            }));
          }
        } catch {
          // Forecast failure is non-fatal — cached data (if any) remains
        }
      }

      if (!cancelled) {
        setState((s) => ({ ...s, refreshing: false }));
      }
    }

    run();
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isOnline, location, trigger]);

  const refetch = async () => {
    setTrigger((t) => t + 1);
    return new Promise((resolve) => setTimeout(resolve, 800));
  };

  return { ...state, refetch };
}
