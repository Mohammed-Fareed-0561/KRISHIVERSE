import request from 'supertest'
import { expect } from 'chai'
import { EventEmitter } from 'node:events'
import { setupTestApp, teardownTestApp, clearDatabase } from './helpers/db.js'
import { User } from '../src/models/User.js'
import { signToken } from '../src/services/jwt.js'
import { requestTelemetry } from '../src/admin/middleware/requestTelemetry.js'

async function tokenFor(role) {
  const user = await User.create({ name: role, email: `${role}@example.com`, password: 'secret123', role })
  return signToken({ id: user._id, email: user.email, role: user.role })
}

describe('Admin isolation and RBAC', () => {
  let app
  let tokens

  before(async () => { app = await setupTestApp() })
  after(async () => { await teardownTestApp() })
  beforeEach(async () => {
    await clearDatabase()
    tokens = {
      superadmin: await tokenFor('superadmin'),
      admin: await tokenFor('admin'),
      auditor: await tokenFor('auditor'),
      viewer: await tokenFor('viewer'),
      farmer: await tokenFor('farmer'),
    }
  })

  const get = (path, role) => request(app).get(path).set('Authorization', `Bearer ${tokens[role]}`)
  const post = (path, role, body = {}) => request(app).post(path).set('Authorization', `Bearer ${tokens[role]}`).send(body)

  it('is not mounted under the farmer API prefix', async () => {
    const res = await request(app).get('/api/v1/admin/health')
    expect(res.status).to.equal(404)
    expect(res.body.message).to.contain('/admin/health not found')
  })

  it('rejects anonymous, malformed, and farmer tokens', async () => {
    expect((await request(app).get('/api/admin/health')).status).to.equal(401)
    expect((await request(app).get('/api/admin/health').set('Authorization', 'Bearer garbage')).status).to.equal(401)
    expect((await get('/api/admin/health', 'farmer')).status).to.equal(403)
  })

  it('lets every admin role read, and gates ops on permissions', async () => {
    for (const role of ['superadmin', 'admin', 'auditor', 'viewer']) {
      const res = await get('/api/admin/health', role)
      expect(res.status, `${role} read`).to.equal(200)
    }

    expect((await post('/api/admin/backups', 'viewer')).status, 'viewer backup').to.equal(403)
    expect((await post('/api/admin/backups', 'viewer')).body.code).to.equal('missing_permission')

    expect((await post('/api/admin/incidents', 'auditor', { title: 'Audit note', severity: 'sev3' })).status, 'auditor incident').to.equal(201)
    expect((await post('/api/admin/incidents', 'viewer', { title: 'Nope', severity: 'sev3' })).status, 'viewer incident').to.equal(403)

    const restoreAttempt = await post('/api/admin/backups/bk_none/restore', 'admin', { confirm: true })
    expect(restoreAttempt.status, 'admin cannot restore').to.equal(403)
  })

  it('reserves rollback for superadmin', async () => {
    const adminRestore = await post('/api/admin/backups/bk_none/restore', 'admin', { confirm: true })
    expect(adminRestore.status).to.equal(403)
    expect(adminRestore.body.code).to.equal('missing_permission')

    const superRestore = await post('/api/admin/backups/bk_none/restore', 'superadmin', { confirm: true })
    expect(superRestore.status).to.equal(404)
    expect(superRestore.body.code).to.equal('backup_not_found')
  })

  it('audits denied access attempts', async () => {
    await get('/api/admin/audit', 'viewer')
    const audit = await get('/api/admin/audit/summary', 'auditor')
    expect(audit.status).to.equal(200)
    expect(audit.body.summary.byResult.denied).to.be.greaterThan(0)
  })

  it('contains admin route errors behind the admin error handler', async () => {
    const failure = await post('/api/admin/safety/reviews', 'superadmin', {})
    expect(failure.status).to.equal(500)
    expect(failure.body).to.include({ status: 'error' })
    expect(failure.body.code).to.be.a('string')

    const farmerHealth = await request(app).get('/api/v1/health')
    expect(farmerHealth.status).to.equal(200)
    expect(farmerHealth.body.status).to.equal('ok')
  })

  it('returns admin-shaped 404 for unknown admin routes', async () => {
    const res = await get('/api/admin/nope', 'superadmin')
    expect(res.status).to.equal(404)
    expect(res.body.code).to.equal('not_found')
  })

  it('farmer traffic keeps working immediately after admin traffic', async () => {
    await get('/api/admin/health', 'superadmin')
    await post('/api/admin/telemetry', 'farmer', {
      schemaVersion: 1, eventType: 'health.probe', occurredAt: new Date().toISOString(),
      sessionId: 's1', feature: 'other', outcome: 'success',
    })
    const res = await request(app).get('/api/v1/health')
    expect(res.status).to.equal(200)
  })
})

describe('requestTelemetry middleware (farmer-path observer)', () => {
  function makeRes(statusCode = 200) {
    const res = new EventEmitter()
    res.statusCode = statusCode
    res.get = () => undefined
    return res
  }

  it('calls next synchronously and never blocks the response', () => {
    const middleware = requestTelemetry()
    const req = { path: '/api/v1/advisory/chat', originalUrl: '/api/v1/advisory/chat', method: 'POST', get: () => undefined }
    const res = makeRes(200)
    let nextCalls = 0

    middleware(req, res, () => { nextCalls += 1 })

    expect(nextCalls).to.equal(1)
    expect(res.statusCode).to.equal(200)
  })

  it('swallows every failure when the observation runs', async () => {
    const middleware = requestTelemetry()
    const req = { path: '/api/v1/weather/current', originalUrl: '/api/v1/weather/current', method: 'GET', get: () => undefined }
    const res = makeRes(500)

    middleware(req, res, () => {})
    expect(() => res.emit('finish')).to.not.throw()
    expect(res.statusCode).to.equal(500)

    await new Promise((resolve) => setImmediate(resolve))
  })

  it('does not mutate the response object', () => {
    const middleware = requestTelemetry()
    const req = { path: '/api/v1/crops/list', originalUrl: '/api/v1/crops/list', method: 'GET', get: () => undefined }
    const res = makeRes(204)
    middleware(req, res, () => {})
    res.emit('finish')
    expect(res.statusCode).to.equal(204)
  })
})
