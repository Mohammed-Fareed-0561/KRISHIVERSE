import { apiClient } from "./apiClient";
import { appConfig } from "../config/appConfig";
import { dbGet, dbPut } from "../db/indexedDb";
import { DB_STORES } from "../db/schemas";
import { isExpired } from "../offline/cacheManager";

function weatherKey(lat, lon) {
  return `${Number(lat).toFixed(4)},${Number(lon).toFixed(4)}`;
}

export async function getCachedWeather({ lat, lon }) {
  return dbGet(DB_STORES.weatherForecast, weatherKey(lat, lon));
}

/**
 * Fetch weather via backend proxy (keeps API key server-side).
 * Falls back to direct OWM call if backend is unreachable.
 * Always caches result to IndexedDB for offline use.
 */
export async function fetchWeather({
  lat,
  lon,
  lang = "en",
  units = "metric",
}) {
  let raw;

  try {
    // ── Primary: go through backend ──────────────────────────────────────────
    const { data } = await apiClient.get("/weather/current", {
      params: { lat, lon, lang, units },
    });
    raw = data.data;
  } catch (err) {
    if (!err.isOffline) throw err;

    // ── Fallback: direct OWM (only if key available in env) ──────────────────
    if (!appConfig.openWeatherKey) throw err;

    const url = new URL("https://api.openweathermap.org/data/2.5/weather");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lon));
    url.searchParams.set("appid", appConfig.openWeatherKey);
    url.searchParams.set("units", units);

    const res = await fetch(url.toString());
    if (!res.ok) {
      const e = new Error(`OpenWeatherMap error (${res.status})`);
      e.status = res.status;
      throw e;
    }
    raw = await res.json();
  }

  const record = {
    key: weatherKey(lat, lon),
    fetchedAt: Date.now(),
    data: raw,
  };
  await dbPut(DB_STORES.weatherForecast, record);
  return record;
}

/**
 * Smart fetch — returns cache if fresh, else fetches.
 */
export async function getWeather({ lat, lon, lang = "en" }) {
  const cached = await getCachedWeather({ lat, lon });
  if (cached && !isExpired(cached.fetchedAt, appConfig.weatherCacheTtl)) {
    return { ...cached, fromCache: true };
  }
  return fetchWeather({ lat, lon, lang });
}

/**
 * Get cached forecast from IndexedDB.
 */
export async function getCachedForecast({ lat, lon }) {
  return dbGet(DB_STORES.meta, `forecast:${weatherKey(lat, lon)}`);
}

/**
 * Fetch 5-day/3-hour forecast from backend, caches in IndexedDB.
 * Falls back to direct OWM if key available and backend offline.
 */
export async function fetchForecast({
  lat,
  lon,
  lang = "en",
  units = "metric",
}) {
  let list;
  try {
    const { data } = await apiClient.get("/weather/forecast", {
      params: { lat, lon, lang, units },
    });
    list = data.data;
  } catch (err) {
    if (!err.isOffline) throw err;
    if (!appConfig.openWeatherKey) throw err;

    const url = new URL("https://api.openweathermap.org/data/2.5/forecast");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lon));
    url.searchParams.set("appid", appConfig.openWeatherKey);
    url.searchParams.set("units", units);
    url.searchParams.set("lang", lang);
    url.searchParams.set("cnt", "40");

    const res = await fetch(url.toString());
    if (!res.ok) {
      const e = new Error(`OWM forecast error (${res.status})`);
      e.status = res.status;
      throw e;
    }
    const json = await res.json();
    list = json;
  }

  const record = {
    key: `forecast:${weatherKey(lat, lon)}`,
    fetchedAt: Date.now(),
    data: list,
  };
  await dbPut(DB_STORES.meta, record);
  return record;
}

/**
 * Smart forecast — returns cache if fresh (6 h TTL), else fetches.
 */
export async function getForecast({ lat, lon, lang = "en" }) {
  const cached = await getCachedForecast({ lat, lon });
  const ttl = 6 * 60 * 60 * 1000; // 6 hours
  if (cached && !isExpired(cached.fetchedAt, ttl)) {
    return { ...cached, fromCache: true };
  }
  return fetchForecast({ lat, lon, lang });
}
