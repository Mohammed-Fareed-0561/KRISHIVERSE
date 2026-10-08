import request from 'supertest'
import { expect } from 'chai'
import { setupTestApp, teardownTestApp, clearDatabase } from './helpers/db.js'
import { User } from '../src/models/User.js'
import { signToken } from '../src/services/jwt.js'

const EVAL_LABEL = 'EVALUATION DATASET — NOT LIVE FARMER ACCURACY'
const LOSS_REASON = 'Not available — no training-loss telemetry configured.'

function event(overrides = {}) {
  return {
    schemaVersion: 1,
    eventType: 'safety.block',
    occurredAt: new Date().toISOString(),
    sessionId: 'sess-dash',
    feature: 'chatbot',
    outcome: 'fallback',
    language: 'ta',
    intent: 'disease',
    safety: { validatorOutcome: 'blocked', dosageVerified: false, rulesFired: ['numeric_dosage'] },
    source: { surface: 'pwa' },
    ...overrides,
  }
}

describe('Admin dashboard panels', () => {
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

  it('section 1: system health reports every block', async () => {
    const res = await get('/api/admin/health')
    expect(res.status).to.equal(200)
    expect(res.body).to.have.property('status')
    for (const block of ['uptime', 'process', 'api', 'database', 'telemetry', 'dependencies', 'versions', 'readiness']) {
      expect(res.body.blocks, block).to.have.property(block)
    }
    expect(res.body.monitoringPipeline).to.have.property('isolation')
    expect(res.body.blocks.database.label).to.equal('connected')
  })

  it('sections 2-11: panels render an empty production state before any traffic', async () => {
    for (const path of ['/chatbot', '/rag', '/safety', '/cropdoctor', '/models', '/languages', '/coverage', '/failures']) {
      const res = await get(`/api/admin${path}`)
      expect(res.status, path).to.equal(200)
      expect(res.body.label, path).to.equal('PRODUCTION TELEMETRY')
      expect(res.body.production.empty, path).to.equal(true)
      expect(res.body.production.note, path).to.contain('No production')
    }
  })

  it('section 2: chatbot panel counts real ingested telemetry', async () => {
    await request(app).post('/api/admin/telemetry/batch').send({
      events: [
        event({ eventType: 'chatbot.response', outcome: 'success', latencyMs: 210 }),
        event({ eventType: 'chatbot.response', outcome: 'success', latencyMs: 340 }),
        event({ eventType: 'model.fallback', outcome: 'fallback', latencyMs: 900 }),
      ],
    })
    const res = await get('/api/admin/chatbot')
    expect(res.body.production.empty).to.equal(false)
    expect(res.body.production.requests).to.equal(3)
    expect(res.body.production.byLanguage.ta).to.equal(3)
    expect(res.body.production.latency.count).to.equal(3)
    expect(res.body.notCaptured.some((item) => item.metric.includes('accuracy'))).to.equal(true)
  })

  it('section 4: safety panel exposes the review queue and records verdicts', async () => {
    await request(app).post('/api/admin/telemetry').send(event({ eventId: 'safe-1' }))
    const before = await get('/api/admin/safety')
    expect(before.body.production.blocked).to.equal(1)
    expect(before.body.production.reviewQueue.open).to.equal(1)

    const review = await request(app)
      .post('/api/admin/safety/reviews')
      .set('Authorization', `Bearer ${token}`)
      .send({ eventId: 'safe-1', verdict: 'correct', note: 'verified against curated record' })
    expect(review.status).to.equal(201)

    const after = await get('/api/admin/safety')
    expect(after.body.production.reviewQueue.reviewed).to.equal(1)
    expect(after.body.production.reviewQueue.open).to.equal(0)
    expect(after.body.production.reviewQueue.byVerdict.correct).to.equal(1)
  })

  it('section 4: rejects an unknown review verdict', async () => {
    const res = await request(app)
      .post('/api/admin/safety/reviews')
      .set('Authorization', `Bearer ${token}`)
      .send({ eventId: 'safe-1', verdict: 'whatever' })
    expect(res.status).to.equal(500)
  })

  it('section 9: source monitoring scans the on-disk KB', async () => {
    const res = await get('/api/admin/sources')
    expect(res.status).to.equal(200)
    expect(res.body.sources.total).to.be.greaterThan(1000)
    expect(res.body.sources.provenance).to.have.property('citationAvailabilityPct')
    expect(res.body.sources.freshness).to.have.property('never')
    expect(res.body.sources.duplicates).to.have.property('duplicateRecords')
    expect(res.body.sources.byRecordKind).to.have.property('curated')
  })

  it('section 8: coverage panel reports KB state and evaluation coverage', async () => {
    const res = await get('/api/admin/coverage')
    expect(res.status).to.equal(200)
    expect(res.body.kbState.available).to.equal(true)
    expect(res.body.coverage).to.have.property('quarantined')
    expect(res.body.coverage).to.have.property('provenancePct')
    expect(res.body.evaluation.label).to.equal(EVAL_LABEL)
  })

  it('section 17: readiness scorecard states thresholds and unavailable checks', async () => {
    const res = await get('/api/admin/readiness')
    expect(res.status).to.equal(200)
    expect(res.body.checks.length).to.be.greaterThan(5)
    for (const check of res.body.checks) {
      expect(check).to.have.property('target')
      expect(['pass', 'warn', 'fail', 'unavailable']).to.include(check.status)
    }
    expect(res.body.note).to.contain('excluded from the score')
    const safetyCheck = res.body.checks.find((check) => check.id === 'safety-invariants')
    if (safetyCheck) expect(safetyCheck).to.have.property('target')
  })

  it('section 34: DR status reports RTO/RPO and drill state', async () => {
    const res = await get('/api/admin/dr')
    expect(res.status).to.equal(200)
    expect(res.body.targets).to.have.property('rtoHours')
    expect(res.body.targets).to.have.property('rpoHours')
    expect(res.body.restoreDrill).to.have.property('performed')
    expect(res.body.documentedPlan).to.equal('docs/admin/runbook.md')
  })

  it('section 33: log stream merges sources and redacts payloads', async () => {
    await get('/api/admin/health')
    const res = await get('/api/admin/logs')
    expect(res.status).to.equal(200)
    expect(res.body.entries.length).to.be.greaterThan(0)
    expect(res.body.sources.join(' ')).to.contain('audit')
    expect(res.body.redaction).to.contain('never written')
  })

  it('section 11: failure panel reports an empty production state safely', async () => {
    const res = await get('/api/admin/failures')
    expect(res.status).to.equal(200)
    expect(res.body).to.have.property('production')
    expect(res.body).to.have.property('topFailures')
    expect(res.body.label).to.equal('PRODUCTION TELEMETRY')
  })

  it('section 7: language panel separates production from evaluation', async () => {
    const res = await get('/api/admin/languages')
    expect(res.body.label).to.equal('PRODUCTION TELEMETRY')
    expect(res.body.evaluation.label).to.equal(EVAL_LABEL)
    expect(res.body.notCaptured.length).to.be.greaterThan(0)
  })

  it('section 6: model panel carries an evaluation block that is labelled', async () => {
    const res = await get('/api/admin/models')
    expect(res.body.evaluation.label).to.equal(EVAL_LABEL)
    expect(res.body.notCaptured.some((item) => item.reason.includes('unlabelled'))).to.equal(true)
  })
})

