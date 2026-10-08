import request from 'supertest'
import { expect } from 'chai'
import { setupTestApp, teardownTestApp, clearDatabase } from './helpers/db.js'
import { User } from '../src/models/User.js'
import { TelemetryEvent } from '../src/admin/store/collections.js'

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function waitForEvent(eventType, attempts = 60) {
  for (let i = 0; i < attempts; i += 1) {
    const doc = await TelemetryEvent.findOne({ eventType }).sort({ receivedAt: -1 }).lean()
    if (doc) return doc
    await delay(25)
  }
  return null
}

describe('Farmer profile & onboarding API', () => {
  let app
  let token

  before(async () => { app = await setupTestApp() })
  after(async () => { await teardownTestApp() })
  beforeEach(async () => {
    await clearDatabase()
    const reg = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Priya', email: 'priya@example.com', password: 'secret123', language: 'ta' })
    token = reg.body.token
  })

  const auth = () => ({ Authorization: `Bearer ${token}` })

  describe('PUT /api/v1/users/profile', () => {
    it('stores the pilot profile fields', async () => {
      const res = await request(app).put('/api/v1/users/profile').set(auth()).send({
        village: 'Kinathukadavu',
        crops: ['paddy', 'sugarcane'],
        farmSize: { value: 3.5, unit: 'acre' },
        irrigation: 'borewell',
        experienceYears: 12,
        notifications: { sms: false, push: true },
        unitPrefs: { area: 'acre', temperature: 'c' },
      })

      expect(res.status).to.equal(200)
      expect(res.body.user.village).to.equal('Kinathukadavu')
      expect(res.body.user.crops).to.deep.equal(['paddy', 'sugarcane'])
      expect(res.body.user.farmSize).to.deep.equal({ value: 3.5, unit: 'acre' })
      expect(res.body.user.irrigation).to.equal('borewell')
      expect(res.body.user.notifications.sms).to.equal(false)
      expect(res.body.user.profileRevision).to.equal(2)
    })

    it('strips privileged fields instead of applying them', async () => {
      const res = await request(app).put('/api/v1/users/profile').set(auth()).send({
        role: 'superadmin',
        email: 'attacker@example.com',
        emailVerified: true,
        profileRevision: 999,
        name: 'Priya Updated',
      })

      expect(res.status).to.equal(200)
      expect(res.body.user.role).to.equal('farmer')
      expect(res.body.user.email).to.equal('priya@example.com')
      expect(res.body.user.emailVerified).to.equal(false)
      expect(res.body.user.profileRevision).to.equal(2)
      expect(res.body.user.name).to.equal('Priya Updated')
    })

    it('rejects malformed values', async () => {
      const res = await request(app).put('/api/v1/users/profile').set(auth()).send({
        crops: Array(20).fill('paddy'),
        irrigation: 'raindance',
      })
      expect(res.status).to.equal(400)
      expect(res.body.code).to.equal('VALIDATION_ERROR')
    })
  })

  describe('POST /api/v1/users/profile/sync', () => {
    const putProfile = (body) => request(app).put('/api/v1/users/profile').set(auth()).send(body)

    it('requires authentication', async () => {
      const res = await request(app).post('/api/v1/users/profile/sync').send({ batch: [] })
      expect(res.status).to.equal(401)
    })

    it('applies an edit built on the current revision', async () => {
      const current = await putProfile({ village: 'Online village' })
      const revision = current.body.user.profileRevision

      const res = await request(app).post('/api/v1/users/profile/sync').set(auth()).send({
        batch: [{ baseRevision: revision, profile: { village: 'Offline village' } }],
      })

      expect(res.status).to.equal(200)
      expect(res.body.results[0].status).to.equal('applied')
      expect(res.body.user.village).to.equal('Offline village')

      const stored = await User.findOne({ email: 'priya@example.com' })
      expect(stored.village).to.equal('Offline village')
    })

    it('keeps the server copy when the client edit is stale', async () => {
      const first = await putProfile({ village: 'Server wins' })
      const staleRevision = first.body.user.profileRevision - 1

      const res = await request(app).post('/api/v1/users/profile/sync').set(auth()).send({
        batch: [{ baseRevision: staleRevision, profile: { village: 'Stale offline edit' } }],
      })

      expect(res.status).to.equal(200)
      expect(res.body.results[0].status).to.equal('conflict')
      expect(res.body.user.village).to.equal('Server wins')

      const stored = await User.findOne({ email: 'priya@example.com' })
      expect(stored.village).to.equal('Server wins')
      expect(stored.profileRevision).to.equal(first.body.user.profileRevision)
    })

    it('never blindly overwrites when baseRevision is missing', async () => {
      await putProfile({ village: 'Authoritative' })
      const res = await request(app).post('/api/v1/users/profile/sync').set(auth()).send({
        batch: [{ profile: { village: 'Unversioned write' } }],
      })

      expect(res.body.results[0].status).to.equal('conflict')
      expect(res.body.user.village).to.equal('Authoritative')
    })

    it('validates the batch shape', async () => {
      const empty = await request(app).post('/api/v1/users/profile/sync').set(auth()).send({ batch: [] })
      expect(empty.status).to.equal(400)

      const oversized = await request(app).post('/api/v1/users/profile/sync').set(auth()).send({
        batch: Array.from({ length: 11 }, () => ({ baseRevision: 1, profile: { village: 'x' } })),
      })
      expect(oversized.status).to.equal(400)
    })

    it('applies offline onboarding progress carried by the outbox', async () => {
      const res = await request(app).post('/api/v1/users/profile/sync').set(auth()).send({
        batch: [{ baseRevision: 1, profile: { village: 'Offline village' }, onboarding: { step: 4 } }],
      })

      expect(res.body.results[0].status).to.equal('applied')
      expect(res.body.user.onboarding.step).to.equal(4)
      expect(res.body.user.onboarding.startedAt).to.be.a('string')
      expect(res.body.user.village).to.equal('Offline village')
    })

    it('never rolls onboarding backwards from a stale outbox entry', async () => {
      await request(app).put('/api/v1/users/onboarding').set(auth()).send({ step: 6 })

      const res = await request(app).post('/api/v1/users/profile/sync').set(auth()).send({
        batch: [{ baseRevision: 2, profile: { village: 'Late edit' }, onboarding: { step: 2 } }],
      })

      expect(res.body.user.onboarding.step).to.equal(6)
      expect(res.body.user.onboarding.completedAt).to.be.a('string')
      expect(res.body.user.village).to.equal('Late edit')
    })
  })

  describe('PUT /api/v1/users/onboarding', () => {
    it('records step progress and the start timestamp', async () => {
      const res = await request(app).put('/api/v1/users/onboarding').set(auth()).send({ step: 2 })

      expect(res.status).to.equal(200)
      expect(res.body.user.onboarding.step).to.equal(2)
      expect(res.body.user.onboarding.startedAt).to.be.a('string')
      expect(res.body.user.onboarding.completedAt).to.equal(null)
    })

    it('saves profile fields collected by the step in one write', async () => {
      const res = await request(app).put('/api/v1/users/onboarding').set(auth()).send({
        step: 3,
        profile: { village: 'Oddanchatram', crops: ['tomato'], language: 'tanglish' },
      })

      expect(res.status).to.equal(200)
      expect(res.body.user.village).to.equal('Oddanchatram')
      expect(res.body.user.language).to.equal('tanglish')
      expect(res.body.user.onboarding.step).to.equal(3)
      expect(res.body.user.profileRevision).to.equal(2)
    })

    it('marks completion at the final step and emits telemetry', async () => {
      await request(app).put('/api/v1/users/onboarding').set(auth()).send({ step: 1 })
      const res = await request(app).put('/api/v1/users/onboarding').set(auth()).send({ step: 6 })

      expect(res.status).to.equal(200)
      expect(res.body.user.onboarding.completedAt).to.be.a('string')

      const completed = await waitForEvent('onboarding.completed')
      expect(completed).to.be.an('object')
      expect(completed.feature).to.equal('onboarding')

      const stepped = await TelemetryEvent.findOne({ eventType: 'onboarding.step_completed' }).lean()
      expect(stepped).to.be.an('object')
    })

    it('tracks abandonment and clears it when the farmer returns', async () => {
      await request(app).put('/api/v1/users/onboarding').set(auth()).send({ step: 2, status: 'abandoned' })
      const abandoned = await request(app).get('/api/v1/users/profile').set(auth())
      expect(abandoned.body.user.onboarding.abandonedAt).to.be.a('string')

      const resumed = await request(app).put('/api/v1/users/onboarding').set(auth()).send({ step: 3 })
      expect(resumed.body.user.onboarding.abandonedAt).to.equal(null)
      expect(resumed.body.user.onboarding.completedAt).to.equal(null)
    })

    it('rejects an out-of-range step', async () => {
      const res = await request(app).put('/api/v1/users/onboarding').set(auth()).send({ step: 9 })
      expect(res.status).to.equal(400)
      expect(res.body.code).to.equal('VALIDATION_ERROR')
    })
  })
})
