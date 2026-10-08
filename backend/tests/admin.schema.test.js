import { expect } from 'chai'
import { validateEvent, validateBatch, SCHEMA_VERSION, EVENT_TYPES } from '../src/admin/schema/eventSchema.js'

function baseEvent(overrides = {}) {
  return {
    schemaVersion: SCHEMA_VERSION,
    eventType: 'chatbot.response',
    occurredAt: new Date().toISOString(),
    sessionId: 'session-abc-123',
    feature: 'chatbot',
    outcome: 'success',
    source: { surface: 'pwa', appVersion: '1.0.0' },
    ...overrides,
  }
}

describe('Admin telemetry schema (v1)', () => {
  it('accepts a minimal valid event and fills defaults', () => {
    const result = validateEvent(baseEvent())
    expect(result.ok).to.equal(true)
    expect(result.errors).to.deep.equal([])
    expect(result.value.eventId).to.be.a('string').and.have.length.greaterThan(8)
    expect(result.value.schemaVersion).to.equal(SCHEMA_VERSION)
  })

  it('accepts a fully populated event', () => {
    const result = validateEvent(baseEvent({
      intent: 'disease',
      language: 'ta',
      latencyMs: 142,
      errorCode: 'TIMEOUT',
      connectivity: 'offline',
      retrieval: { kbVersion: '2', resultCount: 5, sourceCount: 3, latencyMs: 20 },
      model: { name: 'llama-3.1-8b', provider: 'groq', latencyMs: 120, tokensPerSecond: 80 },
      safety: { validatorOutcome: 'blocked', dosageVerified: false, rulesFired: ['numeric_dosage'] },
      experiment: { id: 'rag-v2', variant: 'b' },
      metadata: { route: '/ask', retries: 1, offline: true },
    }))
    expect(result.ok).to.equal(true)
    expect(result.value.safety.rulesFired).to.deep.equal(['numeric_dosage'])
    expect(result.value.metadata.retries).to.equal(1)
  })

  it('rejects a non-object payload without throwing', () => {
    expect(validateEvent(null).ok).to.equal(false)
    expect(validateEvent('nope').ok).to.equal(false)
    expect(validateEvent([]).ok).to.equal(false)
  })

  it('rejects an unknown schema version', () => {
    const result = validateEvent(baseEvent({ schemaVersion: 99 }))
    expect(result.ok).to.equal(false)
    expect(result.errors.join(' ')).to.contain('schemaVersion')
  })

  it('rejects unknown event types and unknown top-level fields', () => {
    expect(validateEvent(baseEvent({ eventType: 'made.up' })).ok).to.equal(false)
    const result = validateEvent(baseEvent({ farmerMessage: 'my leaves are yellow' }))
    expect(result.ok).to.equal(false)
    expect(result.errors.join(' ')).to.contain('unknown field')
  })

  it('requires sessionId, eventType, feature, outcome, and occurredAt', () => {
    const result = validateEvent({ schemaVersion: SCHEMA_VERSION })
    expect(result.ok).to.equal(false)
    for (const field of ['sessionId', 'eventType', 'feature', 'outcome', 'occurredAt']) {
      expect(result.errors.join(' ')).to.contain(field)
    }
  })

  it('rejects unbounded / free-text intent labels (no raw farmer content)', () => {
    expect(validateEvent(baseEvent({ intent: 'my leaves have yellow spots and bugs' })).ok).to.equal(false)
    expect(validateEvent(baseEvent({ intent: 'Disease' })).ok).to.equal(false)
    expect(validateEvent(baseEvent({ intent: 'disease_2' })).ok).to.equal(true)
  })

  it('rejects malformed timestamps and future timestamps', () => {
    expect(validateEvent(baseEvent({ occurredAt: 'yesterday' })).ok).to.equal(false)
    expect(validateEvent(baseEvent({ occurredAt: new Date(Date.now() + 86400000).toISOString() })).ok).to.equal(false)
    expect(validateEvent(baseEvent({ occurredAt: new Date(Date.now() - 40 * 24 * 3600 * 1000).toISOString() })).ok).to.equal(false)
  })

  it('rejects oversized metadata and non-scalar metadata values', () => {
    const manyKeys = Object.fromEntries(Array.from({ length: 9 }, (_, i) => [`k${i}`, i]))
    expect(validateEvent(baseEvent({ metadata: manyKeys })).ok).to.equal(false)
    expect(validateEvent(baseEvent({ metadata: { nested: { a: 1 } } })).ok).to.equal(false)
    expect(validateEvent(baseEvent({ metadata: { text: 'line one\nline two' } })).ok).to.equal(false)
  })

  it('rejects out-of-range numbers instead of coercing them', () => {
    expect(validateEvent(baseEvent({ latencyMs: -5 })).ok).to.equal(false)
    expect(validateEvent(baseEvent({ latencyMs: 'fast' })).ok).to.equal(false)
    expect(validateEvent(baseEvent({ retrieval: { resultCount: 99999 } })).ok).to.equal(false)
  })

  it('rejects invalid enum values for language, outcome, surface', () => {
    expect(validateEvent(baseEvent({ language: 'fr' })).ok).to.equal(false)
    expect(validateEvent(baseEvent({ outcome: 'ok' })).ok).to.equal(false)
    expect(validateEvent(baseEvent({ source: { surface: 'iot' } })).ok).to.equal(false)
  })

  describe('batch validation', () => {
    it('drops only the invalid events', () => {
      const batch = validateBatch({
        events: [baseEvent(), baseEvent({ eventType: 'bogus' }), baseEvent()],
      })
      expect(batch.events).to.have.length(2)
      expect(batch.rejected).to.have.length(1)
    })

    it('rejects duplicate event ids inside one batch', () => {
      const first = baseEvent({ eventId: 'fixed-id' })
      const second = baseEvent({ eventId: 'fixed-id' })
      const batch = validateBatch({ events: [first, second] })
      expect(batch.events).to.have.length(1)
      expect(batch.rejected).to.have.length(1)
      expect(batch.rejected[0].errors.join(' ')).to.contain('duplicate')
    })

    it('rejects non-array payloads and oversized batches', () => {
      expect(validateBatch({ events: 'nope' }).events).to.have.length(0)
      const oversized = validateBatch({ events: Array.from({ length: 51 }, () => baseEvent()) })
      expect(oversized.events).to.have.length(0)
      expect(oversized.rejected[0].errors.join(' ')).to.contain('batch exceeds')
    })
  })

  it('exposes the documented event type list', () => {
    expect(EVENT_TYPES).to.include('chatbot.request')
    expect(EVENT_TYPES).to.include('safety.block')
    expect(EVENT_TYPES).to.include('cropdoctor.diagnose')
    expect(EVENT_TYPES).to.include('model.fallback')
  })
})
