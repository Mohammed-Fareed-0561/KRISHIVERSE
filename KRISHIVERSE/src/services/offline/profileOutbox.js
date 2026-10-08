import { enqueueSync, getPendingSyncEntries } from "../sync/syncService";
import { DB_STORES } from "../db/schemas";
import { getUser } from "../api/authService";

/**
 * Offline-first profile outbox.
 *
 * When a profile (or onboarding) edit cannot reach the API — no network, flaky
 * village signal — the edit is written to the shared sync queue under the
 * `farmers` store and flushed by syncService to POST /users/profile/sync,
 * which applies it only if the device was not outrun by the server
 * (server-wins-if-newer, deterministic, never a blind overwrite).
 *
 * `baseRevision` is the profileRevision the device last saw from the server;
 * it is what lets the server tell "fresh local edit" from "stale local edit".
 */
export async function queueProfileEdit(profile, { onboarding } = {}) {
  const user = getUser();
  const payload = {
    id: user?.id || "me",
    baseRevision: Number.isFinite(user?.profileRevision) ? user.profileRevision : 0,
    profile: profile || {},
    ...(onboarding ? { onboarding } : {}),
  };
  return enqueueSync({ storeName: DB_STORES.farmers, operation: "upsert", payload });
}

/** Profile edits still waiting on this device (0 when fully synced). */
export async function pendingProfileEdits() {
  const entries = await getPendingSyncEntries();
  return entries.filter((entry) => entry.storeName === DB_STORES.farmers);
}
