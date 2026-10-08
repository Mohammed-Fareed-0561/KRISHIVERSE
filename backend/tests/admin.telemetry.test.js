import request from 'supertest'
import { expect } from 'chai'
import { setupTestApp, teardownTestApp, clearDatabase } from './helpers/db.js'
import { User } from '../src/models/User.js'
import { signToken } from '../src/services/jwt.js'
import { resetRequestCollector } from '../src/admin/metrics/requestCollector.js'

function validEvent(overrides = {}) {
  return {
    schemaVersion: 1,
    eventType: 'chatbot.response',
    occurredAt: new Date().toISOString(),
    sessionId: 'sess-1',
    feature: 'chatbot',
    outcome: 'success',
    latencyMs: 120,
    language: 'ta',
    source: { surface: 'pwa' },
    ...overrides,
  }
}

async function adminToken(role = 'superadmin') {
  const user = await User.create({ name: 'Admin', email: `${role}@example.com`, password: 'secret123', role })
  return signToken({ id: user._id, email: user.email, role: user.role })
}

describe('Admin telemetry ingestion', () => {
  let app
  let token

  before(async () => { app = await setupTestApp() })
  after(async () => { await teardownTestApp() })
  beforeEach(async () => {
    await clearDatabase()
    resetRequestCollector()
    token = await adminToken()
  })

  it('accepts a valid event without authentication (pilot clients write here)', async () => {
    const res = await request(app).post('/api/admin/telemetry').send(validEvent())
    expect(res.status).to.equal(202)
    expect(res.body.status).to.equal('accepted')
    expect(res.body.eventId).to.be.a('string')
  })

  it('deduplicates repeated event ids instead of double counting', async () => {
    const event = validEvent({ eventId: 'evt-dup-1' })
    const first = await request(app).post('/api/admin/telemetry').send(event)
    const second = await request(app).post('/api/admin/telemetry').send(event)
    expect(first.status).to.equal(202)
    expect(second.status).to.equal(200)
    expect(second.body.status).to.equal('duplicate')

    const health = await request(app).get('/api/admin/telemetry/health').set('Authorization', `Bearer ${token}`)
    expect(health.body.health.totalAccepted).to.equal(1)
    expect(health.body.health.totalDuplicates).to.equal(1)
  })

  it('rejects malformed events with 422 and counts the rejection', async () => {
    const res = await request(app).post('/api/admin/telemetry').send({ hello: 'world' })
    expect(res.status).to.equal(422)
    expect(res.body.status).to.equal('rejected')
    expect(res.body.errors.join(' ')).to.contain('schemaVersion')

    const health = await request(app).get('/api/admin/telemetry/health').set('Authorization', `Bearer ${token}`)
    expect(health.body.health.totalRejected).to.equal(1)
    expect(health.body.health.status).to.equal('degraded')
  })

  it('never throws on a non-object payload', async () => {
    const res = await request(app).post('/api/admin/telemetry').send('not-an-event')
    expect(res.status).to.equal(422)
    expect(res.body.status).to.equal('rejected')
  })

  it('accepts a batch and reports per-event rejections', async () => {
    const res = await request(app).post('/api/admin/telemetry/batch').send({
      events: [validEvent({ eventId: 'b1' }), validEvent({ eventId: 'b2' }), { bad: true }],
    })
    expect(res.status).to.equal(202)
    expect(res.body.accepted).to.equal(2)
    expect(res.body.rejected).to.equal(1)
  })

  it('refuses batches larger than the schema cap', async () => {
    const events = Array.from({ length: 51 }, (_, index) => validEvent({ eventId: `big-${index}` }))
    const res = await request(app).post('/api/admin/telemetry/batch').send({ events })
    expect(res.status).to.equal(422)
    expect(res.body.rejected).to.equal(1)
  })

  it('requires an admin identity for the read side', async () => {
    const noAuth = await request(app).get('/api/admin/telemetry/health')
    expect(noAuth.status).to.equal(401)

    const farmerUser = await User.create({ name: 'Farmer', email: 'farmer@example.com', password: 'secret123', role: 'farmer' })
    const farmerToken = signToken({ id: farmerUser._id, email: farmerUser.email, role: 'farmer' })
    const asFarmer = await request(app).get('/api/admin/telemetry/health').set('Authorization', `Bearer ${farmerToken}`)
    expect(asFarmer.status).to.equal(403)
    expect(asFarmer.body.code).to.equal('forbidden')
  })

  it('returns raw events without any message content', async () => {
    await request(app).post('/api/admin/telemetry').send(validEvent({ eventId: 'evt-raw-1', intent: 'disease' }))
    const res = await request(app).get('/api/admin/telemetry/events').set('Authorization', `Bearer ${token}`)
    expect(res.status).to.equal(200)
    expect(res.body.count).to.equal(1)
    expect(res.body.events[0]).to.have.property('intent', 'disease')
    expect(res.body.events[0]).to.not.have.property('message')
    expect(res.body.events[0]).to.not.have.property('query')
  })

  it('farmer health endpoint still responds after telemetry traffic', async () => {
    await request(app).post('/api/admin/telemetry').send(validEvent())
    const res = await request(app).get('/api/v1/health')
    expect(res.status).to.equal(200)
    expect(res.body.status).to.equal('ok')
  })
})
