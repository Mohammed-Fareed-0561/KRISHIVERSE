import { Router } from 'express'
import { requireAdmin } from '../../admin/middleware/rbac.js'
import { adminLimiter } from '../../admin/middleware/adminRateLimit.js'
import { ingest, ingestBatch, getHealth, queryEvents } from '../../admin/services/telemetryService.js'
import { captureLog } from '../../admin/services/triageService.js'

export const telemetryRoutes = Router()

const ingestionLimiter = adminLimiter({ windowMs: 60 * 1000, max: 120, scope: 'ingestion' })

/**
 * Public ingestion endpoint — pilot clients (and the server-side observer) write
 * here without an admin token. Payload is schema-validated and rate-limited.
 */
telemetryRoutes.post('/', ingestionLimiter, async (req, res) => {
  const result = await ingest(req.body)
  const status = result.status === 'accepted' ? 202 : result.status === 'duplicate' ? 200 : 422
  res.status(status).json({ status: result.status, eventId: result.eventId, errors: result.errors })
})

telemetryRoutes.post('/batch', ingestionLimiter, async (req, res) => {
  const result = await ingestBatch(req.body)
  const status = result.status === 'rejected' ? 422 : result.status === 'empty' ? 400 : 202
  res.status(status).json({
    status: result.status,
    accepted: result.accepted || 0,
    duplicates: result.duplicates || 0,
    rejected: (result.rejected || []).length,
    errors: (result.rejected || []).slice(0, 5),
  })
})

/** Read side — admin only. */
telemetryRoutes.get('/health', requireAdmin('admin:telemetry'), async (_req, res) => {
  res.json({ status: 'ok', health: await getHealth() })
})

telemetryRoutes.get('/events', requireAdmin('admin:telemetry'), async (req, res) => {
  const events = await queryEvents({
    eventType: req.query.eventType,
    feature: req.query.feature,
    outcome: req.query.outcome,
    from: req.query.from,
    to: req.query.to,
    limit: req.query.limit,
  })
  captureLog({ level: 'info', scope: 'telemetry', message: `events query returned ${events.length}` })
  res.json({ status: 'ok', count: events.length, events })
})
