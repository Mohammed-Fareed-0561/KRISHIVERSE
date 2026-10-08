import { Router } from 'express'
import { requireAuth } from '../../middleware/auth.js'
import { requireAdmin, ADMIN_ROLES, PERMISSIONS } from '../../admin/middleware/rbac.js'
import { recordAudit } from '../../admin/services/auditService.js'

export const authRoutes = Router()

/** Who am I — the dashboard gates its UI on this. */
authRoutes.get('/me', requireAdmin('admin:read'), (req, res) => {
  const permissions = Object.entries(PERMISSIONS)
    .filter(([, roles]) => roles.includes(req.admin.role))
    .map(([permission]) => permission)

  res.json({
    status: 'ok',
    admin: { id: req.admin.id, email: req.admin.email, role: req.admin.role, permissions },
  })
})

/** Role reference — read-only, no secrets. */
authRoutes.get('/roles', requireAuth, (_req, res) => {
  res.json({ status: 'ok', roles: ADMIN_ROLES, permissions: PERMISSIONS })
})

/** Explicit, audited logout marker (stateless JWT — the client drops the token). */
authRoutes.post('/logout', requireAdmin('admin:read'), (req, res) => {
  recordAudit({
    actorId: req.admin.id, actorRole: req.admin.role, actorLabel: req.admin.email,
    action: 'admin.logout', target: '/auth/logout', result: 'allowed', ip: req.ip,
  })
  res.json({ status: 'ok' })
})
