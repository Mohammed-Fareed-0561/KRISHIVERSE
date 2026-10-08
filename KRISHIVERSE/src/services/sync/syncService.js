import { v4 as uuidv4 } from "uuid";
import { dbPut, dbGetAll } from "../db/indexedDb";
import { DB_STORES } from "../db/schemas";
import { apiClient } from "../api/apiClient";

// ─── Outbox (write-ahead) sync layer ─────────────────────────────────────────
// Local writes go into `syncQueue` as outbox entries. When the device is
// online, `flushSync` pushes them to the server. This gives an offline-first
// mobile DB: reads always hit IndexedDB; writes are queued and merged later.

const SYNC_ENDPOINT = "/advisory/sync";
const PROFILE_SYNC_ENDPOINT = "/users/profile/sync";

/**
 * Which API each store's outbox entries belong to. Anything not listed keeps
 * riding the advisory sync endpoint, so existing stores behave exactly as
 * before. The farmer profile store posts to the profile sync API, which
 * resolves conflicts server-side (server-wins-if-newer).
 */
const STORE_ROUTES = {
  [DB_STORES.farmers]: PROFILE_SYNC_ENDPOINT,
};

/**
 * Collapse a device's queued profile edits into one server write.
 * Later edits merge over earlier ones (each may touch a different field) and
 * the highest baseRevision wins — it reflects the freshest server state the
 * device had seen, so the conflict check stays honest.
 *
 * @param {Array<object>} entries outbox entries for DB_STORES.farmers
 * @returns {Array<{baseRevision:number, profile:object, onboarding?:object}>}
 */
export function collapseProfileEntries(entries) {
  const byUser = new Map();
  for (const entry of entries) {
    const payload = entry?.payload || {};
    const key = payload.id || "me";
    const current = byUser.get(key);
    if (!current) {
      byUser.set(key, {
        baseRevision: Number.isFinite(payload.baseRevision) ? payload.baseRevision : 0,
        profile: { ...(payload.profile || {}) },
        ...(payload.onboarding ? { onboarding: payload.onboarding } : {}),
      });
      continue;
    }
    current.baseRevision = Math.max(current.baseRevision, Number.isFinite(payload.baseRevision) ? payload.baseRevision : 0);
    current.profile = { ...current.profile, ...(payload.profile || {}) };
    if (payload.onboarding) current.onboarding = payload.onboarding;
  }
  return [...byUser.values()];
}

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
  const fallback = opts.endpoint ?? SYNC_ENDPOINT;

  const pending = await getPendingSyncEntries();
  const batch = pending.slice(0, batchSize);
  if (batch.length === 0) return { pushed: 0, pending: pending.length, offline: false };

  // Group entries by destination so each store talks to its own API.
  const groups = new Map();
  for (const entry of batch) {
    const url = STORE_ROUTES[entry.storeName] || fallback;
    if (!groups.has(url)) groups.set(url, []);
    groups.get(url).push(entry);
  }

  let pushed = 0;
  let offline = false;
  try {
    for (const [url, entries] of groups) {
      const body = url === PROFILE_SYNC_ENDPOINT
        ? { batch: collapseProfileEntries(entries) }
        : { batch: entries };
      await post(url, body);
      // Mark only the entries this destination accepted, so a failure on one
      // endpoint never discards another endpoint's queued work.
      for (const entry of entries) {
        await dbPut(DB_STORES.syncQueue, { ...entry, status: "synced", syncedAt: now() });
        pushed += 1;
      }
    }
  } catch (err) {
    offline = !!err?.isOffline || err?.code === "NETWORK_ERROR";
  }

  return { pushed, pending: pending.length - pushed, offline };
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
  collapseProfileEntries,
  SYNC_ENDPOINT,
  PROFILE_SYNC_ENDPOINT,
};
