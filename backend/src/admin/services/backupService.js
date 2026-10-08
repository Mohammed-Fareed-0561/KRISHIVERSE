import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { BACKUP_DIR, CRITICAL_ASSETS, REPO_ROOT, fileExists, resolveAsset } from '../paths.js'
import { BackupMeta } from '../store/collections.js'
import { kbVersion, gitInfo } from './versionService.js'

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

function timestampId() {
  const now = new Date()
  const stamp = now.toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)
  return `bk_${stamp}_${Math.random().toString(36).slice(2, 6)}`
}

/** Snapshot secret-free critical metadata. Never copies .env or any credential. */
export async function createBackup({ actor } = {}) {
  const backupId = timestampId()
  const dir = join(BACKUP_DIR, backupId)
  mkdirSync(dir, { recursive: true })

  const assets = []
  for (const asset of CRITICAL_ASSETS) {
    if (!existsSync(asset.absolute)) continue
    const target = join(dir, 'assets', asset.relative.split('/').join(sep))
    mkdirSync(dirname(target), { recursive: true })
    const data = readFileSync(asset.absolute)
    writeFileSync(target, data)
    assets.push({
      path: asset.relative,
      sha256: createHash('sha256').update(data).digest('hex'),
      bytes: data.length,
    })
  }

  const meta = {
    backupId,
    createdAt: new Date(),
    createdBy: actor?.email || actor?.id || 'unknown',
    status: assets.length ? 'complete' : 'failed',
    dir,
    assets,
    gitCommit: gitInfo().commit || null,
    kbVersion: kbVersion().available ? String(kbVersion().version) : null,
    restores: [],
  }

  writeFileSync(join(dir, 'meta.json'), JSON.stringify({ ...meta, createdAt: meta.createdAt.toISOString() }, null, 2))
  await BackupMeta.create(meta)
  return publicView(meta)
}

export async function listBackups({ limit = 50 } = {}) {
  try {
    const docs = await BackupMeta.find().sort({ createdAt: -1 }).limit(limit).lean()
    return docs.map(publicView)
  } catch {
    return []
  }
}

export async function getBackup(backupId) {
  const doc = await BackupMeta.findOne({ backupId }).lean()
  return doc ? publicView(doc) : null
}

/** Re-hash every stored asset and report drift. */
export async function verifyBackup(backupId) {
  const doc = await BackupMeta.findOne({ backupId }).lean()
  if (!doc) return null
  const results = []
  for (const asset of doc.assets || []) {
    const absolute = resolveAsset(asset.path)
    if (!fileExists(absolute)) {
      results.push({ path: asset.path, status: 'missing', expected: asset.sha256 })
      continue
    }
    const actual = sha256(absolute)
    results.push({
      path: asset.path,
      status: actual === asset.sha256 ? 'match' : 'changed',
      expected: asset.sha256,
      actual,
      bytes: statSync(absolute).size,
    })
  }
  return {
    backupId,
    createdAt: doc.createdAt,
    checkedAt: new Date().toISOString(),
    results,
    changed: results.filter((item) => item.status !== 'match').length,
  }
}

/**
 * Restore drill.
 *
 * Restores ONLY into a target directory. Writing outside the backup area requires
 * ADMIN_ALLOW_RESTORE=true (the explicit-authorization switch); production rollback
 * is never executed by this code path during development.
 */
export async function restoreBackup({ backupId, targetDir, confirm, actor } = {}) {
  if (confirm !== true) {
    const err = new Error('Restore requires confirm: true — restores are explicit, never implicit.')
    err.status = 400
    err.code = 'confirm_required'
    throw err
  }

  const doc = await BackupMeta.findOne({ backupId }).lean()
  if (!doc) {
    const err = new Error(`Backup ${backupId} not found`)
    err.status = 404
    err.code = 'backup_not_found'
    throw err
  }

  const withinBackupArea = !targetDir
  const destination = resolve(targetDir || join(BACKUP_DIR, `${backupId}_restore_drill`))
  const isInsideBackupArea = destination.startsWith(resolve(BACKUP_DIR) + sep) || destination === resolve(BACKUP_DIR)

  if (!isInsideBackupArea && process.env.ADMIN_ALLOW_RESTORE !== 'true') {
    const err = new Error('Writing outside backend/backups requires ADMIN_ALLOW_RESTORE=true (explicitly authorized restore).')
    err.status = 403
    err.code = 'restore_not_authorized'
    throw err
  }

  const results = []
  for (const asset of doc.assets || []) {
    const source = join(doc.dir, 'assets', asset.path.split('/').join(sep))
    const target = join(destination, 'assets', asset.path.split('/').join(sep))
    if (!existsSync(source)) {
      results.push({ path: asset.path, status: 'missing-in-backup' })
      continue
    }
    mkdirSync(dirname(target), { recursive: true })
    const data = readFileSync(source)
    const hash = createHash('sha256').update(data).digest('hex')
    writeFileSync(target, data)
    results.push({ path: asset.path, status: hash === asset.sha256 ? 'restored' : 'restored-checksum-mismatch', bytes: data.length })
  }

  const ok = results.every((item) => item.status === 'restored')
  await BackupMeta.updateOne(
    { backupId },
    { $push: { restores: { at: new Date(), actor: actor?.email || actor?.id || 'unknown', targetDir: destination, ok, note: withinBackupArea ? 'in-area drill' : 'external drill (authorized)' } } },
  )

  return {
    backupId,
    targetDir: destination,
    ok,
    restored: results.filter((item) => item.status === 'restored').length,
    total: (doc.assets || []).length,
    results,
    note: 'Restore drill writes only into the target directory; the running application is not hot-swapped.',
    drill: true,
  }
}

function publicView(doc) {
  return {
    backupId: doc.backupId,
    createdAt: doc.createdAt,
    createdBy: doc.createdBy,
    status: doc.status,
    assetCount: (doc.assets || []).length,
    totalBytes: (doc.assets || []).reduce((sum, asset) => sum + (asset.bytes || 0), 0),
    assets: (doc.assets || []).map((asset) => ({ path: asset.path, sha256: asset.sha256, bytes: asset.bytes })),
    gitCommit: doc.gitCommit,
    kbVersion: doc.kbVersion,
    restores: doc.restores || [],
  }
}
