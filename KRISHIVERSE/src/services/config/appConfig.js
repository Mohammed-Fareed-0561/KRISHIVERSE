function envNumber(key, fallback) {
  const raw = import.meta.env[key];
  if (raw === undefined || raw === null || raw === "") return fallback;
  const parsed = Number.parseFloat(String(raw));
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const appConfig = {
  siteName: import.meta.env.VITE_SITE_NAME || "KrishiVerse",
  siteUrl: import.meta.env.VITE_SITE_URL || "https://yourusername.github.io/krishiverse",

  // Backend API base — all sensitive API calls go through here
  apiBase: import.meta.env.VITE_API_BASE || "http://localhost:3001/api/v1",

  // App defaults
  defaultLanguage: import.meta.env.VITE_DEFAULT_LANGUAGE || "en",
  defaultLat: envNumber("VITE_DEFAULT_LAT", 11.0168),
  defaultLon: envNumber("VITE_DEFAULT_LON", 76.9558),

  // Laya structured decisions (Phase 1: backend-only, optional, default OFF).
  // Never a VITE secret — just a feature flag. Backend keys stay server-side.
  layaDecisionsEnabled: (import.meta.env.VITE_ENABLE_LAYA_DECISIONS ?? "false") === "true",
  // Keep for direct fallback only — backend proxy is preferred
  openWeatherKey: import.meta.env.VITE_OPENWEATHER_API_KEY || import.meta.env.VITE_OPENWEATHERMAP_KEY || "",
  schemesDataUrl: import.meta.env.VITE_SCHEMES_DATA_URL || "/data/schemes.json",
  financeDataUrl: import.meta.env.VITE_FINANCE_DATA_URL || "/data/finance.json",

  // Cache TTLs (ms)
  weatherCacheTtl: envNumber("VITE_WEATHER_CACHE_TTL", 60 * 60 * 1000), // 1 hour
  mandiCacheTtl: envNumber("VITE_MANDI_CACHE_TTL", 6 * 60 * 60 * 1000), // 6 hours
};
