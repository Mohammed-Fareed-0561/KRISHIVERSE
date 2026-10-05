/**
 * IndexedDBChatbotEngine.js  (v3 — NLP-powered, inverted index, multilingual)
 *
 * Now uses AgriculturalNLP.js for:
 *  - O(1) lookups via inverted index (100x faster than linear scan)
 *  - 200+ Hindi/Tamil/Marathi/Punjabi crop & symptom aliases
 *  - Fuzzy phonetic matching for misspellings
 *  - Intent classification for any farmer phrasing
 */

import { getDb } from '../db/indexedDb';
import { DB_STORES } from '../db/schemas';
import {
  buildInvertedIndex,
  fastSearch,
  parseQuery,
  classifyIntent,
  resetIndex,
} from './AgriculturalNLP';
import ComprehensiveDiseaseDetector from './ComprehensiveDiseaseDetector';
import { ensureKbMigration, setCacheResetHook } from '../db/kbMigration';

// ─── In-memory cache ──────────────────────────────────────────────────────────
let _cache = {
  crops: null, symptoms: null, diseases: null, treatments: null, edges: null,
  warmed: false,
};

export function resetCache() {
  _cache = {
    crops: null, symptoms: null, diseases: null, treatments: null, edges: null,
    warmed: false,
  };
  resetIndex();
}

setCacheResetHook(resetCache);

// ─── Warm-up: load stores + build inverted index ───────────────────────────────
export async function warmUpCache() {
  // Ensure the KB is migrated to the current schema before it is indexed
  // (one-time, idempotent, backed-up). No-op when already migrated or empty.
  await ensureKbMigration();
  if (_cache.warmed) return;
  try {
    const db = await getDb();
    const [crops, symptoms, diseases, treatments, edges] = await Promise.all([
      db.getAll(DB_STORES.crops),
      db.getAll(DB_STORES.symptoms),
      db.getAll(DB_STORES.diseasePests),
      db.getAll(DB_STORES.treatments),
      db.getAll(DB_STORES.edges).catch(() => []),
    ]);

    _cache = { crops, symptoms, diseases, treatments, edges, warmed: true };

    // Build the inverted index from all records
    buildInvertedIndex({ crops, symptoms, diseases, treatments, edges });

    console.log('[Engine v3] Warmed up:', {
      crops: crops.length,
      symptoms: symptoms.length,
      diseases: diseases.length,
      treatments: treatments.length,
      edges: edges.length,
    });
  } catch (err) {
    console.warn('[Engine v3] Warm-up failed:', err);
  }
}

async function ensureCache() {
  if (!_cache.warmed) await warmUpCache();
  return _cache;
}

// ─── GUIDED DIAGNOSIS ─────────────────────────────────────────────────────────
export async function diagnoseFromGuide({ crop, symptom, severity, rawText = '' }) {
  await ensureCache();

  const query = `${crop || ''} ${symptom || ''} ${rawText}`.trim();

  // Use inverted index for fast lookup
  const { records: diseaseHits } = fastSearch(query, { type: 'disease', limit: 6 });
  const { records: treatHits }   = fastSearch(query, { type: 'treatment', limit: 8 });

  if (diseaseHits.length === 0) return buildNoMatchResponse(crop, symptom, severity);

  // Pair each disease with relevant treatments
  const results = diseaseHits.slice(0, 4).map(({ record: disease, score }) => {
    // Find treatments: first by diseaseId field, then by token overlap
    const treatments = (_cache.treatments || []).filter(
      (t) => t.diseaseId === disease.id ||
              (Array.isArray(t.diseases) && t.diseases.includes(disease.id))
    ).slice(0, 3);

    if (treatments.length === 0) {
      treatments.push(...treatHits.slice(0, 3).map((h) => h.record));
    }

    return { disease, treatments, score };
  });

  return buildDiagnosisResponse({ results, crop, symptom, severity });
}

