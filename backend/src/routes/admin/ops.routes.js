import { Router } from 'express'
import { requireAdmin } from '../../admin/middleware/rbac.js'
import { recordAudit } from '../../admin/services/auditService.js'
import { createBackup, listBackups, getBackup, verifyBackup, restoreBackup } from '../../admin/services/backupService.js'
import { releases, kbChangeLog, configHistory } from '../../admin/services/registryService.js'
import { changeHistory } from '../../admin/services/versionService.js'
import { queryAudit, auditSummary } from '../../admin/services/auditService.js'
import { datasetsRegistry, modelsRegistry, dependencyRegistry, upsertEntry } from '../../admin/services/registryService.js'
import { captureLog } from '../../admin/services/triageService.js'

export const opsRoutes = Router()

// ─── Section 12 — backups ────────────────────────────────────────────────────
opsRoutes.get('/backups', async (_req, res) => {
  res.json({ status: 'ok', backups: await listBackups({ limit: 50 }) })
})

opsRoutes.post('/backups', requireAdmin('admin:backup'), async (req, res) => {
  const backup = await createBackup({ actor: req.admin })
  recordAudit({
    actorId: req.admin.id, actorRole: req.admin.role, actorLabel: req.admin.email,
    action: 'backup.create', target: backup.backupId, result: 'allowed', ip: req.ip,
    details: { assets: backup.assetCount },
  })
  captureLog({ level: 'info', scope: 'backup', message: `backup ${backup.backupId} created (${backup.assetCount} assets)` })
  res.status(201).json({ status: 'ok', backup })
})

opsRoutes.get('/backups/:backupId/verify', requireAdmin('admin:backup'), async (req, res) => {
  const report = await verifyBackup(req.params.backupId)
  if (!report) return res.status(404).json({ status: 'error', code: 'backup_not_found', message: 'Backup not found' })
  return res.json({ status: 'ok', report })
})

opsRoutes.post('/backups/:backupId/restore', requireAdmin('admin:rollback'), async (req, res) => {
  const drill = await restoreBackup({
    backupId: req.params.backupId,
    targetDir: req.body?.targetDir,
    confirm: req.body?.confirm,
    actor: req.admin,
  })
  recordAudit({
    actorId: req.admin.id, actorRole: req.admin.role, actorLabel: req.admin.email,
    action: 'backup.restore', target: req.params.backupId, result: 'allowed', ip: req.ip,
    details: { targetDir: drill.targetDir, restored: drill.restored, drill: true },
  })
  captureLog({ level: drill.ok ? 'info' : 'warn', scope: 'backup', message: `restore drill ${req.params.backupId} -> ${drill.ok ? 'ok' : 'FAILED'}` })
  res.json({ status: 'ok', drill })
})

// ─── Sections 13/16 — versions, change history, config history ──────────────
opsRoutes.get('/versions', async (_req, res) => {
  res.json(await releases())
})

opsRoutes.get('/versions/changes', async (req, res) => {
  res.json(changeHistory({ limit: Number.parseInt(req.query.limit, 10) || 20 }))
})

opsRoutes.get('/versions/kb-changes', async (req, res) => {
  res.json(await kbChangeLog({ limit: Number.parseInt(req.query.limit, 10) || 20 }))
})

opsRoutes.get('/versions/config-history', async (req, res) => {
  res.json(await configHistory({ limit: Number.parseInt(req.query.limit, 10) || 20 }))
})

// ─── Section 14 — audit trail ────────────────────────────────────────────────
opsRoutes.get('/audit', requireAdmin('admin:audit'), async (req, res) => {
  res.json({
    status: 'ok',
    entries: await queryAudit({
      from: req.query.from, to: req.query.to, action: req.query.action,
      result: req.query.result, actorId: req.query.actorId, limit: req.query.limit,
    }),
  })
})

opsRoutes.get('/audit/summary', requireAdmin('admin:audit'), async (req, res) => {
  res.json({ status: 'ok', summary: await auditSummary({ from: req.query.from, to: req.query.to }) })
})

// ─── Section 15 — registries ─────────────────────────────────────────────────
opsRoutes.get('/registry/datasets', async (_req, res) => {
  res.json(await datasetsRegistry())
})

opsRoutes.get('/registry/models', async (_req, res) => {
  res.json(await modelsRegistry())
})

opsRoutes.get('/registry/dependencies', async (_req, res) => {
  res.json(await dependencyRegistry())
})

opsRoutes.post('/registry', requireAdmin('admin:config'), async (req, res) => {
  const entry = await upsertEntry({ ...req.body, actor: req.admin })
  recordAudit({
    actorId: req.admin.id, actorRole: req.admin.role, actorLabel: req.admin.email,
    action: 'registry.upsert', target: `${entry.kind}:${entry.key}`, result: 'allowed', ip: req.ip,
  })
  res.status(201).json({ status: 'ok', entry })
})
