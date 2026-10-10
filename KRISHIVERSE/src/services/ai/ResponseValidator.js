/**
 * ResponseValidator.js
 *
 * Grounding + safety guard for every chatbot answer path (on-device LLM, local
 * knowledge base, Groq, backend proxy).
 *
 * Rules enforced:
 *  - Never allow the assistant to present an exact chemical/pesticide/fertilizer
 *    dosage, spray interval, or waiting period unless a verified (curated or
 *    source-tagged) local record backs the claim AND that record is scoped to
 *    the question's own crop (Phase 3E.2; see `isDosageBacker`). Crop-agnostic
 *    verified records remain eligible; provenance requirements are unchanged.
 *  - CONTENT BACKING (rice wrong-dose regression fix): crop scope alone is NOT
 *    enough — every numeric dose and spray schedule in the answer must appear
 *    in an eligible backer's own text. Verified rice evidence ("1g/liter") can
 *    no longer authorize a different number ("2 g per liter") or an unsupported
 *    interval ("every week"). Missing → blocked; same unit/different value →
 *    blocked as contradiction. See `extractDoseClaims` / `extractScheduleClaims`.
 *  - If evidence is insufficient, do NOT fabricate: return a safe limitation
 *    message and/or a contextual clarification question instead.
 *  - Confidence ladder: HIGH / MEDIUM / LOW / VERY_LOW with documented,
 *    configurable weights.
 */

import { getSourcePriority, isVerifiedRecord, normalizeCrop } from "./AgriculturalNLP";

// ─── Confidence ladder ────────────────────────────────────────────────────────
export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.75,
  MEDIUM: 0.55,
  LOW: 0.3,
  // below 0.3 → VERY_LOW
};

// Documented, configurable weights (must sum to 1.0).
export const CONFIDENCE_WEIGHTS = {
  retrieval: 0.3, // strength of the match score / stated confidence
  cropMatch: 0.15, // a crop was recognised in the question
  intentMatch: 0.1, // a known intent (disease/fertilizer/...) was recognised
  metadata: 0.1, // any KB record was actually used as evidence
  sourceVerified: 0.2, // at least one verified/curated record backs the answer
  sourcePriority: 0.1, // highest source-priority weight among evidence
  recordCount: 0.05, // number of evidence records (capped at 5)
};

const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, Number(v) || 0));

function confidenceLevel(score) {
  if (score >= CONFIDENCE_THRESHOLDS.HIGH) return "HIGH";
  if (score >= CONFIDENCE_THRESHOLDS.MEDIUM) return "MEDIUM";
  if (score >= CONFIDENCE_THRESHOLDS.LOW) return "LOW";
  return "VERY_LOW";
}

/**
 * Compute the confidence ladder score + level for an answer.
 * All inputs are optional; missing signals simply score 0.
 */
export function computeConfidence({
  retrievalScore = 0,
  cropMatch = false,
  intentMatch = false,
  metadataMatch = false,
  sourceVerified = false,
  sourcePriority = 0,
  recordCount = 0,
  contradictionDetected = false,
} = {}) {
  const w = CONFIDENCE_WEIGHTS;
  let score =
    w.retrieval * clamp(retrievalScore) +
    w.cropMatch * (cropMatch ? 1 : 0) +
    w.intentMatch * (intentMatch ? 1 : 0) +
    w.metadata * (metadataMatch ? 1 : 0) +
    w.sourceVerified * (sourceVerified ? 1 : 0) +
    w.sourcePriority * clamp(sourcePriority / 8) +
    w.recordCount * clamp(Math.min(recordCount, 5) / 5);

  if (contradictionDetected) score -= 0.25;
  score = clamp(score);

  return {
    score: Math.round(score * 1000) / 1000,
    level: confidenceLevel(score),
  };
}