// ─── FREE-TEXT QUERY — handles ANY phrasing ────────────────────────────────────
export async function answerFreeText(question, context = {}) {
  await ensureCache();

  const trimmed = (question || '').trim();
  if (!trimmed) return buildFallback();

  // Parse the query: extract crop, symptom, intent from ANY farmer phrasing
  const parsed = parseQuery(trimmed);
  const intent = parsed.intent !== 'unknown' ? parsed.intent : classifyIntent(trimmed);

  // META intents first: capabilities/greetings must never be intercepted by
  // symptom matching (e.g. "good morning" contains "ring", "help" must not
  // reach disease detection). See docs/chatbot/intent-taxonomy.md.
  if (intent === 'about' || intent === 'greeting' || intent === 'help') {
    return buildAboutResponse();
  }

  // PRIORITY: Check if it's a disease symptom question using ComprehensiveDiseaseDetector
  if (isDiseaseSymptomQuery(trimmed)) {
    const diseaseResults = ComprehensiveDiseaseDetector.detect(trimmed, parsed.crop || '', context.language || 'en');
    if (diseaseResults.length > 0 && diseaseResults[0].confidence > 50) {
      return buildComprehensiveDiseaseResponse(diseaseResults, trimmed, parsed, context);
    }
  }

  // Fast inverted-index search
  const diseaseResult  = fastSearch(trimmed, { type: 'disease',   limit: 5 });
  const cropResult     = fastSearch(trimmed, { type: 'crop',      limit: 3 });
  const treatResult    = fastSearch(trimmed, { type: 'treatment', limit: 5 });
  const symptomResult  = fastSearch(trimmed, { type: 'symptom',   limit: 5 });

  const topDisease   = diseaseResult.records[0];
  const topCrop      = cropResult.records[0];
  const topSymptom   = symptomResult.records[0];

  // Route to the best handler. (about/greeting/help are handled above, before
  // symptom matching. what_is/treatment fall through to the KB search below
  // so definitions and advice come from records, not templates.)
  if (intent === 'fertilizer') {
    const fertHits = fastSearch(trimmed + ' fertilizer nutrition nutrient', { limit: 5 });
    return buildFertilizerResponse(trimmed, fertHits.records, parsed, context);
  }

  if (intent === 'scheme') {
    return buildSchemeResponse(trimmed, context);
  }

  if (intent === 'weather') {
    return buildWeatherResponse(context);
  }

  if (intent === 'price') {
    return buildPriceResponse(trimmed, context);
  }

  if (intent === 'cultivation') {
    return buildCultivationResponse(trimmed, topCrop?.record, context);
  }

  // Disease intent (default)
  if (topDisease?.score > 0) {
    const disease    = topDisease.record;
    const treatments = (_cache.treatments || []).filter(
      (t) => t.diseaseId === disease.id
    ).slice(0, 4);
    const useTx = treatments.length > 0
      ? treatments
      : treatResult.records.slice(0, 3).map((h) => h.record);
    return buildDiseaseOnlyResponse(disease, useTx, parsed, context);
  }

  if (topCrop?.score > 0) {
    return buildCropInfoResponse(topCrop.record, diseaseResult.records.map((r) => r.record), context);
  }

  if (topSymptom?.score > 0) {
    return buildSymptomResponse(
      symptomResult.records.map((r) => r.record),
      diseaseResult.records.map((r) => r.record),
      parsed,
    );
  }

  return buildFallback();
}

// ─── RESPONSE BUILDERS ────────────────────────────────────────────────────────

/**
 * treatmentMethod — localized treatment text WITHOUT translating facts.
 * Returns the curated method_ta/method_hi string when the user language matches
 * and the record carries it; otherwise the existing English precedence.
 * Curated translations ship in src/data/seed/treatmentData.js (and kb v2), so
 * no machine translation is involved. Validator patterns cover TA/HI dosage
 * units, so localized chemical dosages still block when unverified.
 */
export function treatmentMethod(treatment, language) {
  if (!treatment) return "";
  if (typeof treatment === "string") return treatment;
  if (language === "ta" && treatment.method_ta) return treatment.method_ta;
  if (language === "hi" && treatment.method_hi) return treatment.method_hi;
  return treatment.description || treatment.method || treatment.action || treatment.name || "";
}

