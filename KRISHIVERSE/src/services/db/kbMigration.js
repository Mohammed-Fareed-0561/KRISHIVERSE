// Runtime KB migration service — versioned, backed-up, reversible, idempotent.
// Operates on the live IndexedDB stores. The original seed files are never touched.
import { getDb } from "./indexedDb";
import { DB_STORES } from "./schemas";
import { migrateDataset, makeBackup, KB_SCHEMA_VERSION, hashRecords } from "./kbNormalize";

const STORES = [
  DB_STORES.crops,
  DB_STORES.symptoms,
  DB_STORES.diseasePests,
  DB_STORES.treatments,
  DB_STORES.edges,
];

let cacheResetHook = null;

export function setCacheResetHook(fn) {
  cacheResetHook = fn;
}

async function readStores() {
  const db = await getDb();
  const out = {};
  for (const s of STORES) out[s] = await db.getAll(s);
  return out;
}

async function writeStores(stores) {
  const db = await getDb();
  const tx = db.transaction(STORES, "readwrite");
  for (const s of STORES) {
    const store = tx.objectStore(s);
    for (const rec of stores[s] || []) store.put(rec);
  }
  await tx.done;
}

async function getMeta(key) {
  const db = await getDb();
  return db.get(DB_STORES.meta, key);
}

async function setMeta(key, value) {
  const db = await getDb();
  return db.put(DB_STORES.meta, { key, value });
}

// Phase 1 — backup before any mutation. Backups live in the meta store (capped)
// and are also exportable to a file by the Node migration script.
export async function backupKb() {
  const stores = await readStores();
  const payload = makeBackup(stores, 1);
  const meta = (await getMeta("kb_backups")) || { key: "kb_backups", value: [] };
  const backups = Array.isArray(meta.value) ? meta.value : [];
  backups.push({ id: payload.timestamp, ...payload });
  while (backups.length > 10) backups.shift();
  await setMeta("kb_backups", backups);
  return payload;
}

export async function migrateKb() {
  const version = (await getMeta("kbSchemaVersion"))?.value ?? 0;
  if (version >= KB_SCHEMA_VERSION) {
    return { migrated: false, reason: "already-migrated", version };
  }
  const backup = await backupKb();
  const stores = await readStores();
  const { stores: migrated, report } = migrateDataset(stores);
  await writeStores(migrated);
  await setMeta("kbSchemaVersion", KB_SCHEMA_VERSION);
  await setMeta("kbMigratedAt", new Date().toISOString());
  await setMeta("kbMigrationSummary", report);
  cacheResetHook?.();
  return { migrated: true, version: KB_SCHEMA_VERSION, backupId: backup.timestamp, report };
}

export async function ensureKbMigration() {
  const version = (await getMeta("kbSchemaVersion"))?.value ?? 0;
  if (version >= KB_SCHEMA_VERSION) return { migrated: false, reason: "already-migrated" };
  const stores = await readStores();
  const total = Object.values(stores).reduce((a, l) => a + l.length, 0);
  if (total === 0) return { migrated: false, reason: "no-data" };
  return migrateKb();
}

// Reversibility — restore any previously captured backup.
export async function restoreKb(backupId) {
  const meta = (await getMeta("kb_backups"))?.value ?? [];
  const backups = Array.isArray(meta) ? meta : [];
  const backup = backups.find((b) => b.id === backupId);
  if (!backup) throw new Error(`No backup found: ${backupId}`);
  await writeStores(backup.stores);
  await setMeta("kbSchemaVersion", backup.schemaVersion ?? 1);
  cacheResetHook?.();
  return { restored: true, backupId };
}

export async function getKbStatus() {
  const version = (await getMeta("kbSchemaVersion"))?.value ?? 0;
  const migratedAt = (await getMeta("kbMigratedAt"))?.value ?? null;
  const summary = (await getMeta("kbMigrationSummary"))?.value ?? null;
  const backups = (await getMeta("kb_backups"))?.value ?? [];
  return {
    schemaVersion: version,
    migratedAt,
    summary,
    backupCount: Array.isArray(backups) ? backups.length : 0,
  };
}

export { KB_SCHEMA_VERSION, hashRecords };