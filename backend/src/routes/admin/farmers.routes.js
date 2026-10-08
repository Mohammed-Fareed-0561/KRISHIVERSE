import { Router } from 'express'
import { farmerAnalytics } from '../../admin/services/farmerService.js'
import { resolveWindow } from '../../admin/services/panelsService.js'

export const farmersRoutes = Router()

/**
 * GET /api/admin/farmers — adoption, verification, and onboarding funnel.
 * Mounted behind requireAdmin('admin:read'); aggregates only, never PII.
 */
farmersRoutes.get('/farmers', async (req, res) => {
  const { from, to } = resolveWindow({ from: req.query.from, to: req.query.to, hours: req.query.hours })
  res.json(await farmerAnalytics({ from, to }))
})
