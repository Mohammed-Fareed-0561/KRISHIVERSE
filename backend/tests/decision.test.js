import request from 'supertest'
import { expect } from 'chai'
import { setupTestApp, teardownTestApp } from './helpers/db.js'

describe('Decision (Laya) endpoint — POST /api/v1/decision/laya', () => {
  let app

  before(async () => { app = await setupTestApp() })
  after(async () => { await teardownTestApp() })

  it('classifies intent for a disease query', async () => {
    const res = await request(app)
      .post('/api/v1/decision/laya')
      .send({ task: 'intent_classification', state: { query: 'tomato leaves turning yellow' } })
    expect(res.status).to.equal(200)
    expect(res.body.status).to.equal('ok')
    expect(res.body.task).to.equal('intent_classification')
    expect(res.body).to.have.property('decision')
    expect(res.body.engine).to.equal('laya-builtin-decider')
  })

  it('routes help requests to help, never scheme', async () => {
    for (const query of ['help', 'how can you help me?', 'உதவி', 'मदद']) {
      const res = await request(app)
        .post('/api/v1/decision/laya')
        .send({ task: 'intent_classification', state: { query } })
      expect(res.status).to.equal(200)
      expect(res.body.decision.intent).to.equal('help')
    }
  })

  it('routes what-is and treatment intents', async () => {
    const what = await request(app)
      .post('/api/v1/decision/laya')
      .send({ task: 'intent_classification', state: { query: 'What is rice blast?' } })
    expect(what.body.decision.intent).to.equal('what_is')
    const treat = await request(app)
      .post('/api/v1/decision/laya')
      .send({ task: 'intent_classification', state: { query: 'how to treat tomato blight' } })
    expect(treat.body.decision.intent).to.equal('treatment')
  })

  it('reuses AgriculturalNLP parsed intent from the frontend when supplied', async () => {
    const res = await request(app)
      .post('/api/v1/decision/laya')
      .send({ task: 'intent_classification', state: { query: 'something neutral', parsed: { intent: 'fertilizer', crop: 'rice' } } })
    expect(res.status).to.equal(200)
    expect(res.body.decision.intent).to.equal('fertilizer')
  })

  it('handles Tamil queries without a second language detector', async () => {
    const res = await request(app)
      .post('/api/v1/decision/laya')
      .send({ task: 'intent_classification', state: { query: 'தக்காளி இலைகளில் புள்ளிகள்' } })
    expect(res.status).to.equal(200)
    expect(res.body.decision.intent).to.equal('disease')
  })

  it('handles Hindi queries', async () => {
    const res = await request(app)
      .post('/api/v1/decision/laya')
      .send({ task: 'intent_classification', state: { query: 'टमाटर के पत्ते पीले हो रहे हैं' } })
    expect(res.status).to.equal(200)
    expect(res.body.decision.intent).to.equal('disease')
  })

  it('handles Tanglish mixed queries', async () => {
    const res = await request(app)
      .post('/api/v1/decision/laya')
      .send({ task: 'intent_classification', state: { query: 'தக்காளி இலைகளில் brown spots இருக்கு' } })
    expect(res.status).to.equal(200)
    expect(res.body.decision.intent).to.equal('disease')
  })

  it('returns a clarification question for empty evidence', async () => {
    const res = await request(app)
      .post('/api/v1/decision/laya')
      .send({ task: 'clarification', state: { query: 'help' } })
    expect(res.status).to.equal(200)
    expect(res.body.needsClarification).to.equal(true)
    expect(res.body.clarification.question).to.be.a('string')
  })

  it('selects from candidates and tolerates invalid/duplicate entries', async () => {
    const res = await request(app)
      .post('/api/v1/decision/laya')
      .send({
        task: 'candidate_selection',
        state: { query: 'tomato spots' },
        candidates: [null, { id: 'a', name: 'Early blight' }, { id: 'a', name: 'Early blight' }],
        evidence: [],
      })
    expect(res.status).to.equal(200)
    expect(res.body.decision.selected).to.deep.equal({ id: 'a', name: 'Early blight' })
  })

  it('rejects arbitrary tasks with 400', async () => {
    const res = await request(app)
      .post('/api/v1/decision/laya')
      .send({ task: 'free_chat', state: {} })
    expect(res.status).to.equal(400)
  })

  it('health exposes the laya capability flag', async () => {
    const res = await request(app).get('/api/v1/health')
    expect(res.status).to.equal(200)
    expect(res.body.capabilities).to.have.property('layaEnabled')
  })
})