function buildDiagnosisResponse({ results, crop, symptom, severity }) {
  const top       = results[0];
  const disease   = top.disease;
  const treatments = top.treatments || [];

  const severityNote =
    severity === 'severe'   ? '\n\n⚠️ **Severe infection.** Contact your nearest KVK immediately.'
    : severity === 'moderate' ? '\n\n🟡 **Spreading fast.** Treat within 48 hours.'
    : '\n\n🟢 **Early stage.** High recovery chance with quick action.';

  const txLines = treatments.length
    ? treatments.map((t) => {
        const title = t.name || t.method || t.action || t.title || "Guidance";
        const body  = t.description || t.method || t.action || t.name || "";
        return `• **${title}**: ${body}`;
      }).join('\n')
    : '• Contact your local Krishi Vibhag office for advice.';

  const alts = results.slice(1, 3).map((r) => `• ${r.disease.name}`).join('\n');

  let response = `## 🔬 Diagnosis — ${(crop || 'Crop').replace(/^\w/, (c) => c.toUpperCase())}

**Most Likely: ${disease.name}**
${disease.description ? `\n${disease.description}\n` : ''}${disease.cause ? `**Cause:** ${disease.cause}\n` : ''}${disease.severity ? `**Severity:** ${disease.severity}\n` : ''}
### 💊 Recommended Treatment
${txLines}${disease.prevention ? `\n\n### 🛡️ Prevention\n${disease.prevention}` : ''}${severityNote}`;

  if (alts) response += `\n\n### 🔍 Other Possibilities\n${alts}`;
  response += '\n\n*Based on offline HSAID v2.0 — 15,000 agricultural records.*';

  return {
    type: 'diagnosis_result',
    response,
    confidence: Math.min(0.97, 0.68 + (top.score * 0.1 || 0.15)),
    data: { disease, treatments },
    suggestions: ['📷 Upload a photo for image diagnosis', '🔄 Describe more symptoms', '📋 Ask about prevention'],
  };
}

function buildNoMatchResponse(crop, symptom, severity) {
  const cropName = crop ? ` on **${crop}**` : '';
  return {
    type: 'no_match',
    response: `I couldn't find a specific match for **${symptom || 'the symptoms described'}**${cropName}.\n\nWhat you can do:\n• 📷 Use the **Diagnose** tab to upload a photo\n• 📞 Kisan Call Centre: **1800-180-1551** (Free, 24/7)\n• 🌐 agmarknet.gov.in for advisory info\n\nOr describe the problem differently — I understand Hindi, Tamil, Marathi too!`,
    confidence: 0.3,
    suggestions: ['Try describing in Hindi', 'Upload a photo', 'Call Kisan helpline'],
  };
}

function buildDiseaseOnlyResponse(disease, treatments, parsed, context) {
  const lang = context?.language === "ta" ? "ta" : context?.language === "hi" ? "hi" : "en";
  const txLines = treatments.length
    ? treatments.map((t) => {
        const title = t.name || t.method || t.action || t.title || "Guidance";
        const body  = treatmentMethod(t, lang) || t.description || t.method || t.action || t.name || "";
        return `• **${title}**: ${body}`;
      }).join('\n')
    : '• Contact your local KVK (Krishi Vigyan Kendra) for guidance.';

  const cropCtx = parsed.crop ? ` on ${parsed.crop}` : '';
  return {
    type: 'disease_info',
    response: `## ${disease.name}${cropCtx ? ` (${cropCtx})` : ''}\n\n${disease.description || ''}\n${disease.cause ? `**Cause:** ${disease.cause}\n` : ''}${disease.severity ? `**Risk Level:** ${disease.severity}\n` : ''}\n### 💊 Treatments\n${txLines}\n${disease.prevention ? `\n### 🛡️ Prevention\n${disease.prevention}` : ''}\n\n*HSAID v2.0 offline database.*`,
    confidence: 0.88,
    data: { disease, treatments },
    suggestions: ['Ask about prevention', 'Get fertilizer advice', 'Which crops does this affect?'],
  };
}

function buildCropInfoResponse(crop, diseases, context) {
  const threatList = diseases.slice(0, 3).map((d) => `• ${d.name}`).join('\n')
    || '• No specific active threats. Follow standard IPM practices.';
  return {
    type: 'crop_info',
    response: `## 🌱 ${crop.name}\n\n${crop.description || ''}\n${crop.category ? `**Category:** ${crop.category}\n` : ''}${crop.season ? `**Season:** ${crop.season}\n` : ''}${crop.soilType ? `**Soil:** ${crop.soilType}\n` : ''}${crop.waterReq ? `**Water:** ${crop.waterReq}\n` : ''}\n### ⚠️ Common Diseases & Pests\n${threatList}\n\n*HSAID v2.0 — 15,000 records.*`,
    confidence: 0.82,
    data: { crop, diseases },
    suggestions: ['Ask about diseases', 'Fertilizer guide', 'Cultivation calendar'],
  };
}

