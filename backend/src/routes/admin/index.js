import { Router } from 'express'
import { requireAdmin } from '../../admin/middleware/rbac.js'
import { adminLimiter } from '../../admin/middleware/adminRateLimit.js'
import { auditMutations } from '../../admin/services/auditService.js'
import { adminErrorHandler } from '../../admin/middleware/adminError.js'
import { captureLog } from '../../admin/services/triageService.js'
import { authRoutes } from './auth.routes.js'
import { telemetryRoutes } from './telemetry.routes.js'
import { monitoringRoutes } from './monitoring.routes.js'
import { farmersRoutes } from './farmers.routes.js'
import { evaluationRoutes } from './evaluation.routes.js'
import { opsRoutes } from './ops.routes.js'

export const adminRouter = Router()

/** Section 33 — capture every admin request into the in-process log ring. */
adminRouter.use((req, res, next) => {
  const started = Date.now()
  res.on('finish', () => {
    captureLog({
      level: res.statusCode >= 400 ? 'warn' : 'info',
      scope: 'admin',
      message: `${req.method} ${req.path} -> ${res.statusCode}`,
      route: req.originalUrl,
      status: res.statusCode,
      ms: Date.now() - started,
      requestId: req.get('x-request-id') || undefined,
    })
  })
  next()
})

/** Section 14 — append-only audit of every state-changing admin request. */
adminRouter.use(auditMutations)

/** Unauthenticated surfaces: session helpers + telemetry ingestion. */
adminRouter.use('/auth', authRoutes)
adminRouter.use('/telemetry', telemetryRoutes)

/** Everything below requires an admin-scope identity and shares one read limiter. */
adminRouter.use(requireAdmin('admin:read'))
adminRouter.use(adminLimiter({ max: 300, scope: 'read' }))

adminRouter.use('/', monitoringRoutes)
adminRouter.use('/', farmersRoutes)
adminRouter.use('/evaluation', evaluationRoutes)
adminRouter.use('/', opsRoutes)

adminRouter.use((req, res) => {
  res.status(404).json({
    status: 'error',
    code: 'not_found',
    message: `Admin route ${req.method} ${req.path} not found`,
  })
})

/** Terminal error handler — admin failures never reach farmer routes. */
adminRouter.use(adminErrorHandler)
