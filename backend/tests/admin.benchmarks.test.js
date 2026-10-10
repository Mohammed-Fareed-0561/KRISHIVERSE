import request from 'supertest'
import { expect } from 'chai'
import { setupTestApp, teardownTestApp, clearDatabase } from './helpers/db.js'
import { User } from '../src/models/User.js'
import { signToken } from '../src/services/jwt.js'

const BENCHMARK_LABEL = 'BENCHMARK EVALUATION — ISOLATED HARNESS, NOT PRODUCTION TELEMETRY'
const EXPECTED = ['chatbot', 'rag', 'decision', 'grounding', 'cropdoctor', 'imagequality', 'offline', 'mobile']

describe('Admin benchmark panels (Rice mobile AI benchmark)', () => {
  let app
  let token

  before(async () => { app = await setupTestApp() })
  after(async () => { await teardownTestApp() })
  beforeEach(async () => {
    await clearDatabase()
    const user = await User.create({ name: 'Admin', email: 'admin@example.com', password: 'secret123', role: 'superadmin' })
    token = signToken({ id: user._id, email: user.email, role: 'superadmin' })
  })

  const get = (path) => request(app).get(path).set('Authorization', `Bearer ${token}`)

  it('serves the dashboard with the benchmark label and every known result slot', async () => {
    const res = await get('/api/admin/benchmarks')
    expect(res.status).to.equal(200)
    expect(res.body.label).to.equal(BENCHMARK_LABEL)
    expect(res.body.methodology).to.be.a('string')
    for (const name of EXPECTED) {
      expect(res.body.results, name).to.have.property(name)
      const entry = res.body.results[name]
      if (entry.available) {
        expect(entry.dataClass, name).to.equal('benchmark-evaluation')
        expect(entry.arms, name).to.be.an('array').that.is.not.empty
        expect(entry.limitations, name).to.be.an('array')
        expect(entry.origin, name).to.be.a('string').that.is.not.empty
      } else {
        expect(entry.reason, name).to.be.a('string').that.includes('npm run eval:mobile-ai')
      }
    }
  })

  it('exposes the decision matrix with the §23 vocabulary when built', async () => {
    const res = await get('/api/admin/benchmarks')
    const matrix = res.body.decisionMatrix
    if (matrix) {
      expect(matrix.dataClass).to.equal('benchmark-evaluation')
      expect(matrix.rows).to.be.an('array').that.is.not.empty
      for (const row of matrix.rows) {
        expect(row).to.have.property('technology')
        expect(['ADOPT', 'PILOT', 'KEEP AS FALLBACK', 'REJECT', 'NEEDS MORE DATA']).to.include(row.recommendation)
        expect(row.evidence).to.be.a('string').that.is.not.empty
      }
    } else {
      expect(res.body.unavailablePanels.some((p) => p.name === 'decision-matrix')).to.equal(true)
    }
  })

  it('serves a single benchmark including safety findings blocks', async () => {
    const res = await get('/api/admin/benchmarks/grounding')
    expect(res.status).to.equal(200)
    if (res.body.available) {
      expect(res.body.title).to.be.a('string')
      expect(res.body).to.have.property('safetyCrosscheck')
      expect(res.body).to.have.property('safetyHardFailures')
      expect(res.body).to.have.property('safetyAdvisoryFindings')
    }
  })

  it('404s on an unknown benchmark name', async () => {
    const res = await get('/api/admin/benchmarks/does-not-exist')
    expect(res.status).to.equal(404)
    expect(res.body.code).to.equal('unknown_benchmark')
  })

  it('rejects unauthenticated access (RBAC unchanged)', async () => {
    const res = await request(app).get('/api/admin/benchmarks')
    expect(res.status).to.equal(401)
  })
})