function buildFertilizerResponse(query, hits, parsed, context) {
  const cropName = parsed.crop || 'your crop';
  const hitLines = hits.slice(0, 3).map((h) => {
    const r = h.record;
    return `• **${r.name || r.action}**: ${r.description || r.action || ''}`;
  }).join('\n') || '• Apply NPK 120:60:60 kg/ha as base dose. Adjust per soil test.';

  return {
    type: 'fertilizer_info',
    response: `## 💊 Fertilizer Guide — ${cropName.replace(/^\w/, (c) => c.toUpperCase())}\n\n${hitLines}\n\n### General NPK Recommendations\n• **Nitrogen (N):** For leaf growth — apply Urea or CAN\n• **Phosphorus (P):** For roots — apply DAP or SSP\n• **Potassium (K):** For fruit/grain quality — apply MOP\n\n> 💡 **Always do a soil test first.** Free soil testing at nearest KVK.\n\n📞 Kisan Call Centre: **1800-180-1551**\n\n*HSAID v2.0 offline knowledge base.*`,
    confidence: 0.8,
    suggestions: ['Soil test locations', 'Organic alternatives', 'Ask about deficiency symptoms'],
  };
}

function buildSchemeResponse(query, context) {
  return {
    type: 'scheme_info',
    response: `## 🏛️ Government Schemes for Farmers\n\n### Top Schemes\n• **PM-KISAN** — ₹6,000/year direct benefit. Register at [pmkisan.gov.in](https://pmkisan.gov.in)\n• **PMFBY** — Crop insurance at low premium. Contact nearest bank branch.\n• **KCC (Kisan Credit Card)** — Short-term farm loans at 4% interest\n• **Soil Health Card** — Free soil testing every 2 years\n• **eNAM** — Sell produce online at better prices: [enam.gov.in](https://enam.gov.in)\n• **PM Kusum** — Solar pump subsidy up to 60%\n\n### How to apply\n1. Visit nearest **CSC (Common Service Centre)**\n2. Bring: Aadhaar, Bank passbook, Land documents\n3. Or call **1800-180-1551** (free, 24/7)\n\n*Check [agricoop.nic.in](https://agricoop.nic.in) for latest schemes.*`,
    confidence: 0.9,
    suggestions: ['PM-KISAN eligibility', 'Crop insurance guide', 'KCC application process'],
  };
}

function buildWeatherResponse(context) {
  return {
    type: 'weather_advice',
    response: `## 🌤️ Farm Weather Advisory\n\nFor accurate local weather:\n• 📱 Check the **Weather** tab in this app for your location forecast\n• 🌐 [imd.gov.in](https://imd.gov.in) — India Meteorological Department\n• 📞 Agro-Met Advisory: **1800-180-1551**\n\n### General Precautions\n• 🌧️ **Before rain:** Avoid pesticide spraying 24hrs prior\n• ☀️ **Summer:** Water fields in the evening to reduce evaporation\n• 🌫️ **High humidity:** Watch for fungal disease outbreaks\n• 🌵 **Drought stress:** Apply mulching to retain soil moisture`,
    confidence: 0.75,
    suggestions: ['Drought management', 'Flood-resistant varieties', 'Irrigation scheduling'],
  };
}

function buildPriceResponse(query, context) {
  return {
    type: 'price_info',
    response: `## 💰 Market Price Information\n\nFor today's mandi rates:\n• 📱 Check the **Prices** tab in this app for your nearest mandi\n• 🌐 [agmarknet.gov.in](https://agmarknet.gov.in) — National daily prices\n• 📱 **eNAM app** — Online agricultural market\n• 📞 **1800-180-1551** — Ask for local price advisory\n\n### Sell Smarter\n• Compare prices across **3–5 mandis** before selling\n• Check MSP (Minimum Support Price) — government guarantees these rates\n• Use FPOs (Farmer Producer Organisations) for better bargaining power`,
    confidence: 0.78,
    suggestions: ['Check nearby mandis', 'What is MSP?', 'How to register on eNAM'],
  };
}

