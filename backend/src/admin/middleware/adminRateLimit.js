import rateLimit from 'express-rate-limit'

/**
 * Admin rate limiting.
 *
 * The enablement check happens per request (not at module load) so test runs —
 * which set NODE_ENV=test after modules are imported — stay deterministic.
 * Admin buckets are separate from the farmer API bucket, so a runaway dashboard
 * refresh can never consume a farmer's request budget.
 */
export function adminLimiter({ windowMs = 15 * 60 * 1000, max = 300, scope = 'read' } = {}) {
  let handler = null

  return (req, res, next) => {
    if (process.env.NODE_ENV === 'test') return next()
    if (!handler) {
      handler = rateLimit({
        windowMs,
        max,
        standardHeaders: true,
        legacyHeaders: false,
        message: { status: 'error', code: 'rate_limited', message: `Admin ${scope} rate limit exceeded` },
      })
    }
    return handler(req, res, next)
  }
}
