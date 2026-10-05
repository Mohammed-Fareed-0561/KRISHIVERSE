import { Router } from 'express'
import { validate, decisionSchema } from '../validators/schemas.js'

export const decisionRouter = Router()

const ALLOWED_TASKS = ['intent_classification', 'clarification', 'candidate_selection']
const LAYA_MODEL_URL = (process.env.LAYA_MODEL_URL || '').trim()
const LAYA_ENABLED = (process.env.LAYA_ENABLED || 'true') === 'true'
const LAYA_TIMEOUT_MS = Number.parseInt(process.env.LAYA_TIMEOUT_MS || '8000', 10)
// Verified real checkpoint (see docs/laya-integration.md §4): the multilingual
// weights read Tamil/Hindi/English; the English checkpoint cannot. Pin it.
const LAYA_MODEL = (process.env.LAYA_MODEL || 'multilingual').trim() || 'multilingual'

// Engine identifiers. `laya-builtin-decider` is the deterministic placeholder —
// it must never be presented as model intelligence.
export const BUILTIN_ENGINE_NAME = 'laya-builtin-decider'

// ─── Multilingual intent keywords ─────────────────────────────────────────────
// Same alias data as the frontend AgriculturalNLP.js (CROP_ALIASES /
// SYMPTOM_ALIASES / INTENT_ALIASES) — NOT a second language detector. The
// frontend already sends state.parsed (AgriculturalNLP output); these keywords
// only cover the case where parsed info is absent. Matching mirrors the
// frontend boundary/token rules (see docs/chatbot/intent-taxonomy.md) so the
// backend cannot reintroduce substring collisions like तना⊂कितना.
function tokenizeSimple(text) {
  return String(text || '').toLowerCase().split(/[\s.,!?;:"'()[\]{}]+/).filter((w) => w.length > 1)
}

function keywordHit(text, tokens, kw) {
  const k = String(kw).toLowerCase()
  if (k.includes(' ')) {
    const esc = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`(^|[^\\p{L}\\p{N}])${esc}($|[^\\p{L}\\p{N}])`, 'iu').test(text)
  }
  if (/[^\u0000-\u007f]/.test(k)) return tokens.some((t) => t === k || t.startsWith(k))
  if (k.length < 3) return tokens.includes(k)
  return text.includes(k)
}

const INTENT_KEYWORDS = {
  greeting: ['hello', 'hey', 'vanakkam', 'வணக்கம்', 'namaste', 'नमस्ते', 'good morning', 'good evening'],
  help: ['help', 'உதவி', 'udhavi', 'uthavi', 'मदद', 'madad', 'help me', 'how can you help', 'can you help', 'please help'],
  about: ['what can you do', 'who are you', 'introduce yourself', 'features', 'capabilities'],
  what_is: ['என்ன', 'enna', 'क्या', 'kya', 'what is', 'what are', 'what does', 'tell me about', 'என்றால் என்ன'],
  treatment: ['treat', 'treatment', 'cure', 'control', 'remedy', 'spray', 'prevent', 'prevention', 'சிகிச்சை', 'மருந்து', 'தடுப்பு',
    'इलाज', 'उपचार', 'दवा', 'रोकथाम', 'बचाव', 'how to treat', 'how to cure', 'how to control', 'how to prevent'],
  disease: ['disease', 'sick', 'spot', 'blight', 'blast', 'wilt', 'pest', 'insect', 'yellow', 'curl', 'rot', 'mold', 'mildew', 'fungus', 'virus', 'lesion', 'patch',
    'புள்ளி', 'மஞ்சள்', 'வாடல்', 'பூச்சி', 'இலை', 'நோய்', 'கருகல்', 'pulli', 'manjal', 'poochi',
    'पीला', 'पीले', 'धब्बा', 'धब्बे', 'मुरझा', 'झुलसा', 'बीमारी', 'रोग', 'पत्ता', 'brown spots', 'leaf curl', 'white mold'],
  fertilizer: ['fertilizer', 'fertiliser', 'manure', 'urea', 'dap', 'npk', 'nutrient', 'dose', 'dosage', 'compost', 'nitrogen', 'phosphorus', 'potassium', 'khad',
    'खाद', 'उर्वरक', 'யூரியா', 'உரம்', 'uram'],
  scheme: ['scheme', 'subsidy', 'yojana', 'pm kisan', 'pmkisan', 'loan', 'insurance', 'benefit', 'sarkar',
    'योजना', 'सरकार', 'सहायता', 'திட்டம்', 'மானியம்'],
  weather: ['weather', 'rain', 'monsoon', 'drought', 'flood', 'temperature', 'forecast', 'climate',
    'बारिश', 'मौसम', 'सूखा', 'மழை', 'வானிலை', 'பருவமழை', 'barish', 'mazhai'],
  price: ['price', 'mandi', 'market', 'rate', 'sell', 'cost', 'bhav', 'bazar',
    'भाव', 'बाजार', 'बिक्री', 'விலை', 'சந்தை', 'mandi price'],
  cultivation: ['how to grow', 'cultivation', 'sow', 'sowing', 'planting', 'spacing', 'irrigation', 'harvest', 'harvested', 'variety', 'seed',
    'खेती', 'उगाना', 'बीज', 'सिंचाई', 'रोपाई', 'फसल', 'சாகுபடி', 'விவசாயம்', 'நடவு', 'விதை', 'drip irrigation'],
}

const KNOWN_INTENTS = ['greeting', 'help', 'about', 'what_is', 'disease', 'treatment', 'fertilizer', 'scheme', 'weather', 'price', 'cultivation', 'unknown']

// Evaluation order: meta/advice-seeking intents first (same tie-break as frontend).
const INTENT_ORDER = ['greeting', 'help', 'about', 'what_is', 'treatment', 'disease', 'fertilizer', 'scheme', 'weather', 'price', 'cultivation']

// ─── Deterministic built-in decider (placeholder, clearly labelled) ───────────
// Used when no real Laya sidecar is configured (default). Bounded rules only.
// It NEVER fabricates provenance, dosages, or verification — ResponseValidator
// remains authoritative downstream.
function localDecide({ task, state = {}, candidates = [], evidence = [] }) {
  const text = String(state.query ?? state.text ?? '').toLowerCase()
  // Reuse AgriculturalNLP output when the frontend supplies it: state.parsed is
  // produced by parseQuery() in the browser, so preferring it is reuse, not a
  // second detector.
  const parsedIntent = typeof state.parsed?.intent === 'string' ? state.parsed.intent : null
  if (task === 'intent_classification') {
    let intent = 'unknown'
    let confidence = 0.3
    if (parsedIntent && KNOWN_INTENTS.includes(parsedIntent) && parsedIntent !== 'unknown') {
      intent = parsedIntent
      confidence = 0.75
    } else {
      const tokens = tokenizeSimple(text)
      for (const name of INTENT_ORDER) {
        if ((INTENT_KEYWORDS[name] || []).some((w) => keywordHit(text, tokens, w))) { intent = name; break }
      }
      // Simple "what is X" factual queries are cultivation-domain by default.
      if (intent === 'unknown' && /what is|what are|when.*harvest/i.test(text)) intent = 'cultivation'
      confidence = intent === 'unknown' ? 0.3 : 0.65
    }
    const needsClarification = intent === 'unknown'
    return {
      decision: { intent },
      confidence,
      needsClarification,
      clarification: needsClarification
        ? { question: 'Which crop are you asking about?', options: ['Rice', 'Tomato', 'Maize', 'Groundnut', 'Chilli', 'Other'] }
        : null,
    }
  }
  if (task === 'clarification') {
    const needsClarification = text.trim().length < 12 || !/[a-z\u0900-\u097f\u0B80-\u0BFF]{3,}/i.test(text)
    return {
      decision: { hasEnoughEvidence: !needsClarification },
      confidence: needsClarification ? 0.4 : 0.8,
      needsClarification,
      clarification: needsClarification
        ? { question: 'Can you share a bit more detail so I can help better?', options: ['Crop name', 'Symptom / issue', 'Stage of the crop', 'Your district'] }
        : null,
    }
  }
  // candidate_selection — bounded ranking, invalid/duplicate/empty safe
  const seen = new Set()
  const clean = []
  for (const c of candidates || []) {
    if (c === null || c === undefined) continue
    const key = typeof c === 'object' ? String(c.id ?? c.name ?? JSON.stringify(c)) : String(c)
    if (seen.has(key)) continue
    seen.add(key)
    clean.push(c)
  }
  if (clean.length === 0) {
    return {
      decision: { selected: null, ranked: [], reason: 'empty_candidates' },
      confidence: 0,
      needsClarification: true,
      clarification: { question: 'Can you share a bit more detail so I can help better?', options: ['Crop name', 'Symptom / issue', 'Stage of the crop', 'Your district'] },
    }
  }
  const ranked = clean
    .map((c) => {
      const t = JSON.stringify(c).toLowerCase()
      let score = 0
      for (const ev of evidence || []) {
        const e = JSON.stringify(ev).toLowerCase()
        if (t && e && t.slice(0, 24) === e.slice(0, 24)) score += 1
      }
      return { c, score }
    })
    .sort((a, b) => b.score - a.score)
  return {
    decision: { selected: ranked[0].c, ranked: ranked.map((r) => r.c), reason: 'backend_rank' },
    confidence: ranked[0].score > 0 ? 0.7 : 0.35,
    needsClarification: ranked[0].score === 0,
    clarification: null,
  }
}

// ─── Real Laya adapter (verified /v1/systemone wire protocol) ─────────────────
// laya-serve speaks POST {LAYA_MODEL_URL}/v1/systemone with
// { state, questions, model } and answers schema-identical choice/score/noul
// payloads (verified live against laya 0.3.22, convaiinnovations/laya-
// multilingual rev 55cf4c4e). Any shape drift → throw → builtin fallback.
const INTENT_CRITERIA = {
  greeting: 'the text is a greeting such as hello, hi, vanakkam or namaste',
  help: 'the text is a bare request for help, such as help or help me',
  about: 'the text asks what the assistant can do or who it is',
  what_is: 'the text asks for a definition or explanation, such as what is X',
  disease: 'the text describes a plant health problem: spots, yellowing, wilting, curling, pests, fungus, rot or blight on leaves, stem, roots or fruit',
  treatment: 'the text asks how to treat, cure, control or prevent a crop problem',
  fertilizer: 'the text asks about plant nutrition or fertilizer dosage: urea, DAP, NPK, manure, compost, nutrients, how much, dose, kg per acre',
  scheme: 'the text asks about government schemes, subsidies, loans, insurance, PM-Kisan, yojana or benefits',
  weather: 'the text asks about weather, rain, monsoon, drought, flood, temperature or forecast',
  price: 'the text asks about crop prices, mandi rates, market, selling or cost',
  cultivation: 'the text asks about cultivation practices: sowing technique, seed rate, spacing, irrigation scheduling, or harvest timing',
  unknown: 'text that is not about farming at all and is not a greeting, help request, or definition question',
}
const INTENT_INSTRUCTIONS = 'Read the farmer query text. Pick the single intent that best matches what the farmer is asking about.'

function candidateKey(c) {
  return typeof c === 'object' && c !== null ? String(c.id ?? c.name ?? JSON.stringify(c)) : String(c)
}

function buildSystemOneBody({ task, state, candidates }) {
  const query = String(state.query ?? state.text ?? '')
  if (task === 'intent_classification') {
    return {
      state: { body: query },
      questions: { intent: { type: 'choice', instructions: INTENT_INSTRUCTIONS, criteria: INTENT_CRITERIA } },
      model: LAYA_MODEL,
    }
  }
  if (task === 'clarification') {
    return {
      state: { body: query },
      questions: {
        needs_info: {
          type: 'noul',
          instructions: 'Does this farmer query lack the detail needed for crop advice (missing crop name, symptom, or what is being asked)? Answer yes when more detail is needed.',
        },
      },
      model: LAYA_MODEL,
    }
  }
  // candidate_selection — the choice space is EXACTLY the supplied candidates.
  const criteria = {}
  for (const c of candidates || []) {
    if (c === null || c === undefined) continue
    criteria[candidateKey(c)] = typeof c === 'object'
      ? `candidate: ${candidateKey(c)} — ${String(c.name ?? c.id ?? '')} ${String(c.description ?? '')}`.trim()
      : `candidate: ${String(c)}`
  }
  return {
    state: { body: query },
    questions: { selection: { type: 'choice', instructions: 'Pick the single candidate that best matches the farmer query.', criteria } },
    model: LAYA_MODEL,
  }
}

function parseSystemOneAnswer({ task, data, candidates }) {
  const answers = data?.answers
  if (!answers || typeof answers !== 'object') throw new Error('Malformed Laya response: missing answers')
  if (task === 'intent_classification') {
    const a = answers.intent
    const choice = String(a?.choice ?? '')
    if (a?.type !== 'choice' || !KNOWN_INTENTS.includes(choice)) throw new Error(`Malformed Laya response: bad intent choice ${JSON.stringify(choice)}`)
    const conf = Number(a.answer_confidence ?? a.confidence)
    return {
      decision: { intent: choice },
      confidence: Number.isFinite(conf) ? Math.min(1, Math.max(0, conf)) : null,
      needsClarification: choice === 'unknown',
      clarification: choice === 'unknown'
        ? { question: 'Which crop are you asking about?', options: ['Rice', 'Tomato', 'Maize', 'Groundnut', 'Chilli', 'Other'] }
        : null,
    }
  }
  if (task === 'clarification') {
    const a = answers.needs_info
    const p = Number(a?.noul)
    if (a?.type !== 'noul' || !Number.isFinite(p)) throw new Error('Malformed Laya response: bad noul answer')
    const needs = p > 0.5
    return {
      decision: { hasEnoughEvidence: !needs },
      confidence: Math.min(1, Math.max(0, Math.abs(p - 0.5) * 2)),
      needsClarification: needs,
      clarification: needs
        ? { question: 'Can you share a bit more detail so I can help better?', options: ['Crop name', 'Symptom / issue', 'Stage of the crop', 'Your district'] }
        : null,
    }
  }
  // candidate_selection — accept ONLY identifiers from the supplied list.
  const a = answers.selection
  const choice = String(a?.choice ?? '')
  const keys = new Set((candidates || []).filter((c) => c !== null && c !== undefined).map(candidateKey))
  if (a?.type !== 'choice' || !keys.has(choice)) {
    throw new Error(`Laya returned an out-of-list candidate: ${JSON.stringify(choice)}`)
  }
  const selected = (candidates || []).find((c) => candidateKey(c) === choice) ?? null
  const conf = Number(a.answer_confidence ?? a.confidence)
  return {
    decision: { selected, ranked: [selected], reason: 'laya_choice' },
    confidence: Number.isFinite(conf) ? Math.min(1, Math.max(0, conf)) : null,
    needsClarification: false,
    clarification: null,
  }
}

async function callRealLaya({ task, state, candidates }, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`${LAYA_MODEL_URL.replace(/\/+$/, '')}/v1/systemone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildSystemOneBody({ task, state, candidates })),
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`Laya sidecar HTTP ${res.status}`)
    const data = await res.json().catch(() => null)
    if (!data || typeof data !== 'object') throw new Error('Malformed Laya response: not JSON')
    return parseSystemOneAnswer({ task, data, candidates })
  } finally {
    clearTimeout(timer)
  }
}

// POST /decision/laya — backend-only Laya entry point
decisionRouter.post('/laya', validate(decisionSchema), async (req, res) => {
  const { task, state = {}, candidates = [], evidence = [] } = req.body

  if (!ALLOWED_TASKS.includes(task)) {
    const err = new Error(`Unsupported decision task "${task}". Allowed: ${ALLOWED_TASKS.join(', ')}`)
    err.status = 400
    err.code = 'INVALID_TASK'
    throw err
  }
  if (!LAYA_ENABLED) {
    const err = new Error('Laya decision service is disabled on this backend (LAYA_ENABLED=false)')
    err.status = 503
    throw err
  }

  // Real checkpoint sidecar when LAYA_MODEL_URL is set (verified /v1/systemone
  // protocol). Any failure — down, timeout, shape drift, out-of-list candidate
  // — falls back to the deterministic decider; never 500 merely because the
  // model is unavailable (the frontend has its own fallback too).
  if (LAYA_MODEL_URL) {
    try {
      const ext = await callRealLaya({ task, state, candidates }, LAYA_TIMEOUT_MS)
      return res.json({
        status: 'ok',
        version: 'laya-decision-v1',
        task,
        decision: ext.decision,
        confidence: ext.confidence,
        needsClarification: Boolean(ext.needsClarification),
        clarification: ext.clarification || null,
        engine: `laya-${LAYA_MODEL}`,
      })
    } catch (err) {
      console.warn('[decision/laya] real model failed, using built-in decider:', err.message)
    }
  }

  const result = localDecide({ task, state, candidates, evidence })
  res.json({ status: 'ok', version: 'laya-decision-v1', task, ...result, engine: BUILTIN_ENGINE_NAME })
})
