import { randomUUID } from 'node:crypto'

export const SCHEMA_VERSION = 1

export const EVENT_TYPES = [
  'session.start',
  'session.end',
  'chatbot.request',
  'chatbot.response',
  'retrieval.query',
  'retrieval.result',
  'safety.block',
  'safety.warn',
  'safety.allow',
  'cropdoctor.diagnose',
  'model.invoke',
  'model.fallback',
  'api.request',
  'sync.conflict',
  'error.unhandled',
  'health.probe',
  'experiment.exposure',
  'auth.signup_started',
  'auth.signup_success',
  'auth.signup_failure',
  'auth.login_success',
  'auth.login_failure',
  'auth.logout',
  'auth.verification_started',
  'auth.verification_success',
  'auth.verification_failure',
  'auth.reset_started',
  'auth.reset_success',
  'onboarding.started',
  'onboarding.step_completed',
  'onboarding.completed',
  'onboarding.abandoned',
]

export const FEATURES = [
  'chatbot',
  'cropdoctor',
  'weather',
  'prices',
  'calendar',
  'schemes',
  'notifications',
  'advice',
  'decision',
  'auth',
  'onboarding',
  'sync',
  'other',
]

export const SURFACES       = ['web', 'pwa', 'offline', 'server', 'admin', 'unknown']
export const LANGUAGES      = ['en', 'ta', 'hi', 'tanglish', 'other']
export const OUTCOMES       = ['success', 'fallback', 'error', 'timeout', 'offline']
export const CONNECTIVITY   = ['online', 'offline', 'unknown']
export const VALIDATOR_OUTCOMES = ['safe', 'warning', 'high_risk', 'blocked', 'none']

const LABEL_RE   = /^[a-z0-9][a-z0-9_.-]{0,63}$/
const CODE_RE    = /^[A-Z0-9_]{1,64}$/
const RULE_RE    = /^[a-z0-9_]{1,48}$/
const SAFE_TEXT  = /^[^\p{C}]{1,120}$/u

const MAX_BATCH   = 50
const MAX_FUTURE  = 5 * 60 * 1000
const MAX_AGE     = 31 * 24 * 60 * 60 * 1000

function isObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

function str(value, field, errors, { required = false, max = 64, re = null } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) errors.push(`${field} is required`)
    return undefined
  }
  if (typeof value !== 'string') {
    errors.push(`${field} must be a string`)
    return undefined
  }
  if (value.length > max) {
    errors.push(`${field} exceeds ${max} characters`)
    return undefined
  }
  if (re && !re.test(value)) {
    errors.push(`${field} has an invalid format`)
    return undefined
  }
  return value
}

function num(value, field, errors, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    errors.push(`${field} must be a finite number`)
    return undefined
  }
  if (value < min || value > max) {
    errors.push(`${field} must be between ${min} and ${max}`)
    return undefined
  }
  return value
}

function enumOf(value, field, allowed, errors, { required = false } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) errors.push(`${field} is required`)
    return undefined
  }
  if (!allowed.includes(value)) {
    errors.push(`${field} must be one of: ${allowed.join(', ')}`)
    return undefined
  }
  return value
}

function boolOrNull(value, field, errors) {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'boolean') {
    errors.push(`${field} must be a boolean or null`)
    return undefined
  }
  return value
}

const ALLOWED_KEYS = new Set([
  'schemaVersion', 'eventId', 'eventType', 'occurredAt', 'source', 'sessionId', 'requestId',
  'feature', 'intent', 'language', 'retrieval', 'model', 'safety', 'outcome', 'latencyMs',
  'errorCode', 'connectivity', 'experiment', 'metadata',
])

/**
 * Validate and normalize one telemetry event.
 * Never throws: malformed input returns { ok: false, errors }.
 */
