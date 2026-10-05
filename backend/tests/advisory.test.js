import request from 'supertest'
import { expect } from 'chai'
import axios from 'axios'
import { setupTestApp, teardownTestApp } from './helpers/db.js'

describe('Advisory API', () => {
  let app
  let originalPost

  before(async () => {
    app = await setupTestApp()
    originalPost = axios.post
  })

  after(async () => {
    axios.post = originalPost
    await teardownTestApp()
  })

  afterEach(() => {
    axios.post = originalPost
  })

  describe('POST /api/v1/advisory/ask', () => {
    it('rejects too-short questions with 400', async () => {
      const res = await request(app)
        .post('/api/v1/advisory/ask')
        .send({ question: 'hi' })

      expect(res.status).to.equal(400)
      expect(res.body.code).to.equal('VALIDATION_ERROR')
    })

    it('returns 503 when no AI providers are configured', async () => {
      delete process.env.GROQ_API_KEY
      delete process.env.GEMINI_API_KEY

      // RAG service is unreachable -> axios.post rejects -> returns null
      axios.post = async () => { throw new Error('connection refused') }

      const res = await request(app)
        .post('/api/v1/advisory/ask')
        .send({ question: 'How do I control late blight in potato?' })

      expect(res.status).to.equal(503)
      expect(res.body.status).to.equal('error')
    })

    it('returns the RAG answer when RAG service has high confidence', async () => {
      delete process.env.GROQ_API_KEY
      delete process.env.GEMINI_API_KEY

      axios.post = async () => ({
        data: {
          answer: 'Spray Mancozeb 2.5g/L in the evening.',
          confidence: 0.85,
          model: 'faiss-rag',
        },
      })

      const res = await request(app)
        .post('/api/v1/advisory/ask')
        .send({ question: 'How do I control late blight in potato?', language: 'en' })

      expect(res.status).to.equal(200)
      expect(res.body.status).to.equal('ok')
      expect(res.body.source).to.equal('rag')
      expect(res.body.answer).to.contain('Mancozeb')
      expect(res.body.confidence).to.equal(0.85)
    })

    it('falls back to Groq when RAG confidence is low', async () => {
      process.env.GROQ_API_KEY = 'test-groq-key'
      process.env.GEMINI_API_KEY = ''

      // First call = RAG (low confidence), second call = Groq (answer)
      let callCount = 0
      axios.post = async () => {
        callCount += 1
        if (callCount === 1) {
          return { data: { answer: 'low conf', confidence: 0.4, model: 'faiss-rag' } }
        }
        return { data: { choices: [{ message: { content: 'Groq says: crop rotation helps.' } }], model: 'llama-3.1-8b-instant' } }
      }

      const res = await request(app)
        .post('/api/v1/advisory/ask')
        .send({ question: 'What is crop rotation?' })

      expect(res.status).to.equal(200)
      expect(res.body.source).to.equal('groq')
      expect(res.body.answer).to.contain('crop rotation')
      expect(callCount).to.equal(2)
    })
  })

  describe('POST /api/v1/advisory/diagnose', () => {
    it('rejects too-short symptoms with 400', async () => {
      const res = await request(app)
        .post('/api/v1/advisory/diagnose')
        .send({ symptoms: 'bad' })

      expect(res.status).to.equal(400)
    })

    it('returns a diagnosis via Groq', async () => {
      process.env.GROQ_API_KEY = 'test-groq-key'
      axios.post = async (url) => {
        if (url.includes('/rag/ask')) {
          return { data: { answer: 'low conf', confidence: 0.3, model: 'faiss-rag' } }
        }
        return { data: { choices: [{ message: { content: 'Likely early blight. Remove infected leaves.' } }], model: 'llama-3.1-8b-instant' } }
      }

      const res = await request(app)
        .post('/api/v1/advisory/diagnose')
        .send({ symptoms: 'yellow spots with dark rings on lower leaves', cropType: 'tomato' })

      expect(res.status).to.equal(200)
      expect(res.body.status).to.equal('ok')
      expect(res.body.diagnosis).to.contain('early blight')
    })
  })
})