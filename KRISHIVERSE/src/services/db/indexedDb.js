import { openDB } from "idb";
import { DB_STORES, getDbName, getDbVersion } from "./schemas";

let dbPromise;

export function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(getDbName(), getDbVersion(), {
      upgrade(db) {
        if (!db.objectStoreNames.contains(DB_STORES.meta)) {
          db.createObjectStore(DB_STORES.meta, { keyPath: "key" });
        }

        if (!db.objectStoreNames.contains(DB_STORES.weatherForecast)) {
          db.createObjectStore(DB_STORES.weatherForecast, { keyPath: "key" });
        }

        if (!db.objectStoreNames.contains(DB_STORES.mandiPrices)) {
          const store = db.createObjectStore(DB_STORES.mandiPrices, {
            keyPath: "key",
          });
          store.createIndex("byCommodity", "commodity", { unique: false });
          store.createIndex("byMarket", "market", { unique: false });
        }

        if (!db.objectStoreNames.contains(DB_STORES.schemes)) {
          const store = db.createObjectStore(DB_STORES.schemes, {
            keyPath: "id",
          });
          store.createIndex("byCategory", "category", { unique: false });
        }

        if (!db.objectStoreNames.contains(DB_STORES.shops)) {
          const store = db.createObjectStore(DB_STORES.shops, {
            keyPath: "id",
          });
          store.createIndex("byType", "type", { unique: false });
          store.createIndex("byUpdatedAt", "updatedAt", { unique: false });
        }

        if (!db.objectStoreNames.contains(DB_STORES.chatHistory)) {
          const store = db.createObjectStore(DB_STORES.chatHistory, {
            keyPath: "id",
          });
          store.createIndex("byTimestamp", "timestamp", { unique: false });
        }

        if (!db.objectStoreNames.contains(DB_STORES.diseaseDiagnoses)) {
          const store = db.createObjectStore(DB_STORES.diseaseDiagnoses, {
            keyPath: "id",
          });
          store.createIndex("byTimestamp", "timestamp", { unique: false });
        }

        if (!db.objectStoreNames.contains(DB_STORES.syncQueue)) {
          const store = db.createObjectStore(DB_STORES.syncQueue, {
            keyPath: "id",
          });
          store.createIndex("byStatus", "status", { unique: false });
          store.createIndex("byCreatedAt", "createdAt", { unique: false });
        }

        if (!db.objectStoreNames.contains(DB_STORES.crops)) {
          const store = db.createObjectStore(DB_STORES.crops, {
            keyPath: "id",
          });
          store.createIndex("byCategory", "category", { unique: false });
        }

        if (!db.objectStoreNames.contains(DB_STORES.symptoms)) {
          db.createObjectStore(DB_STORES.symptoms, { keyPath: "id" });
        }

        if (!db.objectStoreNames.contains(DB_STORES.diseasePests)) {
          const store = db.createObjectStore(DB_STORES.diseasePests, {
            keyPath: "id",
          });
          store.createIndex("byType", "type", { unique: false });
        }

        if (!db.objectStoreNames.contains(DB_STORES.treatments)) {
          const store = db.createObjectStore(DB_STORES.treatments, {
            keyPath: "id",
          });
          store.createIndex("byDiseaseId", "diseaseId", { unique: false });
        }

        if (!db.objectStoreNames.contains(DB_STORES.concepts)) {
          const store = db.createObjectStore(DB_STORES.concepts, {
            keyPath: "id",
          });
          store.createIndex("byType", "type", { unique: false });
        }

        if (!db.objectStoreNames.contains(DB_STORES.edges)) {
          const store = db.createObjectStore(DB_STORES.edges, { 
            keyPath: "id", 
            autoIncrement: true 
          });
          store.createIndex("bySource", "sourceId", { unique: false });
          store.createIndex("byTarget", "targetId", { unique: false });
          store.createIndex("byType", "type", { unique: false });
        }

        if (!db.objectStoreNames.contains(DB_STORES.farmers)) {
          db.createObjectStore(DB_STORES.farmers, { keyPath: "id" });
        }

        if (!db.objectStoreNames.contains(DB_STORES.marketplace)) {
          const store = db.createObjectStore(DB_STORES.marketplace, {
            keyPath: "id",
          });
          store.createIndex("byCategory", "category", { unique: false });
          store.createIndex("byCreatedAt", "createdAt", { unique: false });
        }
      },
    });
  }

  return dbPromise;
}

export async function dbGet(storeName, key) {
  const db = await getDb();
  return db.get(storeName, key);
}

export async function dbPut(storeName, value) {
  const db = await getDb();
  return db.put(storeName, value);
}

export async function dbDelete(storeName, key) {
  const db = await getDb();
  return db.delete(storeName, key);
}

export async function dbClear(storeName) {
  const db = await getDb();
  return db.clear(storeName);
}

export async function dbGetAll(storeName) {
  const db = await getDb();
  return db.getAll(storeName);
}
