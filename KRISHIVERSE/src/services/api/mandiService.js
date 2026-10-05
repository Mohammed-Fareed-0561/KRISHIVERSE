import { dbGet, dbPut } from "../db/indexedDb";
import { DB_STORES } from "../db/schemas";

const LATEST_KEY = "v2_latest";

export async function getCachedMandiPrices() {
  return dbGet(DB_STORES.mandiPrices, LATEST_KEY);
}

export async function fetchMandiPrices() {
  // Fetch the extended crop prices data (acting as mock API)
  const response = await fetch("/data/mandiPrices.json");
  if (!response.ok) {
    throw new Error("Failed to fetch mandi prices");
  }
  
  const json = await response.json();
  const data = json.data;

  const record = {
    key: LATEST_KEY,
    fetchedAt: Date.now(),
    data,
  };

  await dbPut(DB_STORES.mandiPrices, record);
  return record;
}
