import request from 'supertest'
import { expect } from 'chai'
import { setupTestApp, teardownTestApp, clearDatabase } from './helpers/db.js'
import { User } from '../src/models/User.js'
import { signToken } from '../src/services/jwt.js'
import { recordAuditAwait } from '../src/admin/services/auditService.js'

describe('Admin farmer analytics', () => {
  let app
  let adminToken

  before(async () => { app = await setupTestApp() })
  after(async () => { await teardownTestApp() })
  beforeEach(async () => {
    await clearDatabase()
    const admin = await User.create({ name: 'Admin', email: 'admin@example.com', password: 'secret123', role: 'superadmin' })
    adminToken = signToken({ id: admin._id, email: admin.email, role: 'superadmin' })
  })

  const get = (path) => request(app).get(path).set('Authorization', `Bearer ${adminToken}`)

  async function farmer(email, overrides = {}) {
    return User.create({ name: 'Farmer One', email, password: 'secret123', role: 'farmer', ...overrides })
  }

  it('requires an admin-scope identity', async () => {
    const anon = await request(app).get('/api/admin/farmers')
    expect(anon.status).to.equal(401)

    const user = await User.create({ name: 'Farmer', email: 'farmer@example.com', password: 'secret123', role: 'farmer' })
    const farmerToken = signToken({ id: user._id, email: user.email, role: 'farmer' })
    const denied = await request(app).get('/api/admin/farmers').set('Authorization', `Bearer ${farmerToken}`)
    expect(denied.status).to.equal(403)
  })

  it('aggregates registration, verification, activity, and the onboarding funnel', async () => {
    const now = new Date()
    await farmer('one@example.com', {
      emailVerifiedAt: now,
      lastLoginAt: now,
      language: 'ta',
      crops: ['paddy'],
      onboarding: { step: 6, startedAt: now, completedAt: now },
    })
    await farmer('two@example.com', {
      emailVerifiedAt: now,
      language: 'tanglish',
      crops: ['paddy', 'tomato'],
      onboarding: { step: 3, startedAt: now },
    })
    await farmer('three@example.com', { language: 'hi', onboarding: { step: 0 } })
    // Staff accounts must never count as pilot farmers.
    await User.create({ name: 'Staff', email: 'staff@example.com', password: 'secret123', role: 'admin' })

    const res = await get('/api/admin/farmers?hours=8760')

    expect(res.status).to.equal(200)
    expect(res.body.label).to.contain('NO PII')
    expect(res.body.snapshot.registered).to.equal(3)
    expect(res.body.snapshot.verified).to.equal(2)
    expect(res.body.snapshot.verifiedPct).to.equal(66.7)
    expect(res.body.snapshot.accountsExcluded).to.contain('superadmin')

    expect(res.body.funnel.started).to.equal(2)
    expect(res.body.funnel.completed).to.equal(1)
    expect(res.body.funnel.notStarted).to.equal(1)
    expect(res.body.funnel.abandoned).to.equal(0)
    expect(res.body.funnel.byStep).to.deep.equal([
      { step: 0, count: 1 },
      { step: 3, count: 1 },
      { step: 6, count: 1 },
    ])

    expect(res.body.distributions.language).to.deep.equal({ ta: 1, tanglish: 1, hi: 1 })
    expect(res.body.distributions.crop[0]).to.deep.equal({ key: 'paddy', count: 2 })
    expect(res.body.distributions.crop[1]).to.deep.equal({ key: 'tomato', count: 1 })
    expect(res.body.note).to.equal(undefined)
  })

  it('computes login success rates from the auth audit trail', async () => {
    await recordAuditAwait({ action: 'auth.login', target: 'one@example.com', result: 'allowed' })
    await recordAuditAwait({ action: 'auth.login', target: 'one@example.com', result: 'allowed' })
    await recordAuditAwait({ action: 'auth.login', target: 'two@example.com', result: 'failed' })

    const res = await get('/api/admin/farmers?hours=8760')

    expect(res.body.activity.logins).to.equal(2)
    expect(res.body.activity.failedLogins).to.equal(1)
    expect(res.body.activity.loginSuccessRatePct).to.equal(66.7)
  })

  it('never returns names or email addresses', async () => {
    await farmer('secret-farmer@example.com', { name: 'Rajesh Kumar' })

    const res = await get('/api/admin/farmers?hours=8760')
    const payload = JSON.stringify(res.body)

    expect(payload).to.not.contain('secret-farmer@example.com')
    expect(payload).to.not.contain('Rajesh Kumar')
    expect(payload).to.not.contain('@example.com')
  })

  it('explains the empty state before the pilot starts', async () => {
    const res = await get('/api/admin/farmers?hours=8760')
    expect(res.body.snapshot.registered).to.equal(0)
    expect(res.body.note).to.contain('No pilot farmer accounts')
    expect(res.body.funnel.completionPct).to.equal(null)
  })

  it('honours the time window for signups and logins', async () => {
    await farmer('recent@example.com')
    await recordAuditAwait({ action: 'auth.login', target: 'recent@example.com', result: 'allowed' })

    const res = await get('/api/admin/farmers?from=2020-01-01T00:00:00.000Z&to=2020-01-02T00:00:00.000Z')
    expect(res.body.activity.registeredInWindow).to.equal(0)
    expect(res.body.activity.logins).to.equal(0)
    expect(res.body.snapshot.registered).to.equal(1)
  })
})