function buildCultivationResponse(query, crop, context) {
  const name = crop?.name || 'the crop';
  return {
    type: 'cultivation_info',
    response: `## 🌱 Cultivation Guide — ${name}\n\n${crop?.description || ''}\n${crop?.season ? `**Best Season:** ${crop.season}\n` : ''}${crop?.soilType ? `**Ideal Soil:** ${crop.soilType}\n` : ''}${crop?.spacing ? `**Plant Spacing:** ${crop.spacing}\n` : ''}${crop?.waterReq ? `**Water Needs:** ${crop.waterReq}\n` : ''}${crop?.duration ? `**Crop Duration:** ${crop.duration}\n` : ''}\n### Key Steps\n1. **Land preparation** — Deep ploughing 2–3 times\n2. **Seed treatment** — Use Trichoderma or Thiram\n3. **Sowing** — Follow spacing guide for your variety\n4. **Fertilization** — Apply base dose at sowing\n5. **Irrigation** — Critical at flowering and grain filling stages\n6. **Pest monitoring** — Scout weekly from germination\n7. **Harvest** — At correct maturity for best quality\n\n> 📞 Contact your nearest KVK for location-specific advice.\n\n*HSAID v2.0 offline knowledge base.*`,
    confidence: 0.8,
    suggestions: ['Best varieties', 'Disease calendar', 'Post-harvest storage tips'],
  };
}

function buildSymptomResponse(symptoms, diseases, parsed) {
  const sym = symptoms[0];
  const cropCtx = parsed.crop ? ` on ${parsed.crop}` : '';
  const diseaseList = diseases.slice(0, 4).map((d) => `• ${d.name}`).join('\n')
    || '• Please tell me the crop name for a specific diagnosis.';
  return {
    type: 'symptom_analysis',
    response: `## 🔍 Symptom Analysis${cropCtx}\n\n${sym?.description || ''}\n\n### Possible Causes\n${diseaseList}\n\n*Tell me the crop for a more precise diagnosis.*`,
    confidence: 0.65,
    data: { symptom: sym },
    suggestions: ['Tell me your crop', 'Describe more symptoms', 'Upload a photo'],
  };
}

function buildAboutResponse() {
  return {
    type: 'about',
    response: `## 👋 Namaste! I'm KrishiVerse — Your Smart Farming Assistant

### What I Can Do For You:

**🔬 Disease Diagnosis**
• Identify crop diseases from symptoms
• Get natural and chemical treatments
• Prevention tips and expert advice
• *Example: "tomato leaves have brown spots"*

**💊 Fertilizer Guidance**
• NPK recommendations for your crop
• Application timing and dosage
• Organic and chemical options
• *Example: "how much urea for paddy?"*

**🐛 Pest Management**
• Identify common pests
• Safe control methods
• Integrated pest management
• *Example: "white bugs on cotton leaves"*

**🏛️ Government Schemes**
• PM-Kisan, PMFBY, KCC details
• Subsidy and loan information
• Eligibility requirements
• *Example: "tell me about PM Kisan yojana"*

**💰 Market Prices**
• Current mandi rates guidance
• Best selling practices
• *Example: "today's onion price"*

**🌧️ Weather Advisory**
• Seasonal farming tips
• Rain and drought precautions
• *Example: "what to do before monsoon?"*

### 🌍 I Understand Multiple Languages:
English, हिंदी (Hindi), தமிழ் (Tamil), मराठी (Marathi)

### 💡 How to Ask:
Just describe your problem naturally — even one word works!
• "yellowing" • "पीला पत्ता" • "fertilizer" • "PM Kisan"

I work **100% offline** with agricultural data stored on your device, and can connect to online AI when available for more detailed answers.

**Ready to help! What's your farming question? 🌱**`,
    confidence: 1.0,
    suggestions: ['🦠 Diagnose crop disease', '💊 Fertilizer advice', '🏛️ Government schemes', '📷 Upload disease photo'],
  };
}

function buildFallback() {
  return {
    type: 'fallback',
    response: `## 🌿 I'm your KrishiVerse Farming Assistant\n\nI understand **English, Hindi, Tamil, Marathi** and can help with:\n\n• 🦠 **Crop diseases** — *"chawal ka patta pila ho gaya"* (rice leaf yellowed)\n• 💊 **Fertilizers** — *"tamatar ke liye khad"* (fertilizer for tomato)\n• 🐛 **Pests** — *"kida lag gaya"* (pest attack)\n• 🏛️ **Schemes** — *"PM Kisan yojana"*\n• 💰 **Prices** — *"aaj mandi mein bhav"* (today's mandi prices)\n• 🌧️ **Weather** — *"baarish se kaise bachaye"*\n\nJust type your problem — even a single word like **"yellowing"** or **"पीला"** works!`,
    confidence: 0,
    suggestions: ['Diagnose crop problem', 'Fertilizer advice', 'Government schemes'],
  };
}

