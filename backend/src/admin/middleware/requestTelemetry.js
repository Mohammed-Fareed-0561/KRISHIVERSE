import { observeRequest } from '../metrics/requestCollector.js'
import { ingest } from '../services/telemetryService.js'

const FEATURE_BY_PREFIX = {
  '/auth':     'auth',
  '/advisory': 'chatbot',
  '/decision': 'decision',
  '/weather':  'weather',
  '/crops':    'advice',
  '/users':    'sync',
}

const SAMPLE_RATE = Number.parseFloat(process.env.TELEMETRY_SAMPLE_RATE ?? '0.25')

function featureFor(route) {
  for (const [prefix, feature] of Object.entries(FEATURE_BY_PREFIX)) {
    if (route.startsWith(prefix)) return feature
  }
  return 'other'
}

function outcomeFor(status) {
  if (status >= 500) return 'error'
  if (status >= 400) return 'fallback'
  return 'success'
}

/**
 * Passive observer for farmer-facing API traffic.
 *
 * Guarantees:
 *  - never blocks or alters the response (fire-and-forget on 'finish')
 *  - never throws (every step is guarded)
 *  - never awaits anything on the request path
 *  - samples successful traffic so telemetry write volume stays bounded
 */
export function requestTelemetry() {
  return (req, res, next) => {
    const started = Date.now()

    res.on('finish', () => {
      try {
        const ms        = Date.now() - started
        const status    = res.statusCode
        const feature   = featureFor(req.path)
        const outcome   = outcomeFor(status)
        const isFailure = status >= 400
        const sample    = isFailure ? 1 : SAMPLE_RATE

        observeRequest({
          route:   req.originalUrl || req.path,
          method:  req.method,
          status,
          ms,
          feature,
        })

        if (Math.random() > sample) return

        const event = {
          schemaVersion: 1,
          eventType:  'api.request',
          occurredAt: new Date().toISOString(),
          source:     { surface: 'server', appVersion: process.env.npm_package_version || undefined },
          sessionId:  req.get('x-krishiverse-session') || 'server',
          requestId:  req.get('x-request-id') || res.get('x-request-id') || undefined,
          feature,
          outcome,
          latencyMs:  ms,
          errorCode:  status >= 400 ? `HTTP_${status}` : undefined,
          connectivity: req.get('x-krishiverse-connectivity') || 'unknown',
          metadata:   { route: (req.originalUrl || req.path).split('?')[0].slice(0, 120), method: req.method },
        }

        // Observability must never become a dependency of a farmer response.
        Promise.resolve().then(() => ingest(event)).catch(() => {})
      } catch {
        /* observation must never break the observed request */
      }
    })

    next()
  }
}
