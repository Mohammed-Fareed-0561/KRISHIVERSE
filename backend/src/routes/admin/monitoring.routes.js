import { Router } from 'express'
import { requireAdmin } from '../../admin/middleware/rbac.js'
import { systemHealth } from '../../admin/services/healthService.js'
import { readinessScorecard, drStatus } from '../../admin/services/readinessService.js'
import {
  chatbotPanel, ragPanel, safetyPanel, cropDoctorPanel, modelPanel,
  languagePanel, coveragePanel, sourcePanel, failurePanel, resolveWindow, reviewSafetyEvent,
} from '../../admin/services/panelsService.js'
import { listErrors, errorSummary, listIncidents, createIncident, updateIncident, incidentSummary, logStream } from '../../admin/services/triageService.js'
import { listBackups } from '../../admin/services/backupService.js'
import { recordAudit } from '../../admin/services/auditService.js'

export const monitoringRoutes = Router()

function windowOf(req) {
  return resolveWindow({ from: req.query.from, to: req.query.to, hours: req.query.hours })
}

monitoringRoutes.get('/health', async (_req, res) => {
  res.json(await systemHealth())
})

monitoringRoutes.get('/chatbot', async (req, res) => {
  res.json(await chatbotPanel(windowOf(req)))
})

monitoringRoutes.get('/rag', async (req, res) => {
  res.json(await ragPanel(windowOf(req)))
})

monitoringRoutes.get('/safety', async (req, res) => {
  res.json(await safetyPanel(windowOf(req)))
})

monitoringRoutes.post('/safety/reviews', requireAdmin('admin:ops'), async (req, res) => {
  const review = await reviewSafetyEvent({
    eventId: req.body?.eventId,
    verdict: req.body?.verdict,
    note: req.body?.note,
    actor: req.admin,
  })
  recordAudit({
    actorId: req.admin.id, actorRole: req.admin.role, actorLabel: req.admin.email,
    action: 'safety.review', target: review.eventId, result: 'allowed', ip: req.ip,
    details: { verdict: review.verdict },
  })
  res.status(201).json({ status: 'ok', review })
})

monitoringRoutes.get('/cropdoctor', async (req, res) => {
  res.json(await cropDoctorPanel(windowOf(req)))
})

monitoringRoutes.get('/models', async (req, res) => {
  res.json(await modelPanel(windowOf(req)))
})

monitoringRoutes.get('/languages', async (req, res) => {
  res.json(await languagePanel(windowOf(req)))
})

monitoringRoutes.get('/coverage', async (req, res) => {
  res.json(await coveragePanel(windowOf(req)))
})

monitoringRoutes.get('/sources', async (_req, res) => {
  res.json(await sourcePanel())
})

monitoringRoutes.get('/failures', async (req, res) => {
  res.json(await failurePanel(windowOf(req)))
})

monitoringRoutes.get('/errors', async (req, res) => {
  res.json({
    status: 'ok',
    summary: await errorSummary({ from: req.query.from, to: req.query.to }),
    errors: await listErrors({
      from: req.query.from, to: req.query.to,
      severity: req.query.severity, code: req.query.code, scope: req.query.scope, limit: req.query.limit,
    }),
  })
})

monitoringRoutes.get('/incidents', async (_req, res) => {
  res.json({ status: 'ok', summary: await incidentSummary(), incidents: await listIncidents({}) })
})

monitoringRoutes.post('/incidents', requireAdmin('admin:incidents'), async (req, res) => {
  const incident = await createIncident({ ...req.body, actor: req.admin })
  recordAudit({
    actorId: req.admin.id, actorRole: req.admin.role, actorLabel: req.admin.email,
    action: 'incident.create', target: incident.incidentId, result: 'allowed', ip: req.ip,
    details: { severity: incident.severity },
  })
  res.status(201).json({ status: 'ok', incident })
})

monitoringRoutes.patch('/incidents/:incidentId', requireAdmin('admin:incidents'), async (req, res) => {
  const incident = await updateIncident({
    incidentId: req.params.incidentId,
    status: req.body?.status,
    note: req.body?.note,
    actor: req.admin,
  })
  recordAudit({
    actorId: req.admin.id, actorRole: req.admin.role, actorLabel: req.admin.email,
    action: 'incident.update', target: incident.incidentId, result: 'allowed', ip: req.ip,
    details: { status: incident.status },
  })
  res.json({ status: 'ok', incident })
})

monitoringRoutes.get('/logs', async (req, res) => {
  res.json(await logStream({ limit: req.query.limit }))
})

monitoringRoutes.get('/readiness', async (_req, res) => {
  res.json(await readinessScorecard())
})

monitoringRoutes.get('/dr', async (_req, res) => {
  res.json(await drStatus({ backups: await listBackups({ limit: 20 }) }))
})
