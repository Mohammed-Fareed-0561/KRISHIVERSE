import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

let _db = null

/**
 * Opens (once) the SQLite database used for the offline-first sync store.
 * Uses a file DB in production/dev, and :memory: in tests.
 */
export function getSyncDb() {
  if (_db) return _db

  const inMemory = process.env.NODE_ENV === 'test' || process.env.SQLITE_IN_MEMORY === 'true'
  const filePath = inMemory ? ':memory:' : join(__dirname, '..', '..', 'data', 'sync.sqlite')

  if (!inMemory) mkdirSync(dirname(filePath), { recursive: true })

  const db = new DatabaseSync(filePath)
  db.exec(`
    CREATE TABLE IF NOT EXISTS sync_records (
      store_name  TEXT NOT NULL,
      record_id   TEXT NOT NULL,
      operation   TEXT NOT NULL,
      payload     TEXT NOT NULL,
      revision    INTEGER NOT NULL DEFAULT 1,
      synced_at   INTEGER NOT NULL,
      PRIMARY KEY (store_name, record_id)
    );
    CREATE INDEX IF NOT EXISTS idx_sync_records_store ON sync_records (store_name);
  `)
  _db = db
  return db
}

/**
 * Upsert a batch of synced outbox entries.
 * @param {Array<{id:string, storeName:string, operation:string, payload:object, revision?:number}>} batch
 * @returns {{ upserted:number, deleted:number }}
 */
export function applySyncBatch(batch = []) {
  const db = getSyncDb()
  const now = Date.now()
  const insert = db.prepare(`
    INSERT INTO sync_records (store_name, record_id, operation, payload, revision, synced_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(store_name, record_id) DO UPDATE SET
      operation = excluded.operation,
      payload   = excluded.payload,
      revision  = excluded.revision,
      synced_at = excluded.synced_at
  `)
  const remove = db.prepare('DELETE FROM sync_records WHERE store_name = ? AND record_id = ?')

  let upserted = 0
  let deleted = 0
  for (const entry of batch) {
    const storeName = String(entry.storeName || 'unknown')
    const recordId = String(entry.id || entry.payload?.id || '')
    const operation = entry.operation === 'delete' ? 'delete' : 'upsert'
    if (!recordId) continue

    if (operation === 'delete') {
      remove.run(storeName, recordId)
      deleted += 1
    } else {
      insert.run(
        storeName,
        recordId,
        operation,
        JSON.stringify(entry.payload ?? {}),
        Number(entry.revision ?? entry.payload?.revision ?? 1),
        now,
      )
      upserted += 1
    }
  }
  return { upserted, deleted }
}

/**
 * How many synced records are stored (for health/debug).
 */
export function countSyncRecords() {
  try {
    const row = getSyncDb().prepare('SELECT COUNT(*) AS c FROM sync_records').get()
    return Number(row?.c ?? 0)
  } catch {
    return 0
  }
}

export default { getSyncDb, applySyncBatch, countSyncRecords }