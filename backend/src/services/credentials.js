import { createHash, randomBytes, randomInt } from 'node:crypto'

/**
 * Credential helpers for email verification and password reset.
 *
 * Secrets are never stored raw: only SHA-256 digests are persisted, so a
 * database leak cannot be replayed against the API. All TTLs and attempt caps
 * are read from the environment at call time so operators (and tests) can tune
 * them without a restart.
 */

export function readEnvInt(name, fallback) {
  const parsed = Number.parseInt(process.env[name] ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export function isProduction() {
  return process.env.NODE_ENV === 'production'
}

const MINUTE = 60 * 1000
const HOUR   = 60 * MINUTE

export const verificationTtlMs      = () => readEnvInt('AUTH_VERIFICATION_TTL_MS', 15 * MINUTE)
export const verificationMaxAttempt = () => readEnvInt('AUTH_VERIFICATION_MAX_ATTEMPTS', 5)
export const verificationCooldownMs = () => readEnvInt('AUTH_VERIFICATION_COOLDOWN_MS', 1 * MINUTE)
export const resetTtlMs             = () => readEnvInt('AUTH_RESET_TTL_MS', 1 * HOUR)
export const resetCooldownMs        = () => readEnvInt('AUTH_RESET_COOLDOWN_MS', 1 * MINUTE)

export function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex')
}

/** Constant-format numeric code (6 digits by default). */
export function generateCode(length = 6) {
  let code = ''
  for (let i = 0; i < length; i += 1) code += String(randomInt(0, 10))
  return code
}

/** Opaque high-entropy reset token (256 bits). */
export function generateToken() {
  return randomBytes(32).toString('hex')
}

export function constantTimeEqual(a, b) {
  const left  = Buffer.from(String(a))
  const right = Buffer.from(String(b))
  if (left.length !== right.length) return false
  // Timing-safe comparison without throwing on length mismatch.
  let diff = 0
  for (let i = 0; i < left.length; i += 1) diff |= left[i] ^ right[i]
  return diff === 0
}