// ─── Recommendation-type classification ───────────────────────────────────────
// High-risk claims: exact chemical doses, chemical classes, and harvest/re-entry
// intervals. These must never be invented.
export const HIGH_RISK_PATTERNS = [
  /\b\d+(?:\.\d+)?\s*(?:kg|g|mg|ml|l|litre|liter|ha|acre|hectare|ppm|per\s*cent|percent|%)\b/i,
  // Tamil/Hindi dosage units so localized chemical dosages (method_ta/method_hi)
  // block exactly like their English source (e.g. 3கி/லி, 3 ग्राम / लीटर).
  // \b is ASCII-only, so this pattern anchors on the digits instead.
  /\d+(?:\.\d+)?\s*(?:கி|கிராம்|மில்லி|லி|லிட்டர்|ஏக்கர்|சதவீதம்|ग्राम|मिली|लीटर|किलो|एकड़|हेक्टेयर|प्रतिशत)(?![\p{L}\p{N}])/u,
  /\b(insecticide|pesticide|fungicide|herbicide|nematicide|acaricide|rodenticide)\b/i,
  /\b(?:urea|dap|ssp|mop)\b/i,
  /\b(?:waiting\s*period|pre[- ]harvest\s*interval|re[- ]entry\s*interval|withhold)\b/i,
  /\b(?:days?|weeks?)\s*(?:before|after)\s*(?:harvest|spraying|spray|re[- ]entry)\b/i,
  /\b(?:spray|drench|apply|inject|foliar\s*application)\b[^.\n]{0,40}\b(?:kg|g|ml|l|litre|liter|ha|acre|ppm|per\s*plant|per\s*crop|per\s*acre|per\s*ha)\b/i,
];

export const RECOMMENDATION_PATTERNS = [
  // NOTE: bare "plant" (noun, as in "tell me about plants") is deliberately NOT
  // here — only the verb forms. Noun queries stay informational; advice verbs
  // (sow, treat, spray…) still match. See docs/evaluation-report.md §failures.
  /\b(?:spray|apply|use|treat|drench|recommend|prevent|control|sow|planting|planted)\b/i,
  /\b(?:treatment|remedy|dosage|dose|fertilizer|manure|pesticide|fungicide)\b/i,
];

/**
 * Classify an answer into informational / recommendation / high_risk.
 */
export function classifyRecommendationType(text) {
  const t = String(text || "");
  if (HIGH_RISK_PATTERNS.some((re) => re.test(t))) return "high_risk";
  if (RECOMMENDATION_PATTERNS.some((re) => re.test(t))) return "recommendation";
  return "informational";
}

/**
 * Extract the specific high-risk claims (doses, chemical names, intervals) that
 * were detected, for logging / transparency.
 */
export function extractHighRiskClaims(text) {
  const t = String(text || "");
  const claims = [];
  for (const re of HIGH_RISK_PATTERNS) {
    const match = t.match(re);
    if (match && match[0]) claims.push(match[0].trim());
  }
  return [...new Set(claims)].slice(0, 5);
}

// ─── Dosage backing (crop-scoped) ─────────────────────────────────────────────
/**
 * Can this record authorize an exact dose/high-risk claim?
 *
 * Phase 3E.2: `isVerifiedRecord` alone is NOT enough. A verified record that
 * declares a crop only backs a dose when the question's own crop is known and
 * matches it — otherwise (a) a cropless question like "spray schedule" could
 * borrow a rice record to unlock a tomato dose, and (b) a different-crop
 * question could do the same. Crop-agnostic verified records (no cropId/crop)
 * stay eligible, because they make no crop claim of their own.
 *
 * This restriction is deliberately scoped to dosage/high-risk authorization:
 * the evidence list itself is NOT filtered here (grounding, confidence and
 * recommendation reasons keep using `isVerifiedRecord` as before), and
 * provenance requirements are untouched.
 */
export function isDosageBacker(record, queryCrop) {
  if (!isVerifiedRecord(record)) return false;
  const raw = record?.cropId ?? record?.crop ?? null;
  if (!raw) return true; // crop-agnostic evidence never over-filters
  const q = String(queryCrop ?? "").trim().toLowerCase().replace(/^crop_/, "");
  if (!q) return false; // question never established the crop — not provable
  const rec = String(raw).toLowerCase().replace(/^crop_/, "");
  if (rec === q) return true;
  const recCrop = normalizeCrop(rec);
  const want = normalizeCrop(q);
  if (!recCrop || !want) return false;
  return recCrop === want;
}

// ─── Dose & schedule content backing ─────────────────────────────────────────
/**
 * Numeric dose claims (value + unit), Latin/Tamil/Hindi units, incl. % strength
 * and simple ranges ("4-6 kg" yields both 4kg and 6kg). Units are canonicalized
 * so "3 g", "3gm", "3கி" and "3 ग्राम" all compare as "3g".
 */