export function validateEvent(raw) {
  try {
    if (!isObject(raw)) return { ok: false, errors: ['event must be a JSON object'] }

    const errors = []

    for (const key of Object.keys(raw)) {
      if (!ALLOWED_KEYS.has(key)) errors.push(`unknown field: ${key}`)
    }

    if (raw.schemaVersion !== SCHEMA_VERSION) {
      errors.push(`schemaVersion must be ${SCHEMA_VERSION}`)
    }

    const eventType = enumOf(raw.eventType, 'eventType', EVENT_TYPES, errors, { required: true })
    const feature   = enumOf(raw.feature, 'feature', FEATURES, errors, { required: true })
    const outcome   = enumOf(raw.outcome, 'outcome', OUTCOMES, errors, { required: true })

    const sessionId = str(raw.sessionId, 'sessionId', errors, { required: true, max: 64 })
    const eventId   = str(raw.eventId, 'eventId', errors, { max: 64 }) || randomUUID()
    const requestId = str(raw.requestId, 'requestId', errors, { max: 64 })
    const intent    = str(raw.intent, 'intent', errors, { max: 64, re: LABEL_RE })
    const errorCode = str(raw.errorCode, 'errorCode', errors, { max: 64, re: CODE_RE })

    const language     = enumOf(raw.language, 'language', LANGUAGES, errors)
    const connectivity = enumOf(raw.connectivity, 'connectivity', CONNECTIVITY, errors)

    const latencyMs = num(raw.latencyMs, 'latencyMs', errors, { min: 0, max: 600000 })

    let occurredAt
    if (raw.occurredAt === undefined || raw.occurredAt === null) {
      errors.push('occurredAt is required')
    } else {
      const at = new Date(raw.occurredAt)
      if (Number.isNaN(at.getTime())) {
        errors.push('occurredAt must be an ISO-8601 timestamp')
      } else {
        const now = Date.now()
        if (at.getTime() > now + MAX_FUTURE) errors.push('occurredAt is too far in the future')
        if (at.getTime() < now - MAX_AGE) errors.push('occurredAt is too old')
        if (errors.length === 0) occurredAt = at.toISOString()
      }
    }

    const source = validateSource(raw.source, errors)

    let retrieval
    if (raw.retrieval !== undefined) {
      if (!isObject(raw.retrieval)) errors.push('retrieval must be an object')
      else {
        retrieval = {
          kbVersion:    str(raw.retrieval.kbVersion, 'retrieval.kbVersion', errors, { max: 64 }),
          resultCount:  num(raw.retrieval.resultCount, 'retrieval.resultCount', errors, { min: 0, max: 1000 }),
          sourceCount:  num(raw.retrieval.sourceCount, 'retrieval.sourceCount', errors, { min: 0, max: 1000 }),
          latencyMs:    num(raw.retrieval.latencyMs, 'retrieval.latencyMs', errors, { min: 0, max: 600000 }),
        }
      }
    }

    let model
    if (raw.model !== undefined) {
      if (!isObject(raw.model)) errors.push('model must be an object')
      else {
        model = {
          name:           str(raw.model.name, 'model.name', errors, { max: 64 }),
          provider:       str(raw.model.provider, 'model.provider', errors, { max: 32 }),
          quantization:   str(raw.model.quantization, 'model.quantization', errors, { max: 32 }),
          latencyMs:      num(raw.model.latencyMs, 'model.latencyMs', errors, { min: 0, max: 600000 }),
          tokensPerSecond: num(raw.model.tokensPerSecond, 'model.tokensPerSecond', errors, { min: 0, max: 100000 }),
        }
      }
    }

    let safety
    if (raw.safety !== undefined) {
      if (!isObject(raw.safety)) errors.push('safety must be an object')
      else {
        let rulesFired
        if (raw.safety.rulesFired !== undefined) {
          if (!Array.isArray(raw.safety.rulesFired) || raw.safety.rulesFired.length > 20) {
            errors.push('safety.rulesFired must be an array of at most 20 rule ids')
          } else {
            rulesFired = []
            for (const rule of raw.safety.rulesFired) {
              if (typeof rule !== 'string' || !RULE_RE.test(rule)) {
                errors.push('safety.rulesFired entries must be lowercase rule ids')
                break
              }
              rulesFired.push(rule)
            }
          }
        }
        safety = {
          validatorOutcome: enumOf(raw.safety.validatorOutcome, 'safety.validatorOutcome', VALIDATOR_OUTCOMES, errors),
          dosageVerified:   boolOrNull(raw.safety.dosageVerified, 'safety.dosageVerified', errors),
          rulesFired,
        }
      }
    }

    let experiment
    if (raw.experiment !== undefined) {
      if (!isObject(raw.experiment)) errors.push('experiment must be an object')
      else {
        experiment = {
          id:      str(raw.experiment.id, 'experiment.id', errors, { required: true, max: 32, re: LABEL_RE }),
          variant: str(raw.experiment.variant, 'experiment.variant', errors, { required: true, max: 32, re: LABEL_RE }),
        }
      }
    }

    const metadata = validateMetadata(raw.metadata, errors)

    if (errors.length > 0) return { ok: false, errors }

    return {
      ok: true,
      errors: [],
      value: {
        schemaVersion: SCHEMA_VERSION,
        eventId,
        eventType,
        occurredAt,
        source,
        sessionId,
        requestId,
        feature,
        intent,
        language,
        retrieval,
        model,
        safety,
        outcome,
        latencyMs,
        errorCode,
        connectivity,
        experiment,
        metadata,
      },
    }
  } catch (error) {
    return { ok: false, errors: [`validation failed: ${error?.message || String(error)}`] }
  }
}

