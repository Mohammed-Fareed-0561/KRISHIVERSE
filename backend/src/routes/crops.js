import { Router }                              from 'express'
import { requireAuth }                         from '../middleware/auth.js'
import { validate, recommendSchema }           from '../validators/schemas.js'
 
export const cropsRouter = Router()
 
// Tamil Nadu crop knowledge base — used as offline fallback
// and to enrich ML model output on the frontend
export const CROP_DB = {
  paddy:     { ta: 'நெல்', seasons: ['Kharif','Rabi'],    water: 'high',   soil: ['clay','loam'],   npk: { N:120, P:60,  K:60  }, ph: [5.5, 7.0], tempRange: [20, 35] },
  sugarcane: { ta: 'கரும்பு', seasons: ['Annual'],        water: 'high',   soil: ['loam','clay'],   npk: { N:250, P:100, K:150 }, ph: [6.0, 7.5], tempRange: [20, 40] },
  cotton:    { ta: 'பருத்தி', seasons: ['Kharif'],        water: 'medium', soil: ['black','loam'],  npk: { N:100, P:50,  K:50  }, ph: [6.0, 8.0], tempRange: [21, 35] },
  groundnut: { ta: 'நிலக்கடலை', seasons: ['Kharif','Rabi'], water: 'medium', soil: ['sandy','loam'], npk: { N:25,  P:50,  K:75  }, ph: [6.0, 7.0], tempRange: [25, 35] },
  turmeric:  { ta: 'மஞ்சள்', seasons: ['Kharif'],         water: 'medium', soil: ['loam','clay'],   npk: { N:60,  P:50,  K:120 }, ph: [5.5, 7.0], tempRange: [20, 35] },
  banana:    { ta: 'வாழை', seasons: ['Annual'],           water: 'high',   soil: ['loam','clay'],   npk: { N:200, P:60,  K:300 }, ph: [6.0, 7.5], tempRange: [20, 35] },
  tomato:    { ta: 'தக்காளி', seasons: ['Rabi','Summer'], water: 'medium', soil: ['loam','sandy'],  npk: { N:120, P:80,  K:80  }, ph: [6.0, 7.0], tempRange: [18, 30] },
  brinjal:   { ta: 'கத்திரி', seasons: ['All'],           water: 'medium', soil: ['loam'],          npk: { N:100, P:60,  K:60  }, ph: [5.5, 6.8], tempRange: [20, 35] },
  blackgram: { ta: 'உளுந்து', seasons: ['Kharif','Rabi'], water: 'low',    soil: ['loam','clay'],   npk: { N:25,  P:50,  K:25  }, ph: [6.0, 7.5], tempRange: [25, 35] },
  greengram: { ta: 'பாசிப்பயறு', seasons: ['Kharif','Rabi'], water: 'low', soil: ['loam','sandy'], npk: { N:25,  P:50,  K:25  }, ph: [6.0, 7.5], tempRange: [25, 35] },
}
 
// GET /crops
cropsRouter.get('/', (_req, res) => {
  const list = Object.entries(CROP_DB).map(([name, info]) => ({ name, ...info }))
  res.json({ status: 'ok', crops: list })
})
 
// GET /crops/:name
cropsRouter.get('/:name', (req, res) => {
  const crop = CROP_DB[req.params.name.toLowerCase()]
  if (!crop) {
    const err = new Error(`Crop '${req.params.name}' not in database`)
    err.status = 404
    throw err
  }
  res.json({ status: 'ok', crop: { name: req.params.name, ...crop } })
})
 
// POST /crops/recommend  — rule-based scoring (complements TF.js ML on frontend)
cropsRouter.post('/recommend', requireAuth, validate(recommendSchema), (req, res) => {
  const { N, P, K, temperature, humidity, ph, rainfall, soilType } = req.body
 
  const scores = Object.entries(CROP_DB).map(([name, info]) => {
    let score = 0
 
    // 1. Rainfall / water need match (30 pts)
    const waterMatch = {
      high:   rainfall > 1200,
      medium: rainfall >= 600 && rainfall <= 1400,
      low:    rainfall < 800,
    }
    if (waterMatch[info.water]) score += 30
 
    // 2. NPK proximity (40 pts) — lower diff = higher score
    const nDiff = Math.abs(N - info.npk.N) / (info.npk.N || 1)
    const pDiff = Math.abs(P - info.npk.P) / (info.npk.P || 1)
    const kDiff = Math.abs(K - info.npk.K) / (info.npk.K || 1)
    score += Math.round((1 - Math.min((nDiff + pDiff + kDiff) / 3, 1)) * 40)
 
    // 3. pH range match (15 pts)
    if (ph >= info.ph[0] && ph <= info.ph[1]) score += 15
 
    // 4. Temperature range match (10 pts)
    if (temperature >= info.tempRange[0] && temperature <= info.tempRange[1]) score += 10
 
    // 5. Soil type match (5 pts)
    if (soilType && info.soil.includes(soilType.toLowerCase())) score += 5
 
    return { name, tamilName: info.ta, score: Math.max(0, Math.min(100, score)), details: info }
  })
 
  scores.sort((a, b) => b.score - a.score)
 
  res.json({
    status: 'ok',
    recommendations: scores.slice(0, 5),
    input: req.body,
  })
})
 