const DOSE_CLAIM_RE = /(\d+(?:[.,]\d+)?)\s*(?:[-–]\s*(\d+(?:[.,]\d+)?)\s*|\s+to\s+)?(kg|quintal|qtl|hectare|ha|acre|gm|gms|gram|grams|g|ml|cc|ltr|litre|liter|l|%|per\s?cent|கி|கிராம்|மில்லி|லி|லிட்டர்|ஏக்கர்|சதவீதம்|ग्राम|किलो|मिली|लीटर|एकड़|हेक्टेयर|प्रतिशत)(?![\p{L}\p{N}])/giu;

const DOSE_UNIT_CANON = {
  kg: "kg", கிலோ: "kg", किलो: "kg",
  quintal: "quintal", qtl: "quintal",
  g: "g", gm: "g", gms: "g", gram: "g", grams: "g", கி: "g", கிராம்: "g", ग्राम: "g",
  ml: "ml", மி: "ml", மில்லி: "ml", मिली: "ml",
  l: "l", ltr: "l", litre: "l", liter: "l", லி: "l", லிட்டர்: "l", लीटर: "l",
  cc: "cc", acre: "acre", ஏக்கர்: "acre", एकड़: "acre",
  hectare: "hectare", ha: "hectare", हेक्टेयर: "hectare",
  "%": "%", percent: "%", சதவீதம்: "%", प्रतिशत: "%",
};

/** Extract normalized dose claims ("1g", "75%", "4kg", "6kg") from text. */
export function extractDoseClaims(text) {
  const out = [];
  const s = String(text || "");
  DOSE_CLAIM_RE.lastIndex = 0;
  let m;
  while ((m = DOSE_CLAIM_RE.exec(s)) !== null) {
    const canon = DOSE_UNIT_CANON[(m[3] || "").toLowerCase().replace(/\s+/g, "")];
    if (!canon) continue;
    for (const raw of [m[1], m[2]]) {
      if (!raw) continue;
      const n = Number(String(raw).replace(",", "."));
      if (Number.isFinite(n)) out.push(`${String(n)}${canon}`);
    }
  }
  return [...new Set(out)];
}

/** Evidence fields that can carry a dose/schedule (KB treatment shapes). */
function evidenceText(rec) {
  if (!rec) return "";
  return [rec.text, rec.name, rec.description, rec.method, rec.method_ta, rec.method_hi,
    rec.treatment, rec.chemicalControl, rec.organicRemedy, rec.immediateAction,
    rec.dosage, rec.dose, rec.body].filter(Boolean).join(" ");
}

const SCHEDULE_CLAIM_RE = /\b(?:every|each|after|within)\s+\d+\s*(?:day|days|week|weeks|hour|hours)\b|\b(?:once|twice|thrice)\s+(?:a|per)\s+(?:day|week|month)\b|\b(?:every|each)\s+(?:day|week|month)\b|\b(?:daily|weekly|fortnightly|biweekly)\b/gi;
const ACTION_VERBS = /\b(spray|sprays|spraying|apply|applies|applying|applied|drench|drenching|treat|treats|treatment|treating|dose|dosing|seed[- ]treat|waiting\s*period|re[- ]entry)\b/i;

/** Extract normalized spray-schedule claims ("every 7 days", "weekly"). */
export function extractScheduleClaims(text) {
  const s = String(text || "");
  SCHEDULE_CLAIM_RE.lastIndex = 0;
  const out = [];
  let m;
  while ((m = SCHEDULE_CLAIM_RE.exec(s)) !== null) {
    out.push(m[0].toLowerCase().replace(/\s+/g, " ").trim());
  }
  return [...new Set(out)];
}

