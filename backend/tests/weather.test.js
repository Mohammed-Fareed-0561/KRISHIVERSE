import request from 'supertest'
import { expect } from 'chai'
import { setupTestApp, teardownTestApp } from './helpers/db.js'

describe('Weather API', () => {
  let app

  before(async () => { app = await setupTestApp() })
  after(async () => { await teardownTestApp() })

  describe('GET /api/v1/weather/current', () => {
    it('returns 400 when lat/lon are missing', async () => {
      const res = await request(app).get('/api/v1/weather/current')
      expect(res.status).to.equal(400)
    })

    it('returns weather data for valid coords', async () => {
      const res = await request(app).get('/api/v1/weather/current?lat=11.01&lon=76.95')

      expect(res.status).to.equal(200)
      expect(res.body.status).to.equal('ok')
      expect(res.body.data).to.have.property('weather')
      expect(res.body.data).to.have.property('main')
    })
  })

  describe('GET /api/v1/weather/forecast', () => {
    it('returns 400 when lat/lon are missing', async () => {
      const res = await request(app).get('/api/v1/weather/forecast')
      expect(res.status).to.equal(400)
    })

    it('returns forecast data for valid coords', async () => {
      const res = await request(app).get('/api/v1/weather/forecast?lat=11.01&lon=76.95')

      expect(res.status).to.equal(200)
      expect(res.body.status).to.equal('ok')
      expect(res.body.data).to.have.property('list')
    })
  })
})