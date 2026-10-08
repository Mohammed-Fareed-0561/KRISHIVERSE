import { randomUUID } from 'node:crypto'
import { ingest } from '../admin/services/telemetryService.js'

/**
 * Server-side auth / onboarding telemetry.
 *
 * Fire-and-forget by contract: telemetry can never delay, alter, or fail an
 * authentication response. Every step is guarded and swallowed.
 *
 * Ownership split (avoid double counting — see docs/auth/authentication-architecture.md):
 *   server emits — signup_success, signup_failure, login_success, login_failure,
 *                  logout, verification_success, verification_failure,
 *                  reset_success, onboarding.step_completed, onboarding.completed
 *   client emits — signup_started, verification_started, reset_started,
 *                  onboarding.started, onboarding.abandoned
 */
export function emitAuthEvent({
  eventType,
  feature = 'auth',
  outcome = 'success',
  req,
  language,
  errorCode,
  metadata,
}) {
  try {
    const session   = String(req?.get?.('x-krishiverse-session') || '').slice(0, 64)
    const request   = String(req?.get?.('x-request-id') || '').slice(0, 64)
    const link      = String(req?.get?.('x-krishiverse-connectivity') || '')
    const connected = ['online', 'offline'].includes(link) ? link : 'unknown'

    const event = {
      schemaVersion: 1,
      eventType,
      occurredAt:    new Date().toISOString(),
      source:        { surface: 'server', appVersion: process.env.npm_package_version || undefined },
      sessionId:     session || 'server',
      requestId:     request || randomUUID(),
      feature,
      outcome,
      language,
      errorCode:     errorCode || undefined,
      connectivity:  connected,
      metadata:      sanitizeMetadata(metadata),
    }

    Promise.resolve()
      .then(() => ingest(event))
      .catch(() => {})
  } catch {
    /* observability must never break the observed request */
  }
}

function sanitizeMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') return undefined
  const out = {}
  for (const [key, value] of Object.entries(metadata)) {
    if (Object.keys(out).length >= 8) break
    if (typeof value === 'number' || typeof value === 'boolean') out[key] = value
    else if (typeof value === 'string') out[key] = value.slice(0, 120)
  }
  return Object.keys(out).length > 0 ? out : undefined
}