function scheduleBackedBy(claim, backerText) {
  const hay = String(backerText || "").toLowerCase().replace(/\s+/g, " ");
  if (!hay) return false;
  if (hay.includes(claim)) return true;
  // "every 7 days" is backed by "…after 7 days…" — strip the leading quantifier
  // (digit-bearing claims only; digitless "day" would over-match).
  const stripped = claim.replace(/^(?:every|each)\s+/, "");
  if (/^\d/.test(stripped)) {
    const re = new RegExp(`\\b${stripped.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
    if (re.test(hay)) return true;
  }
  return false;
}

// ─── Clarification questions ──────────────────────────────────────────────────
export const CLARIFICATION_OPTIONS = {
  crop: ["Rice", "Tomato", "Maize", "Groundnut", "Chilli", "Other"],
  symptom: ["Yellowing leaves", "Brown spots", "Wilting", "Leaf curl", "Pest attack", "Other"],
  fertilizer: ["Urea (Nitrogen)", "DAP (Phosphorus)", "MOP (Potassium)", "Compost / Organic", "Complete NPK"],
  detail: ["Crop name", "Symptom / issue", "Stage of the crop", "Your district"],
};

export function buildClarification({ parsed = {}, intent = "" } = {}) {
  if (!parsed?.crop) {
    return { question: "Which crop are you asking about?", options: CLARIFICATION_OPTIONS.crop };
  }
  if (intent === "disease" && !parsed.symptom) {
    return { question: "What are you seeing on the plant?", options: CLARIFICATION_OPTIONS.symptom };
  }
  if (intent === "fertilizer") {
    return { question: "Which fertilizer or nutrient are you interested in?", options: CLARIFICATION_OPTIONS.fertilizer };
  }
  return { question: "Can you share a bit more detail so I can help better?", options: CLARIFICATION_OPTIONS.detail };
}

// ─── Safe messages ────────────────────────────────────────────────────────────
export const SAFE_LIMITATION_MESSAGE = `## ⚠️ I need to be careful here

I can't safely give an exact chemical or fertilizer dose without a verified source. Wrong doses can damage your crop or harm people and animals.

**What you can do:**
• 📞 Call your nearest **KVK (Krishi Vigyan Kendra)** or local agriculture officer
• 📞 Kisan Call Centre: **1800-180-1551** (Free, 24/7)
• 🔍 Ask me about the **symptoms** or **prevention** instead — I can help with those offline`;

export function buildSafeLimitationMessage() {
  return SAFE_LIMITATION_MESSAGE;
}

function appendCaution(answer) {
  return `${String(answer).trimEnd()}\n\n> ⚠️ Please verify this guidance with your local KVK or agriculture officer before acting.`;
}

// ─── Response validation ──────────────────────────────────────────────────────
/**
 * Validate a candidate answer before it reaches the farmer.
 *
 * @param {object} opts
 * @param {string} opts.answer         - the candidate answer text
 * @param {string} [opts.source]       - ondevice-llm | local-knowledge-base | groq | backend-proxy
 * @param {number} [opts.confidence]   - 0..1 from the producing tier (if any)
 * @param {object[]} [opts.records]    - KB records actually used to build the answer
 * @param {object[]} [opts.evidence]   - extra KB evidence (e.g. fastSearch results)
 * @param {object} [opts.parsed]       - { crop, symptom } from parseQuery
 * @param {string} [opts.intent]       - classified intent
 *
 * @returns {{
 *   verdict: "safe"|"cautious"|"blocked",
 *   level: "HIGH"|"MEDIUM"|"LOW"|"VERY_LOW",
 *   safeAnswer: string,
 *   clarification: object|null,
 *   reasons: string[],
 *   confidence: { score: number, level: string },
 * }}
 */
export function validateResponse({
  answer,
  source = "unknown",
  confidence,
  records = [],
  evidence = [],
  parsed,
  intent,
}) {
  const recType = classifyRecommendationType(answer);
  const allEvidence = [...(records || []), ...(evidence || [])].filter(Boolean);
  const verifiedBacking = allEvidence.some(isVerifiedRecord);
  // Dosage backing is crop-scoped: evidence still lists everything (grounding
  // and confidence unchanged), but only crop-compatible verified records can
  // unlock an exact dose/high-risk claim.
  const doseBacking = allEvidence.some((rec) => isDosageBacker(rec, parsed?.crop));
  const sourcePriority = allEvidence.reduce((max, rec) => Math.max(max, getSourcePriority(rec)), 0);

  // CONTENT BACKING: the eligible backer must also contain the exact numbers
  // the answer claims (rice wrong-dose regression). Same unit + different value
  // is reported as a contradiction; absent value as unsupported.
  const doseClaims = extractDoseClaims(answer);
  const eligibleBackers = allEvidence.filter((rec) => isDosageBacker(rec, parsed?.crop));
  const backerDoses = eligibleBackers.map((rec) => extractDoseClaims(evidenceText(rec)));
  const backerUnits = new Set(backerDoses.flatMap((list) => list.map((d) => d.replace(/^\d+(?:\.\d+)?/, ""))));
  const missingDoses = doseClaims.filter((claim) => !backerDoses.some((list) => list.includes(claim)));
  const contradictedDoses = missingDoses.filter((claim) => backerUnits.has(claim.replace(/^\d+(?:\.\d+)?/, "")));
  const doseContentBacked = missingDoses.length === 0;

  // Spray schedules ("every 7 days", "weekly") need the same content backing
  // whenever the answer is actionable — an unsupported interval never reaches
  // the farmer.
  const scheduleClaims = extractScheduleClaims(answer);
  const actionable = recType !== "informational" || ACTION_VERBS.test(answer);
  const missingSchedules = actionable
    ? scheduleClaims.filter((claim) => !eligibleBackers.some((rec) => scheduleBackedBy(claim, evidenceText(rec))))
    : [];
  const scheduleContentBacked = missingSchedules.length === 0;

  const conf = computeConfidence({
    retrievalScore: typeof confidence === "number" ? confidence : 0,
    cropMatch: Boolean(parsed?.crop),
    intentMatch: Boolean(intent && intent !== "unknown"),
    metadataMatch: allEvidence.length > 0,
    sourceVerified: verifiedBacking,
    sourcePriority,
    recordCount: allEvidence.length,
  });

  const reasons = [];
  const highRiskClaims = extractHighRiskClaims(answer);

  if (recType === "high_risk" && !doseBacking) {
    reasons.push("high_risk_without_verified_source");
    if (verifiedBacking) reasons.push("high_risk_verified_evidence_crop_ineligible");
  }
  if (recType === "high_risk" && doseBacking && !doseContentBacked) {
    reasons.push(`dose_not_backed_by_evidence:${missingDoses.join(",")}`);
    if (contradictedDoses.length) reasons.push(`dose_contradicts_evidence:${contradictedDoses.join(",")}`);
  }
  if (!scheduleContentBacked) {
    reasons.push(`spray_schedule_not_backed_by_evidence:${missingSchedules.join(",")}`);
  }
  if (recType === "recommendation" && !verifiedBacking) {
    reasons.push("recommendation_without_verified_source");
  }
  if (conf.level === "VERY_LOW") reasons.push("very_low_confidence");
  if (conf.level === "LOW") reasons.push("low_confidence");
  if (highRiskClaims.length > 0) reasons.push(`high_risk_claims:${highRiskClaims.join(";")}`);

  const clarification = buildClarification({ parsed, intent });

  // BLOCKED: high-risk claims without crop-compatible verified backing, without
  // content backing, or unsupported spray schedules. Never fabricate.
  if (recType === "high_risk" && (!doseBacking || !doseContentBacked)) {
    return {
      verdict: "blocked",
      level: conf.level,
      safeAnswer: SAFE_LIMITATION_MESSAGE,
      clarification,
      reasons,
      confidence: conf,
      source,
      type: recType,
    };
  }

  if (!scheduleContentBacked) {
    return {
      verdict: "blocked",
      level: conf.level,
      safeAnswer: SAFE_LIMITATION_MESSAGE,
      clarification,
      reasons,
      confidence: conf,
      source,
      type: recType,
    };
  }

  if (conf.level === "VERY_LOW" && recType !== "informational") {
    return {
      verdict: "blocked",
      level: conf.level,
      safeAnswer: SAFE_LIMITATION_MESSAGE,
      clarification,
      reasons,
      confidence: conf,
      source,
      type: recType,
    };
  }

  // CAUTIOUS: high-risk but backed by evidence yet low confidence, or any LOW
  // confidence answer — keep the answer but flag it and ask for verification.
  if (conf.level === "LOW") {
    return {
      verdict: "cautious",
      level: conf.level,
      safeAnswer: appendCaution(answer),
      clarification: recType === "high_risk" ? clarification : null,
      reasons,
      confidence: conf,
      source,
      type: recType,
    };
  }

  // SAFE: high/medium confidence.
  return {
    verdict: "safe",
    level: conf.level,
    safeAnswer: answer,
    clarification: null,
    reasons,
    confidence: conf,
    source,
    type: recType,
  };
}

export default {
  CONFIDENCE_WEIGHTS,
  CONFIDENCE_THRESHOLDS,
  HIGH_RISK_PATTERNS,
  computeConfidence,
  classifyRecommendationType,
  extractHighRiskClaims,
  extractDoseClaims,
  extractScheduleClaims,
  buildClarification,
  buildSafeLimitationMessage,
  validateResponse,
};