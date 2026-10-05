import { Router } from 'express'
import { GoogleGenerativeAI } from '@google/generative-ai'
import axios from 'axios'
import { validate, askSchema, diagnoseSchema }  from '../validators/schemas.js'
import { applySyncBatch } from '../services/syncStore.js'
 
export const advisoryRouter = Router()

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'groq/compound-mini'
const GEMINI_MODEL = 'gemini-2.5-flash'
const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL || 'http://localhost:8000'
const RAG_CONFIDENCE_THRESHOLD = 0.6

const SYSTEM_PROMPT = `You are KrishiVerse AI, a friendly and knowledgeable agricultural advisor for small-holder farmers in Tamil Nadu, South India.

You provide practical, simple advice on: crop selection, pest and disease control, soil health, irrigation, weather impact on farming, government schemes, and market prices.

RULES:
- Always use simple language a farmer with basic education can understand
- When relevant, consider Tamil Nadu's tropical climate, monsoon patterns (NE + SW monsoon), and common crops: paddy, sugarcane, cotton, banana, turmeric, groundnut, blackgram, greengram, tomato, brinjal
- If asked in Tamil, respond in Tamil. If asked in English, respond in English.
- Be specific: include exact quantities, timing, methods, and costs when possible
- Structure your answer with clear headings (e.g., "Prevention", "Treatment", "When to act")
- Never invent live prices, weather data, or government eligibility. Tell the farmer what to verify locally
- Be concise — max 3-4 short paragraphs or bullet points
- If you are unsure, say so honestly and suggest alternatives`

// ─── RAG Service (highest priority) ───────────────────────────────────────────

async function callRAGService(userMessage, language = 'en', context = {}) {
  try {
    console.log('[advisory.js] Attempting RAG service...')
    
    const response = await axios.post(`${RAG_SERVICE_URL}/rag/ask`, {
      question: userMessage,
      language: language,
      context: context
    }, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      }
    })

    const data = response.data
    
    // Check if RAG service has high confidence
    if (data && data.confidence >= RAG_CONFIDENCE_THRESHOLD) {
      console.log(`[advisory.js] RAG service answered with ${(data.confidence * 100).toFixed(1)}% confidence`)
      return {
        answer: data.answer,
        model: `${data.model} (RAG)`,
        source: 'rag',
        confidence: data.confidence
      }
    }
    
    // Low confidence, fall back to LLM
    console.log(`[advisory.js] RAG confidence too low (${(data.confidence * 100).toFixed(1)}%), falling back to LLM`)
    return null
    
  } catch (ragErr) {
    // RAG service unavailable or error - fall back to LLM
    console.warn('[advisory.js] RAG service unavailable:', ragErr.message)
    return null
  }
}

// ─── Groq (secondary) ──────────────────────────────────────────────────────────

// Read dynamically so env changes don't require a restart (and tests can set them)
const groqKey = () => process.env.GROQ_API_KEY || ''

async function callGroq(userMessage, temperature = 0.5) {
  if (!groqKey()) {
    throw new Error('GROQ_API_KEY not configured')
  }

  const response = await axios.post(GROQ_API_URL, {
    model: GROQ_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMessage }
    ],
    temperature: temperature,
    max_tokens: 1024,
    top_p: 0.9,
  }, {
    headers: {
      Authorization: `Bearer ${groqKey()}`,
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  })

  const answer = response.data?.choices?.[0]?.message?.content?.trim()
  if (!answer) throw new Error('Groq returned an empty answer')

  // Extract model name if Groq provides it
  const model = response.data.model || GROQ_MODEL
  return { answer, model }
}

// ─── Gemini (backup only) ─────────────────────────────────────────────────────

const geminiKey = () => process.env.GEMINI_API_KEY || ''

async function callGemini(userMessage, temperature = 0.5) {
  if (!geminiKey()) {
    const err = new Error('Both GROQ_API_KEY and GEMINI_API_KEY are not configured')
    err.status = 503
    throw err
  }

  const genAI = new GoogleGenerativeAI(geminiKey())
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: {
      temperature: temperature,
      maxOutputTokens: 1024,
    }
  })

  const result = await model.generateContent([
    { text: SYSTEM_PROMPT },
    { text: userMessage }
  ])

  const response = await result.response
  return { answer: response.text(), model: GEMINI_MODEL }
}

// ─── Resolve using RAG → Groq → Gemini (fallback chain) ──────────────────────

async function getAIAnswer(userMessage, temperature = 0.5, language = 'en', context = {}) {
  // 1. Try RAG service first (knowledge base search)
  const ragResult = await callRAGService(userMessage, language, context)
  if (ragResult) {
    return ragResult
  }
  
  // 2. Try Groq (fast, good quality)
  try {
    const groqResult = await callGroq(userMessage, temperature)
    return { ...groqResult, source: 'groq' }
  } catch (groqErr) {
    console.warn('[advisory.js] Groq failed, trying Gemini:', groqErr.message)
    if (!geminiKey()) {
      const err = new Error('No AI providers configured. Add GROQ_API_KEY or GEMINI_API_KEY to .env')
      err.status = 503
      throw err
    }
  }

  // 3. Fall back to Gemini
  try {
    const geminiResult = await callGemini(userMessage, temperature)
    return { ...geminiResult, source: 'gemini' }
  } catch (geminiErr) {
    const err = new Error('All AI providers failed. Please check your API keys and try again.')
    err.status = 503
    throw err
  }
}

// POST /advisory/ask
advisoryRouter.post('/ask', validate(askSchema), async (req, res) => {
  const { question, language, context } = req.body

  const locationNote = context?.district ? `[Farmer location: ${context.district}, Tamil Nadu]` : ''
  const cropNote     = context?.crop     ? `[Crop: ${context.crop}]`                             : ''
  const langNote     = `[Respond in: ${language === 'ta' ? 'Tamil' : language === 'hi' ? 'Hindi' : 'English'}]`

  const message = [locationNote, cropNote, langNote, '', question].filter(Boolean).join('\n')

  const result = await getAIAnswer(message, 0.5, language, context)
  
  // Return response with source information
  res.json({
    status: 'ok',
    answer: result.answer,
    model: result.model,
    source: result.source || 'llm',
    confidence: result.confidence || null
  })
})

// POST /advisory/sync — accept a batch of offline-first outbox entries
advisoryRouter.post('/sync', (req, res) => {
  const { batch } = req.body || {}

  if (!Array.isArray(batch) || batch.length === 0) {
    return res.status(400).json({ status: 'error', code: 'VALIDATION_ERROR', message: 'batch must be a non-empty array' })
  }

  const result = applySyncBatch(batch)
  res.json({ status: 'ok', synced: result.upserted + result.deleted, ...result })
})

// POST /advisory/diagnose
advisoryRouter.post('/diagnose', validate(diagnoseSchema), async (req, res) => {
  const { symptoms, cropType, language } = req.body

  const langNote = `[Respond in: ${language === 'ta' ? 'Tamil' : 'English'}]`
  const message  = `${langNote}\nCrop: ${cropType || 'unknown'}\nSymptoms described by farmer: ${symptoms}\n\nPlease diagnose: 1) Most likely cause 2) Immediate treatment 3) How to prevent in future.`

  const result = await getAIAnswer(message, 0.3, language, { crop: cropType })
  
  res.json({
    status: 'ok',
    diagnosis: result.answer,
    model: result.model,
    source: result.source || 'llm',
    confidence: result.confidence || null
  })
})
