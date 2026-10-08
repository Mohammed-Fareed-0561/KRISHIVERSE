import { readEnvInt } from '../services/credentials.js'

/**
 * Per-IP / per-email attempt limiting for credential endpoints.
 *
 * Design notes:
 *  - Limits are read from the environment on every request so operators and
 *    tests can tune them without restarting the process.
 *  - State lives in this process only (pilot runs a single instance). If the
 *    deployment ever moves to multiple instances this must move to a shared
 *    store — see docs/auth/security.md.
 *  - Keys cover both the source IP and the target email, so neither a single
 *    host nor a single account can be hammered from many addresses/accounts.
 */

const MINUTE = 60 * 1000

const failures  = new Map() // key -> { count, resetAt }
const cooldowns = new Map() // key -> until (epoch ms)

const MAX_TRACKED = 5000

function limits() {
  return {
    max:      readEnvInt('AUTH_FAIL_MAX', 5),
    windowMs: readEnvInt('AUTH_FAIL_WINDOW_MS', 15 * MINUTE),
  }
}

function prune(map) {
  if (map.size <= MAX_TRACKED) return
  const now = Date.now()
  for (const [key, value] of map) {
    if (value.resetAt !== undefined && value.resetAt <= now) map.delete(key)
    else if (value !== undefined && value <= now) map.delete(key)
  }
}

function sourceIp(req) {
  return String(req.ip || req.socket?.remoteAddress || 'unknown')
}

function keyFor(prefix, scope, id) {
  return `${prefix}:${scope}:${id}`
}

function isLocked(key, max, windowMs) {
  const record = failures.get(key)
  if (!record) return false
  if (record.resetAt <= Date.now()) {
    failures.delete(key)
    return false
  }
  void windowMs
  return record.count >= max
}

function bump(key, windowMs) {
  const now = Date.now()
  const record = failures.get(key)
  if (!record || record.resetAt <= now) failures.set(key, { count: 1, resetAt: now + windowMs })
  else record.count += 1
  prune(failures)
}

function clear(key) {
  failures.delete(key)
}

function rateLimited(message) {
  const err = new Error(message)
  err.status = 429
  err.code   = 'RATE_LIMITED'
  return err
}

/**
 * Call BEFORE looking a user up. Throws 429 when the IP or email has already
 * burned through its attempt budget, then returns a guard the route reports
 * outcomes to:
 *
 *   guard.fail()     — count this attempt against both keys
 *   guard.succeed()  — clear the email key (the account is legit)
 *
 * Counting happens on every attempt (including unknown emails) so response
 * behaviour cannot be used to probe which addresses exist.
 *
 * @returns {{ fail: () => void, succeed: () => void }}
 */
export function beginAuthAttempt(req, prefix, email) {
  const { max, windowMs } = limits()
  const keys = [keyFor(prefix, 'ip', sourceIp(req))]
  if (email) keys.push(keyFor(prefix, 'email', String(email).toLowerCase()))

  for (const key of keys) {
    if (isLocked(key, max, windowMs)) throw rateLimited('Too many attempts. Please try again later.')
  }

  return {
    fail() {
      for (const key of keys) bump(key, windowMs)
    },
    succeed() {
      if (email) clear(keyFor(prefix, 'email', String(email).toLowerCase()))
    },
  }
}

/**
 * Send cooldown: at most one outbound secret per window per IP or email.
 * Applied for every request — including unknown accounts — so cooldown
 * behaviour never reveals whether an address is registered.
 */
export function enforceSendCooldown(req, prefix, email, cooldownMs) {
  const keys = [keyFor(prefix, 'ip', sourceIp(req))]
  if (email) keys.push(keyFor(prefix, 'email', String(email).toLowerCase()))

  for (const key of keys) {
    const until = cooldowns.get(key)
    if (until !== undefined && until > Date.now()) throw rateLimited('Please wait a moment before requesting again.')
  }
  return () => markSent(keys, cooldownMs)
}

function markSent(keys, cooldownMs) {
  const until = Date.now() + cooldownMs
  for (const key of keys) cooldowns.set(key, until)
  pruneCooldowns()
}

function pruneCooldowns() {
  if (cooldowns.size <= MAX_TRACKED) return
  const now = Date.now()
  for (const [key, until] of cooldowns) if (until <= now) cooldowns.delete(key)
}

/** Drop the failure budget for one account (e.g. after a proven password reset). */
export function clearAuthFailures(prefix, email) {
  if (!email) return
  failures.delete(keyFor(prefix, 'email', String(email).toLowerCase()))
}

/** Test helper — attempt and cooldown state must not leak between test files. */
export function resetAuthAttempts() {
  failures.clear()
  cooldowns.clear()
}
