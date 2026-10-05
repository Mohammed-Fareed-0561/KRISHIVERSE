import request from 'supertest'
import { expect } from 'chai'
import { setupTestApp, teardownTestApp, clearDatabase } from './helpers/db.js'

describe('Users API', () => {
  let app
  let token

  before(async () => { app = await setupTestApp() })
  after(async () => { await teardownTestApp() })
  beforeEach(async () => {
    await clearDatabase()
    const reg = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Priya', email: 'priya@example.com', password: 'secret123', language: 'ta', location: { district: 'Madurai' } })
    token = reg.body.token
  })

  describe('GET /api/v1/users/profile', () => {
    it('requires authentication', async () => {
      const res = await request(app).get('/api/v1/users/profile')
      expect(res.status).to.equal(401)
    })

    it('returns the profile of the authenticated user', async () => {
      const res = await request(app).get('/api/v1/users/profile').set('Authorization', `Bearer ${token}`)

      expect(res.status).to.equal(200)
      expect(res.body.user.email).to.equal('priya@example.com')
      expect(res.body.user.location.district).to.equal('Madurai')
    })
  })

  describe('PUT /api/v1/users/profile', () => {
    it('updates the profile', async () => {
      const res = await request(app)
        .put('/api/v1/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ language: 'en', location: { district: 'Coimbatore' } })

      expect(res.status).to.equal(200)
      expect(res.body.user.language).to.equal('en')
      expect(res.body.user.location.district).to.equal('Coimbatore')
    })

    it('rejects invalid language with 400', async () => {
      const res = await request(app)
        .put('/api/v1/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ language: 'klingon' })

      expect(res.status).to.equal(400)
    })
  })
})