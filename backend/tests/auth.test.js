import request from 'supertest'
import { expect } from 'chai'
import { setupTestApp, teardownTestApp, clearDatabase } from './helpers/db.js'

describe('Auth API', () => {
  let app

  before(async () => { app = await setupTestApp() })
  after(async () => { await teardownTestApp() })
  beforeEach(async () => { await clearDatabase() })

  const validUser = {
    name: 'Rajesh Farmer',
    email: 'rajesh@example.com',
    password: 'secure123',
    language: 'ta',
    location: { district: 'Coimbatore' },
  }

  describe('POST /api/v1/auth/register', () => {
    it('registers a user and returns a JWT', async () => {
      const res = await request(app).post('/api/v1/auth/register').send(validUser)

      expect(res.status).to.equal(201)
      expect(res.body.status).to.equal('ok')
      expect(res.body.token).to.be.a('string')
      expect(res.body.user).to.include({ email: validUser.email, name: validUser.name, role: 'farmer', language: 'ta' })
    })

    it('rejects duplicate email with 409', async () => {
      await request(app).post('/api/v1/auth/register').send(validUser)
      const res = await request(app).post('/api/v1/auth/register').send(validUser)

      expect(res.status).to.equal(409)
      expect(res.body.status).to.equal('error')
      expect(res.body.message).to.contain('already registered')
    })

    it('rejects invalid payload with 400', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({ email: 'not-an-email', password: 'x' })

      expect(res.status).to.equal(400)
      expect(res.body.code).to.equal('VALIDATION_ERROR')
    })
  })

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/v1/auth/register').send(validUser)
    })

    it('logs in with correct credentials', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({ email: validUser.email, password: validUser.password })

      expect(res.status).to.equal(200)
      expect(res.body.token).to.be.a('string')
      expect(res.body.user.email).to.equal(validUser.email)
    })

    it('rejects wrong password with 401', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({ email: validUser.email, password: 'wrongpass' })

      expect(res.status).to.equal(401)
    })
  })

  describe('GET /api/v1/auth/me', () => {
    let token

    beforeEach(async () => {
      const reg = await request(app).post('/api/v1/auth/register').send(validUser)
      token = reg.body.token
    })

    it('returns the authenticated user', async () => {
      const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`)

      expect(res.status).to.equal(200)
      expect(res.body.user.email).to.equal(validUser.email)
    })

    it('rejects a missing token with 401', async () => {
      const res = await request(app).get('/api/v1/auth/me')

      expect(res.status).to.equal(401)
    })

    it('rejects an invalid token with 401', async () => {
      const res = await request(app).get('/api/v1/auth/me').set('Authorization', 'Bearer not-a-real-token')

      expect(res.status).to.equal(401)
    })
  })
})