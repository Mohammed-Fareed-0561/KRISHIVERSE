import { apiClient } from "./apiClient";
import { dbGet, dbPut } from "../db/indexedDb";
import { DB_STORES } from "../db/schemas";

const CROPS_CACHE_KEY = "all_crops";
const CROPS_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ─── Crop list ────────────────────────────────────────────────────────────────

/**
 * Fetch all crops from backend and cache in IndexedDB.
 * Returns cached version if still fresh.
 */
export async function getCrops() {
  // Try cache first
  const cached = await dbGet(DB_STORES.meta, CROPS_CACHE_KEY);
  if (cached && Date.now() - cached.fetchedAt < CROPS_TTL_MS) {
    return cached.data;
  }

  try {
    const { data } = await apiClient.get("/crops");
    const record = {
      key: CROPS_CACHE_KEY,
      fetchedAt: Date.now(),
      data: data.crops,
    };
    await dbPut(DB_STORES.meta, record);
    return data.crops;
  } catch (err) {
    // Offline — return cached even if stale
    if (err.isOffline && cached) return cached.data;
    throw err;
  }
}

/**
 * Get a single crop by name.
 */
export async function getCrop(name) {
  try {
    const { data } = await apiClient.get(`/crops/${name}`);
    return data.crop;
  } catch (err) {
    // Offline fallback — search local cache
    if (err.isOffline) {
      const cached = await dbGet(DB_STORES.meta, CROPS_CACHE_KEY);
      return cached?.data?.find((c) => c.name === name) || null;
    }
    throw err;
  }
}

// ─── Crop recommendation ──────────────────────────────────────────────────────

/**
 * Get crop recommendations from backend rule-based engine.
 * This complements the TF.js ML model running on the frontend.
 *
 * @param {{ N, P, K, temperature, humidity, ph, rainfall, soilType? }} params
 * @returns {{ recommendations: Array, input: object }}
 */
export async function getRecommendations(params) {
  const { data } = await apiClient.post("/crops/recommend", params);
  return data;
}
