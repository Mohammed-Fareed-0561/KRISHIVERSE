import { verifyToken } from '../../services/jwt.js'
import { recordAudit } from '../services/auditService.js'

export const ADMIN_ROLES = ['superadmin', 'admin', 'auditor', 'viewer']

export const PERMISSIONS = {
  'admin:read':      ['superadmin', 'admin', 'auditor', 'viewer'],
  'admin:telemetry': ['superadmin', 'admin', 'auditor', 'viewer'],
  'admin:audit':     ['superadmin', 'admin', 'auditor'],
  'admin:incidents': ['superadmin', 'admin', 'auditor'],
  'admin:ops':       ['superadmin', 'admin'],
  'admin:backup':    ['superadmin', 'admin'],
  'admin:rollback':  ['superadmin'],
  'admin:config':    ['superadmin', 'admin'],
}

export function roleHasPermission(role, permission) {
  const allowed = PERMISSIONS[permission]
  return Array.isArray(allowed) && allowed.includes(role)
}

function extractToken(req) {
  const header = req.headers.authorization || ''
  const [, token] = header.split(' ')
  return token
}

function deny(res, status, code, message) {
  return res.status(status).json({ status: 'error', code, message })
}

/**
 * Require an authenticated admin-scope identity holding every listed permission.
 * Farmland (role: farmer) identities are never admin-capable.
 */
export function requireAdmin(...permissions) {
  return (req, res, next) => {
    const token = extractToken(req)
    if (!token) return deny(res, 401, 'missing_token', 'Missing Authorization token')

    let claims
    try {
      claims = verifyToken(token)
    } catch {
      return deny(res, 401, 'invalid_token', 'Invalid or expired token')
    }

    const role = claims?.role
    if (!role || role === 'farmer' || !ADMIN_ROLES.includes(role)) {
      recordAudit({
        actorId: claims?.id, actorRole: role, actorLabel: claims?.email,
        action: 'admin.access', target: req.path, result: 'denied',
        details: { reason: 'role_not_admin', role: role || null },
      })
      return deny(res, 403, 'forbidden', 'Admin access required')
    }

    const missing = permissions.filter((permission) => !roleHasPermission(role, permission))
    if (missing.length > 0) {
      recordAudit({
        actorId: claims?.id, actorRole: role, actorLabel: claims?.email,
        action: 'admin.access', target: req.path, result: 'denied',
        details: { reason: 'missing_permission', missing, role },
      })
      return deny(res, 403, 'missing_permission', `Missing permission: ${missing.join(', ')}`)
    }

    req.admin = { id: claims.id, email: claims.email, role }
    return next()
  }
}
