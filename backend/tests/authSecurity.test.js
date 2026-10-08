import request from 'supertest'
import { expect } from 'chai'
import { setupTestApp, teardownTestApp, clearDatabase } from './helpers/db.js'
import { User } from '../src/models/User.js'
import { AuditLog, TelemetryEvent } from '../src/admin/store/collections.js'

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function waitForEvent(eventType, attempts = 60) {
  for (let i = 0; i < attempts; i += 1) {
    const doc = await TelemetryEvent.findOne({ eventType }).sort({ receivedAt: -1 }).lean()
    if (doc) return doc
    await delay(25)
  }
  return null
}

describe('Farmer authentication security', () => {
  let app

  before(async () => { app = await setupTestApp() })
  after(async () => { delete process.env.AUTH_FAIL_MAX; await teardownTestApp() })
  beforeEach(async () => { await clearDatabase() })

  const base = { name: 'Asha Farmer', email: 'asha@example.com', password: 'secure123', language: 'ta' }
  const register = (payload = base) => request(app).post('/api/v1/auth/register').send(payload)
  const login = (email, password) => request(app).post('/api/v1/auth/login').send({ email, password })

  describe('POST /api/v1/auth/register', () => {
    it('ignores a client-supplied role and any verification flags', async () => {
      const res = await register({ ...base, role: 'superadmin', emailVerified: true })

      expect(res.status).to.equal(201)
      expect(res.body.user.role).to.equal('farmer')
      expect(res.body.user.emailVerified).to.equal(false)
      expect(res.body).to.not.have.property('password')
    })

    it('accepts the tanglish language preference', async () => {
      const res = await register({ ...base, language: 'tanglish' })
      expect(res.status).to.equal(201)
      expect(res.body.user.language).to.equal('tanglish')
    })

    it('issues a 6-digit verification code through the delivery adapter', async () => {
      const res = await register()
      expect(res.status).to.equal(201)
      expect(res.body.delivery).to.equal('dev-response')
      expect(res.body.devCode).to.match(/^\d{6}$/)
      expect(JSON.stringify(res.body)).to.not.contain('"password"')
    })

    it('stores only a hash of the verification code', async () => {
      const res = await register()
      const user = await User.findOne({ email: base.email }).select('+verification')

      expect(user.verification.codeHash).to.be.a('string')
      expect(user.verification.codeHash).to.not.equal(res.body.devCode)
      expect(user.verification.codeHash).to.have.length(64)
    })
  })

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => { await register() })

    it('returns one generic message for unknown email and wrong password', async () => {
      const unknown = await login('nobody@example.com', 'whatever')
      const wrong   = await login(base.email, 'wrongpass')

      expect(unknown.status).to.equal(401)
      expect(wrong.status).to.equal(401)
      expect(unknown.body.message).to.equal(wrong.body.message)
    })

    it('records lastLoginAt on success', async () => {
      const res = await login(base.email, base.password)
      expect(res.status).to.equal(200)
      expect(res.body.user.lastLoginAt).to.be.a('string')
    })

    it('locks the account after AUTH_FAIL_MAX failures, even with correct credentials', async () => {
      const previous = process.env.AUTH_FAIL_MAX
      process.env.AUTH_FAIL_MAX = '3'
      try {
        for (let i = 0; i < 3; i += 1) {
          const failed = await login(base.email, 'wrongpass')
          expect(failed.status).to.equal(401)
        }
        const locked = await login(base.email, base.password)
        expect(locked.status).to.equal(429)
        expect(locked.body.code).to.equal('RATE_LIMITED')
      } finally {
        if (previous === undefined) delete process.env.AUTH_FAIL_MAX
        else process.env.AUTH_FAIL_MAX = previous
      }
    })

    it('shares the per-IP budget across accounts so one host cannot spray passwords', async () => {
      await request(app).post('/api/v1/auth/register').send({ ...base, email: 'second@example.com' })
      for (let i = 0; i < 5; i += 1) await login(base.email, 'wrongpass')
      const other = await login('second@example.com', 'secure123')
      // The shared per-IP budget is exhausted, so both keys must be protected.
      expect(other.status).to.equal(429)
    })

    it('emits auth.login_success telemetry and an audit entry', async () => {
      await login(base.email, base.password)
      const event = await waitForEvent('auth.login_success')
      expect(event).to.be.an('object')
      expect(event.feature).to.equal('auth')
      expect(event.outcome).to.equal('success')

      const audit = await AuditLog.findOne({ action: 'auth.login', result: 'allowed' }).lean()
      expect(audit).to.be.an('object')
      expect(audit.target).to.equal(base.email)
      expect(JSON.stringify(audit)).to.not.contain(base.password)
    })

    it('emits auth.login_failure telemetry for a bad password', async () => {
      await login(base.email, 'wrongpass')
      const event = await waitForEvent('auth.login_failure')
      expect(event).to.be.an('object')
      expect(event.errorCode).to.equal('INVALID_CREDENTIALS')
    })
  })

  describe('email verification', () => {
    beforeEach(async () => { await register() })

    it('never blocks login while the address is unverified', async () => {
      const res = await login(base.email, base.password)
      expect(res.status).to.equal(200)
      expect(res.body.user.emailVerified).to.equal(false)
    })

    it('rejects a wrong code without leaking whether the account exists', async () => {
      const res = await request(app)
        .post('/api/v1/auth/verify/confirm')
        .send({ email: base.email, code: '000000' })

      expect(res.status).to.equal(400)
      expect(res.body.code).to.equal('INVALID_CODE')
      expect(res.body.message).to.equal('Invalid or expired code')

      const unknown = await request(app)
        .post('/api/v1/auth/verify/confirm')
        .send({ email: 'nobody@example.com', code: '123456' })
      expect(unknown.body.message).to.equal(res.body.message)
    })

    it('accepts the delivered code and marks the address verified', async () => {
      const sent = await request(app).post('/api/v1/auth/verify/request').send({ email: base.email })
      const res = await request(app)
        .post('/api/v1/auth/verify/confirm')
        .send({ email: base.email, code: sent.body.devCode })

      expect(res.status).to.equal(200)
      expect(res.body.emailVerified).to.equal(true)

      const session = await login(base.email, base.password)
      const me = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${session.body.token}`)
      expect(me.status).to.equal(200)
      expect(me.body.user.emailVerified).to.equal(true)
    })

    it('rejects an expired code', async () => {
      const sent = await request(app).post('/api/v1/auth/verify/request').send({ email: base.email })
      await User.updateOne({ email: base.email }, { $set: { 'verification.expiresAt': new Date(Date.now() - 1000) } })

      const res = await request(app)
        .post('/api/v1/auth/verify/confirm')
        .send({ email: base.email, code: sent.body.devCode })

      expect(res.status).to.equal(400)
      expect(res.body.code).to.equal('INVALID_CODE')
    })

    it('returns an enumeration-safe response for an unknown address', async () => {
      const res = await request(app).post('/api/v1/auth/verify/request').send({ email: 'nobody@example.com' })
      expect(res.status).to.equal(200)
      expect(res.body.status).to.equal('ok')
      expect(res.body).to.not.have.property('devCode')
    })

    it('rate-limits repeated confirm attempts', async () => {
      for (let i = 0; i < 5; i += 1) {
        const res = await request(app)
          .post('/api/v1/auth/verify/confirm')
          .send({ email: base.email, code: '999999' })
        expect(res.status).to.equal(400)
      }
      const locked = await request(app)
        .post('/api/v1/auth/verify/confirm')
        .send({ email: base.email, code: '999999' })
      expect(locked.status).to.equal(429)
      expect(locked.body.code).to.equal('RATE_LIMITED')
    })

    it('applies a resend cooldown', async () => {
      const first = await request(app).post('/api/v1/auth/verify/request').send({ email: base.email })
      expect(first.status).to.equal(200)
      const second = await request(app).post('/api/v1/auth/verify/request').send({ email: base.email })
      expect(second.status).to.equal(429)
      expect(second.body.code).to.equal('RATE_LIMITED')
    })
  })

  describe('password recovery', () => {
    beforeEach(async () => { await register() })

    it('resets the password with a one-time token and rejects reuse', async () => {
      const forgot = await request(app).post('/api/v1/auth/password/forgot').send({ email: base.email })
      expect(forgot.status).to.equal(200)
      const token = forgot.body.devToken
      expect(token).to.be.a('string')

      const reset = await request(app).post('/api/v1/auth/password/reset').send({ token, password: 'brandNew1' })
      expect(reset.status).to.equal(200)

      expect((await login(base.email, base.password)).status).to.equal(401)
      expect((await login(base.email, 'brandNew1')).status).to.equal(200)

      const reuse = await request(app).post('/api/v1/auth/password/reset').send({ token, password: 'againAgain1' })
      expect(reuse.status).to.equal(400)
      expect(reuse.body.code).to.equal('INVALID_TOKEN')
      expect((await login(base.email, 'brandNew1')).status).to.equal(200)
    })

    it('stores only a hash of the reset token', async () => {
      const forgot = await request(app).post('/api/v1/auth/password/forgot').send({ email: base.email })
      const user = await User.findOne({ email: base.email }).select('+passwordReset')

      expect(user.passwordReset.tokenHash).to.be.a('string')
      expect(user.passwordReset.tokenHash).to.not.contain(forgot.body.devToken)
      expect(user.passwordReset.expiresAt.getTime()).to.be.greaterThan(Date.now())
    })

    it('rejects an expired reset token', async () => {
      const forgot = await request(app).post('/api/v1/auth/password/forgot').send({ email: base.email })
      await User.updateOne({ email: base.email }, { $set: { 'passwordReset.expiresAt': new Date(Date.now() - 1000) } })

      const res = await request(app)
        .post('/api/v1/auth/password/reset')
        .send({ token: forgot.body.devToken, password: 'brandNew1' })

      expect(res.status).to.equal(400)
      expect(res.body.code).to.equal('INVALID_TOKEN')
    })

    it('answers the same way for an unknown address', async () => {
      const known  = await request(app).post('/api/v1/auth/password/forgot').send({ email: base.email })
      await clearDatabase()
      const unknown = await request(app).post('/api/v1/auth/password/forgot').send({ email: 'nobody@example.com' })

      expect(unknown.status).to.equal(200)
      expect(unknown.body).to.not.have.property('devToken')
      expect(unknown.body.delivery).to.equal(known.body.delivery)
    })

    it('applies a resend cooldown', async () => {
      const first = await request(app).post('/api/v1/auth/password/forgot').send({ email: base.email })
      expect(first.status).to.equal(200)
      const second = await request(app).post('/api/v1/auth/password/forgot').send({ email: base.email })
      expect(second.status).to.equal(429)
    })
  })

  describe('POST /api/v1/auth/logout', () => {
    it('requires a token', async () => {
      const res = await request(app).post('/api/v1/auth/logout')
      expect(res.status).to.equal(401)
    })

    it('records an audit entry and telemetry', async () => {
      const reg = await register()
      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${reg.body.token}`)

      expect(res.status).to.equal(200)

      const audit = await AuditLog.findOne({ action: 'auth.logout' }).lean()
      expect(audit).to.be.an('object')
      const event = await waitForEvent('auth.logout')
      expect(event).to.be.an('object')
    })
  })
})