describe('Admin evaluation dashboard', () => {
  let app
  let token

  before(async () => { app = await setupTestApp() })
  after(async () => { await teardownTestApp() })

  beforeEach(async () => {
    await clearDatabase()
    const user = await User.create({ name: 'Admin', email: 'eval-admin@example.com', password: 'secret123', role: 'admin' })
    token = signToken({ id: user._id, email: user.email, role: 'admin' })
  })

  const get = (path) => request(app).get(path).set('Authorization', `Bearer ${token}`)

  it('labels every dataset and reports the loss panel as unavailable', async () => {
    const res = await get('/api/admin/evaluation')
    expect(res.status).to.equal(200)
    expect(res.body.label).to.equal(EVAL_LABEL)

    const loss = res.body.unavailablePanels.find((panel) => panel.name === 'training-loss')
    expect(loss.reason).to.equal(LOSS_REASON)

    for (const name of ['retrieval', 'safety', 'chatbot', 'multilingual', 'grounding', 'cropdoctor', 'joint-rag', 'provenance']) {
      const dataset = res.body.datasets[name]
      expect(dataset, name).to.be.an('object')
      if (dataset.available) expect(dataset.label, name).to.equal(EVAL_LABEL)
      else expect(dataset.reason, name).to.be.a('string')
    }
  })

  it('reports Recall@K and MRR for the retrieval dataset', async () => {
    const res = await get('/api/admin/evaluation/retrieval')
    expect(res.status).to.equal(200)
    expect(res.body.available).to.equal(true)
    expect(res.body.metrics).to.have.property('recallAt1')
    expect(res.body.metrics).to.have.property('recallAt3')
    expect(res.body.metrics).to.have.property('recallAt5')
    expect(res.body.metrics).to.have.property('mrr')
    expect(res.body.metrics).to.have.property('latency')
    expect(res.body.facets).to.have.property('languages')
    expect(res.body.origin).to.contain('NOT ground truth')
    expect(res.body.datasetSize).to.be.greaterThan(0)
  })

  it('labels false-positive / false-negative rates as not measurable', async () => {
    const res = await get('/api/admin/evaluation/safety')
    expect(res.status).to.equal(200)
    if (res.body.available) {
      const metrics = res.body.unavailableMetrics.map((item) => item.metric)
      expect(metrics).to.include('false-positive rate')
      expect(metrics).to.include('false-negative rate')
    }
  })

  it('404s on an unknown dataset', async () => {
    const res = await get('/api/admin/evaluation/does-not-exist')
    expect(res.status).to.equal(404)
    expect(res.body.code).to.equal('unknown_dataset')
  })

  it('never labels evaluation numbers as production accuracy', async () => {
    const res = await get('/api/admin/evaluation')
    const productionAccuracy = res.body.unavailablePanels.find((panel) => panel.name === 'production-accuracy')
    expect(productionAccuracy.reason).to.contain('unlabelled')
    expect(JSON.stringify(res.body.datasets)).to.not.contain('"PRODUCTION TELEMETRY"')
  })
})
