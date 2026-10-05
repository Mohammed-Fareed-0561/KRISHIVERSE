import request from 'supertest'
import { expect } from 'chai'
import { setupTestApp, teardownTestApp } from './helpers/db.js'

describe('Health endpoint', () => {
  let app

  before(async () => { app = await setupTestApp() })
  after(async () => { await teardownTestApp() })

  it('GET /api/v1/health returns status ok', async () => {
    const res = await request(app).get('/api/v1/health')
    expect(res.status).to.equal(200)
    expect(res.body.status).to.equal('ok')
    expect(res.body.service).to.equal('KrishiVerse API')
    expect(res.body.capabilities).to.have.property('groqEnabled')
    expect(res.body.capabilities).to.have.property('geminiEnabled')
  })

  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/api/v1/does-not-exist')
    expect(res.status).to.equal(404)
    expect(res.body.status).to.equal('error')
  })
})