// ─── Disease Detection Helpers ─────────────────────────────────────────────────
function isDiseaseSymptomQuery(query) {
  const diseaseKeywords = [
    'spot', 'spots', 'yellow', 'yellowing', 'brown', 'black', 'white',
    'wilt', 'wilting', 'rot', 'rotting', 'curl', 'curling',
    'dry', 'drying', 'die', 'dying', 'disease', 'sick', 'problem',
    'lesion', 'patch', 'patches', 'stripe', 'ring',
    'blight', 'mildew', 'mold', 'mould', 'blast', 'rust', 'scab',
    'leaf', 'leaves', 'fruit', 'crop', 'crops',
    // Hindi
    'धब्बा', 'पीला', 'भूरा', 'सूखना', 'मुरझाना', 'रोग',
    // Tamil
    'புள்ளி', 'மஞ்சள்', 'வாடல்', 'நோய்', 'பழுப்பு'
  ];
  
  const lowerQuery = query.toLowerCase();
  return diseaseKeywords.some(kw => lowerQuery.includes(kw));
}

function buildComprehensiveDiseaseResponse(diseaseResults, query, parsed, context) {
  const topResult = diseaseResults[0];
  const disease = topResult.disease;
  const treatment = topResult.treatment;
  const prevention = topResult.prevention || [];
  const matchedSymptoms = topResult.matchedSymptoms || [];
  
  const cropName = disease.crop ? disease.crop.charAt(0).toUpperCase() + disease.crop.slice(1) : 'Crop';
  
  // Format organic treatments
  const organicTx = Array.isArray(treatment?.organic) && treatment.organic.length > 0
    ? treatment.organic.map(t => `• ${t}`).join('\n')
    : '• Apply neem oil spray @ 5ml per liter\n• Use Trichoderma or Pseudomonas bio-agents';
  
  // Format chemical treatments
  const chemicalTx = Array.isArray(treatment?.chemical) && treatment.chemical.length > 0
    ? treatment.chemical.map(t => `• ${t}`).join('\n')
    : '• Consult local agriculture office for approved fungicides/pesticides';
  
  // Format prevention
  const preventionText = prevention.length > 0
    ? prevention.map(p => `• ${p}`).join('\n')
    : '• Use disease-free seeds\n• Maintain field hygiene\n• Follow crop rotation';
  
  // Build matched symptoms section
  const symptomsText = matchedSymptoms.length > 0
    ? `### 🔍 Matched Symptoms\n${matchedSymptoms.map(s => `• ${s}`).join('\n')}\n\n`
    : '';
  
  // Alternative matches
  const alternatives = diseaseResults.slice(1, 3).length > 0
    ? `\n\n### 🔄 Other Possibilities\n${diseaseResults.slice(1, 3).map(r => `• ${r.disease.name} (${r.confidence}% match)`).join('\n')}`
    : '';
  
  const response = `## 🦠 Disease Diagnosis — ${cropName}

**Detected: ${disease.name}**
**Confidence: ${topResult.confidence}%** ${topResult.confidence >= 80 ? '(High)' : topResult.confidence >= 60 ? '(Medium)' : '(Possible)'}

${symptomsText}### 🌿 Organic Treatment
${organicTx}

### ⚗️ Chemical Treatment
${chemicalTx}

### 🛡️ Prevention
${preventionText}${alternatives}

> ⚠️ **Important:** Always consult your local KVK (Krishi Vigyan Kendra) before applying chemicals.
> 📞 Kisan Call Centre: **1800-180-1551** (Free, 24/7)

*Diagnosis powered by ComprehensiveDiseaseDetector — Offline AI with 100+ disease profiles.*`;
  
  return {
    type: 'comprehensive_disease_diagnosis',
    response,
    confidence: topResult.confidence / 100,
    data: {
      disease,
      treatment,
      prevention,
      alternatives: diseaseResults.slice(1, 3)
    },
    suggestions: [
      '📷 Upload a photo for verification',
      '💊 Ask about fertilizer for recovery',
      '🔄 Describe more symptoms',
      '📞 Contact nearest KVK'
    ],
  };
}

// ─── Backward-compatible class ─────────────────────────────────────────────────
export class IndexedDBChatbotEngine {
  async answer(question, context = {}) {
    return answerFreeText(question, context);
  }
}

export default IndexedDBChatbotEngine;
