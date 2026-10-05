import request from 'supertest'
import { expect } from 'chai'
import { setupTestApp, teardownTestApp } from './helpers/db.js'

describe('Crops API', () => {
  let app

  before(async () => { app = await setupTestApp() })
  after(async () => { await teardownTestApp() })

  describe('GET /api/v1/crops', () => {
    it('lists all known crops', async () => {
      const res = await request(app).get('/api/v1/crops')

      expect(res.status).to.equal(200)
      expect(res.body.status).to.equal('ok')
      expect(res.body.crops.length).to.be.greaterThan(5)
      const names = res.body.crops.map((c) => c.name)
      expect(names).to.include('paddy')
      expect(names).to.include('tomato')
    })
  })

  describe('GET /api/v1/crops/:name', () => {
    it('returns details for a known crop', async () => {
      const res = await request(app).get('/api/v1/crops/paddy')

      expect(res.status).to.equal(200)
      expect(res.body.crop).to.have.property('npk')
      expect(res.body.crop.npk.N).to.equal(120)
    })

    it('returns 404 for an unknown crop', async () => {
      const res = await request(app).get('/api/v1/crops/dragonfruit')
      expect(res.status).to.equal(404)
    })
  })

  describe('POST /api/v1/crops/recommend', () => {
    let token

    before(async () => {
      const reg = await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'Tester', email: 'tester@example.com', password: 'secret123' })
      token = reg.body.token
    })

    it('requires authentication', async () => {
      const res = await request(app)
        .post('/api/v1/crops/recommend')
        .send({ N: 100, P: 50, K: 50, temperature: 28, humidity: 60, ph: 7, rainfall: 900 })

      expect(res.status).to.equal(401)
    })

    it('returns ranked recommendations', async () => {
      const res = await request(app)
        .post('/api/v1/crops/recommend')
        .set('Authorization', `Bearer ${token}`)
        .send({ N: 100, P: 50, K: 50, temperature: 28, humidity: 60, ph: 7, rainfall: 900, soilType: 'loam' })

      expect(res.status).to.equal(200)
      expect(res.body.recommendations.length).to.equal(5)
      expect(res.body.recommendations[0].score).to.be.greaterThanOrEqual(res.body.recommendations[1].score)
    })

    it('rejects invalid soil values with 400', async () => {
      const res = await request(app)
        .post('/api/v1/crops/recommend')
        .set('Authorization', `Bearer ${token}`)
        .send({ N: 100, P: 50, K: 50, temperature: 28, humidity: 60, ph: 7, rainfall: 900, soilType: 'lava' })

      expect(res.status).to.equal(400)
    })
  })
})