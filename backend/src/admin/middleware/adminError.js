import { AdminError } from '../store/collections.js'
import { createLogger } from '../../utils/logger.js'
import { ServiceError } from '../services/telemetryService.js'

const log = createLogger('admin')

function recordError({ severity, code, scope, route, method, message, requestId, context }) {
  try {
    AdminError.create({
      at: new Date(),
      severity,
      code: code || 'unknown',
      scope,
      route: route || null,
      method: method || null,
      message: String(message || '').slice(0, 500),
      requestId: requestId || null,
      context: context || undefined,
    }).catch(() => {})
  } catch {
    /* error reporting must never mask the original error */
  }
}

/**
 * Terminal error handler for the admin router only.
 * Farmer requests never pass through here, so a monitoring failure cannot
 * change what a farmer receives.
 */
export function adminErrorHandler(err, req, res, _next) {
  const status = Number.isInteger(err?.status) ? err.status : 500
  const code = err instanceof ServiceError ? err.code : err?.code || 'admin_error'

  if (status >= 500) log.error({ msg: 'admin route failed', code, route: req.path, error: err?.message })

  recordError({
    severity: status >= 500 ? 'error' : 'warning',
    code,
    scope: 'admin',
    route: req.baseUrl + req.path,
    method: req.method,
    message: err?.message,
    requestId: req.get('x-request-id') || undefined,
    context: { status },
  })

  res.status(status).json({
    status: 'error',
    code,
    message: status >= 500 && process.env.NODE_ENV === 'production'
      ? 'Admin endpoint failed'
      : err?.message || 'Admin endpoint failed',
  })
}