function validateSource(raw, errors) {
  if (raw === undefined || raw === null) return undefined
  if (!isObject(raw)) {
    errors.push('source must be an object')
    return undefined
  }
  for (const key of Object.keys(raw)) {
    if (!['surface', 'appVersion', 'locale', 'platform'].includes(key)) errors.push(`unknown field: source.${key}`)
  }
  return {
    surface:    enumOf(raw.surface, 'source.surface', SURFACES, errors),
    appVersion: str(raw.appVersion, 'source.appVersion', errors, { max: 32 }),
    locale:     str(raw.locale, 'source.locale', errors, { max: 32 }),
    platform:   str(raw.platform, 'source.platform', errors, { max: 32 }),
  }
}

function validateMetadata(raw, errors) {
  if (raw === undefined || raw === null) return undefined
  if (!isObject(raw)) {
    errors.push('metadata must be an object')
    return undefined
  }
  const keys = Object.keys(raw)
  if (keys.length > 8) {
    errors.push('metadata supports at most 8 keys')
    return undefined
  }
  const out = {}
  for (const key of keys) {
    if (!LABEL_RE.test(key)) {
      errors.push(`metadata key ${key} has an invalid format`)
      continue
    }
    const value = raw[key]
    if (typeof value === 'string') {
      if (!SAFE_TEXT.test(value)) {
        errors.push(`metadata.${key} must be a single-line string of at most 120 characters`)
        continue
      }
      out[key] = value
    } else if (typeof value === 'number' && Number.isFinite(value)) {
      out[key] = value
    } else if (typeof value === 'boolean') {
      out[key] = value
    } else {
      errors.push(`metadata.${key} must be a string, number, or boolean`)
    }
  }
  return out
}

/**
 * Validate a batch payload. Individual bad events are dropped, not rejected wholesale.
 * Returns { events, rejected: [{ eventId, errors }] }.
 */
export function validateBatch(raw) {
  if (!isObject(raw) || !Array.isArray(raw.events)) {
    return { events: [], rejected: [{ eventId: null, errors: ['events must be an array'] }] }
  }
  if (raw.events.length > MAX_BATCH) {
    return { events: [], rejected: [{ eventId: null, errors: [`batch exceeds ${MAX_BATCH} events`] }] }
  }
  const events    = []
  const rejected  = []
  const seen      = new Set()
  for (const item of raw.events) {
    const result = validateEvent(item)
    if (!result.ok) {
      rejected.push({ eventId: typeof item?.eventId === 'string' ? item.eventId : null, errors: result.errors })
      continue
    }
    if (seen.has(result.value.eventId)) {
      rejected.push({ eventId: result.value.eventId, errors: ['duplicate eventId inside batch'] })
      continue
    }
    seen.add(result.value.eventId)
    events.push(result.value)
  }
  return { events, rejected }
}

export { MAX_BATCH }
