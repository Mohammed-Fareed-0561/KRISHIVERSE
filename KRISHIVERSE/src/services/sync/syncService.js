import { v4 as uuidv4 } from "uuid";
import { dbPut, dbGetAll } from "../db/indexedDb";
import { DB_STORES } from "../db/schemas";
import { apiClient } from "../api/apiClient";

// ─── Outbox (write-ahead) sync layer ─────────────────────────────────────────
// Local writes go into `syncQueue` as outbox entries. When the device is
// online, `flushSync` pushes them to the server. This gives an offline-first
// mobile DB: reads always hit IndexedDB; writes are queued and merged later.

const SYNC_ENDPOINT = "/advisory/sync";

export function now() {
  return Date.now();
}

export function newId() {
  return uuidv4();
}

/**
 * Queue a mutation to be synced to the server later.
 *
 * @param {{ storeName: string, operation: 'upsert'|'delete', payload: object }} input
 * @returns {Promise<object>} the outbox entry
 */
export async function enqueueSync({ storeName, operation = "upsert", payload }) {
  const entry = {
    id: newId(),
    storeName,
    operation,
    payload,
    revision: (payload?.revision ?? 0) + 1,
    status: "pending",
    createdAt: now(),
  };
  await dbPut(DB_STORES.syncQueue, entry);
  return entry;
}

/**
 * All outbox entries not yet pushed to the server.
 */
export async function getPendingSyncEntries() {
  const all = (await dbGetAll(DB_STORES.syncQueue)) || [];
  return all
    .filter((e) => e.status === "pending")
    .sort((a, b) => a.createdAt - b.createdAt || String(a.id).localeCompare(String(b.id)));
}

/**
 * Push pending entries to the server. On network failure entries stay pending
 * so they are retried the next time the device comes online.
 *
 * @param {{ batchSize?: number, endpoint?: string, post?: Function }} opts
 * @returns {{ pushed: number, pending: number, offline: boolean }}
 */
export async function flushSync(opts = {}) {
  const batchSize = opts.batchSize ?? 50;
  const post = opts.post ?? ((url, body) => apiClient.post(url, body));
  const endpoint = opts.endpoint ?? SYNC_ENDPOINT;

  const pending = await getPendingSyncEntries();
  const batch = pending.slice(0, batchSize);
  if (batch.length === 0) return { pushed: 0, pending: pending.length, offline: false };

  try {
    await post(endpoint, { batch });
  } catch (err) {
    const isOffline = !!err?.isOffline || err?.code === "NETWORK_ERROR";
    return { pushed: 0, pending: pending.length, offline: isOffline };
  }

  // Server accepted the batch — mark entries synced.
  for (const entry of batch) {
    await dbPut(DB_STORES.syncQueue, { ...entry, status: "synced", syncedAt: now() });
  }
  return { pushed: batch.length, pending: pending.length - batch.length, offline: false };
}

let listenerAttached = false;

/**
 * Flush whenever the device comes back online or the tab becomes visible.
 * Safe to call multiple times (idempotent guard).
 *
 * @returns {() => void} detach function
 */
export function initSyncListener({ onFlush } = {}) {
  if (typeof window === "undefined") return () => {};
  if (listenerAttached) return () => {};

  const flush = () => {
    flushSync().then((r) => {
      if (r.pushed > 0) onFlush?.(r);
    });
  };

  window.addEventListener("online", flush);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") flush();
  });
  listenerAttached = true;

  return () => {
    window.removeEventListener("online", flush);
    document.removeEventListener("visibilitychange", flush);
    listenerAttached = false;
  };
}

export default {
  enqueueSync,
  getPendingSyncEntries,
  flushSync,
  initSyncListener,
  SYNC_ENDPOINT,
};
