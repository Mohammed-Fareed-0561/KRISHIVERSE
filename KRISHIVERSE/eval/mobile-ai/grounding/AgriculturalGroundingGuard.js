/**
 * eval/mobile-ai/grounding/AgriculturalGroundingGuard.js
 *
 * ISOLATED prototype — AgriculturalGroundingGuard.
 * Does NOT replace ResponseValidator, does not run in the farmer runtime,
 * and contains NO model calls: a hallucination detector must not become a
 * second hallucinating LLM. Every decision below is a deterministic,
 * reproducible evidence check.
 *
 * Classifies each extracted claim, then the whole response:
 *   SUPPORTED | PARTIALLY_SUPPORTED | UNSUPPORTED | CONTRADICTED
 *   | HIGH_RISK_UNSUPPORTED | INSUFFICIENT_EVIDENCE
 *
 * Checks, in order: (1) claim extraction, (2) claim→evidence mapping,
 * (3) crop applicability, (4) disease applicability, (5) source/provenance,
 * (6) contradiction (numeric/dosage conflicts), (7) high-risk claim type.
 */

export const GROUNDING_STATUSES = Object.freeze([
  "SUPPORTED",
  "PARTIALLY_SUPPORTED",
  "UNSUPPORTED",
  "CONTRADICTED",
  "HIGH_RISK_UNSUPPORTED",
  "INSUFFICIENT_EVIDENCE",
]);

// Worst-first severity used to roll claims up into an overall verdict.
const SEVERITY = Object.freeze({
  CONTRADICTED: 6,
  HIGH_RISK_UNSUPPORTED: 5,
  UNSUPPORTED: 4,
  INSUFFICIENT_EVIDENCE: 3,
  PARTIALLY_SUPPORTED: 2,
  SUPPORTED: 1,
});

const CLAIM_TYPES = Object.freeze(["dosage", "treatment", "recommendation", "causal", "symptom", "general"]);

const STOP_WORDS = new Set([
  "the", "is", "are", "was", "were", "be", "to", "of", "and", "or", "in", "on", "at",
  "a", "an", "for", "with", "from", "by", "as", "it", "this", "that", "these", "those",
  "you", "your", "we", "our", "i", "me", "my", "can", "will", "should", "must", "do",
  "does", "if", "then", "than", "not", "no", "yes", "very", "please", "how", "what",
  "when", "where", "who", "why", "which", "into", "over", "under", "up", "out", "also",
  "before", "after", "during", "per", "every", "all", "any", "some", "has", "have", "had",
]);

const BOILERPLATE = /(verify|consult|kvk|label|local authorit|agronomist|for information|advisory only|கவனம்|suatu|always follow)/i;

// Narrative (non-actionable) claims must never be classed as treatment/dosage.
const NARRATIVE = /\b(was|were|been|being)\s+\w+(ed|en)\b|\bcampaign\b|\beradicat|\bhistory\b|\bspread in 20|\bin (19|20)\d\d\b/i;

const DOSE_UNITS = "kg|quintal|qtl|gm|gms|g|gram|grams|ml|ltr|l|liter|litre|litres|cc|acre|hectare|ha";
const DOSAGE_NUMBER = new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*(${DOSE_UNITS}|%)`, "gi");
const TAMIL_DOSE = /(\d+(?:[.,]\d+)?)\s*(கி|கிராம்|மி|மில்லி|லி|லிட்டர்)/gi;
// Only application-dose units can carry a dose contradiction (not % strength).
const DOSE_ONLY = new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*(${DOSE_UNITS})`, "gi");

const HIGH_RISK_NOUNS = /(pesticide|insecticide|fungicide|herbicide|spray|dose|dosage|a\.i\.|emulsion|w\.p\.|s\.c\.|ec\b|urea|dap|ssp|mop|npk|tricyclazole|mancozeb|carbendazim|isoprothiolane|chlorantraniliprole|imidacloprid|monocrotophos|உரம்|மருந்து)/i;
const TREATMENT_VERBS = /(spray|apply|treat|control|use|administer|drench|seed treat|dose|give|add|prevent|manage|protect|தெளிக்க|போடு|விதை|ஊட்ட)/i;
const CAUSAL = /(caused by|because of|due to|results from|leads to|ஏனெனில்|காரணமாக)/i;
const RECOMMEND = /(should|must|need to|have to|recommended|advise|recommend|வேண்டும்|வாருங்கள்)/i;

// Generic agri vocabulary that must never count as a cross-lingual anchor.
const ANCHOR_COMMON = new Set([
  "disease", "diseases", "treatment", "treatments", "infected", "infection",
  "affected", "percent", "pesticide", "insecticide", "fungicide", "herbicide",
  "fertilizer", "fertiliser", "agriculture", "agricultural", "application",
]);

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}%./]+/gu, " ")
    .trim();
}

function contentTokens(text) {
  const base = normalize(text).split(/\s+/).filter(Boolean);
  const out = [];
  for (const t of base) {
    if (STOP_WORDS.has(t)) continue;
    if (/^\d+(\.\d+)?$/.test(t) && t.length > 3) continue; // long pure numbers are noise for overlap
    out.push(t);
  }
  return out;
}

/** Extract numeric+unit dosage strings from a text (Latin + Tamil units). */
export function extractDosages(text) {
  const found = [];
  const s = String(text || "");
  for (const re of [DOSAGE_NUMBER, TAMIL_DOSE]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(s)) !== null) {
      found.push(`${m[1]}${(m[2] || "").toLowerCase()}`);
    }
  }
  return found;
}

/** Application-dose strings only (excludes % formulation strength). */
export function extractDoseUnits(text) {
  const found = [];
  const s = String(text || "");
  DOSE_ONLY.lastIndex = 0;
  let m;
  while ((m = DOSE_ONLY.exec(s)) !== null) found.push(`${m[1]}${m[2].toLowerCase()}`);
  for (const re of [TAMIL_DOSE]) {
    re.lastIndex = 0;
    while ((m = re.exec(s)) !== null) found.push(`${m[1]}${m[2].toLowerCase()}`);
  }
  return found;
}

const unitOf = (dose) => dose.replace(/^\d+(?:[.,]\d+)?/, "");

export function classifyClaimType(text) {
  const doseUnits = extractDoseUnits(text);
  if (doseUnits.length > 0 && !NARRATIVE.test(text)) return "dosage";
  const actionable = !NARRATIVE.test(text)
    && (HIGH_RISK_NOUNS.test(text) || /^\s*(spray|apply|drench|use|treat|give|add|administer|dose|avoid|do not)\b/i.test(text));
  if (actionable && TREATMENT_VERBS.test(text)) return "treatment";
  if (HIGH_RISK_NOUNS.test(text) && !NARRATIVE.test(text) && extractDosages(text).length > 0) return "treatment";
  if (RECOMMEND.test(text)) return "recommendation";
  if (CAUSAL.test(text)) return "causal";
  if (/(spots|yellow|wilt|rot|blight|blast|curl|mold| lesion|புள்ளி|மஞ்சள்|வாட)/i.test(text)) return "symptom";
  return "general";
}

/** Split an answer into factual claims, dropping non-factual boilerplate. */
export function extractClaims(answer) {
  const sentences = String(answer || "")
    .split(/(?<=[.!?।])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const claims = [];
  for (const s of sentences) {
    if (BOILERPLATE.test(s) && extractDosages(s).length === 0) continue; // safety text, not a claim
    for (const part of s.split(/;\s*|\s+and\s+(?=[a-z])/i)) {
      const p = part.trim().replace(/^[,\s]+/, "");
      if (p.length < 8) continue;
      if (BOILERPLATE.test(p) && extractDosages(p).length === 0) continue;
      claims.push({ text: p, type: classifyClaimType(p) });
    }
  }
  return claims;
}

function evidenceBlob(record) {
  return normalize([record.text, record.name, record.description, record.body, record.treatment,
    record.source, record.sourceUrl, record.id].filter(Boolean).join(" "));
}

function hasProvenance(record) {
  return Boolean(record.sourceUrl || record.source) && (record.verified === true || Boolean(record.sourceUrl));
}

function cropCompatible(record, crop) {
  if (!crop) return true;
  const rc = record.cropId || record.crop || null;
  if (!rc) return true; // generic record: cannot reject, but cannot carry crop-specific dose either
  // KB record ids look like "crop_rice" while contexts use canonical "rice".
  const canon = (v) => normalize(String(v).replace(/^crop_/, ""));
  return canon(rc) === canon(crop);
}

function diseaseCompatible(record, disease) {
  if (!disease) return true;
  const rd = record.diseaseId || record.disease || null;
  if (!rd) return true;
  // diseaseId may be a KB record id ("tnau_rice_blast") or underscored slug.
  const canon = (v) => normalize(String(v).replace(/_/g, " "));
  const a = canon(rd);
  const b = canon(disease);
  return a === b || a.includes(b) || b.includes(a);
}

function overlapScore(claimTokens, evidenceTokens) {
  if (!claimTokens.length) return 0;
  const set = new Set(evidenceTokens);
  let hit = 0;
  for (const t of claimTokens) if (set.has(t)) hit += 1;
  return hit / claimTokens.length;
}

/**
 * Assess one claim against the retrieved evidence.
 * Deterministic: thresholds below are fixed constants, never tuned per-run.
 */
function assessClaim(claim, evidence, context) {
  const reasons = [];
  const claimTokens = contentTokens(claim.text);

  const applicable = evidence.filter((r) => cropCompatible(r, context.crop) && diseaseCompatible(r, context.disease));
  const rejected = evidence.length - applicable.length;
  if (rejected > 0) reasons.push(`${rejected} evidence record(s) rejected: crop/disease not applicable`);
  if (!evidence.length) return { ...claim, status: "INSUFFICIENT_EVIDENCE", reasons: ["no evidence provided"], evidenceIds: [] };

  if (!applicable.length) {
    const status = claim.type === "dosage" || claim.type === "treatment" ? "HIGH_RISK_UNSUPPORTED" : "UNSUPPORTED";
    reasons.push("evidence exists but none is applicable to this crop/disease");
    return { ...claim, status, reasons, evidenceIds: [] };
  }

  // 6. contradiction: same unit, different number, in applicable evidence.
  //    Only application-dose units count — a % formulation strength (75% WP)
  //    is not a dose and must not back or contradict one.
  const claimDoses = extractDoseUnits(claim.text);
  if (claimDoses.length && !NARRATIVE.test(claim.text)) {
    const evDoses = applicable.flatMap((r) => extractDoseUnits(evidenceBlob(r)));
    const evSet = new Set(evDoses);
    const matchedExact = claimDoses.filter((d) => evSet.has(d));
    const conflicting = claimDoses.filter((d) => !evSet.has(d)
      && evDoses.some((e) => unitOf(e) === unitOf(d)));
    if (conflicting.length) {
      reasons.push(`dosage conflict: claim ${conflicting.join(",")} vs evidence ${evDoses.join(",") || "none"}`);
      return { ...claim, status: "CONTRADICTED", reasons, evidenceIds: applicable.map((r) => r.id) };
    }
    if (!matchedExact.length) {
      reasons.push(`dosage not present in applicable evidence (claim: ${claimDoses.join(",")})`);
      const provenanceOk = applicable.some(hasProvenance);
      if (!provenanceOk) reasons.push("backing evidence lacks source/provenance");
      return { ...claim, status: "HIGH_RISK_UNSUPPORTED", reasons, evidenceIds: applicable.map((r) => r.id) };
    }
    // dose string is present — still requires provenance for a high-risk claim
    const provenanceOk = applicable.some((r) => hasProvenance(r)
      && extractDoseUnits(evidenceBlob(r)).some((d) => matchedExact.includes(d)));
    if (!provenanceOk) {
      reasons.push("dosage present in evidence but evidence is unverified / lacks provenance");
      return { ...claim, status: "HIGH_RISK_UNSUPPORTED", reasons, evidenceIds: applicable.map((r) => r.id) };
    }
    reasons.push("dosage string found in provenance-bearing applicable evidence");
    return { ...claim, status: "SUPPORTED", reasons, evidenceIds: applicable.map((r) => r.id) };
  }

  // 2/5. token-overlap support + provenance
  let best = { score: 0, record: null };
  const perRecord = applicable.map((r) => ({ r, score: overlapScore(claimTokens, contentTokens(evidenceBlob(r))) }));
  for (const p of perRecord) if (p.score > best.score) best = p;
  const provenanceOk = perRecord.some((p) => p.score >= 0.3 && hasProvenance(p.r));

  // Cross-lingual anchor: a distinctive named entity (scientific name, product)
  // present in provenance-bearing applicable evidence grounds a symptom/causal/
  // general claim even when token overlap is low (e.g. Tamil sentence ↔ Latin KB).
  if (claim.type === "symptom" || claim.type === "causal" || claim.type === "general") {
    const evTokens = new Set(contentTokens(applicable.map((r) => evidenceBlob(r)).join(" ")));
    const anchors = claimTokens.filter((t) => t.length >= 7 && !ANCHOR_COMMON.has(t));
    const hit = anchors.find((t) => evTokens.has(t));
    if (hit && applicable.some(hasProvenance)) {
      reasons.push(`anchored by named entity "${hit}" in provenance-bearing evidence`);
      return { ...claim, status: "SUPPORTED", reasons, evidenceIds: applicable.map((r) => r.id) };
    }
  }

  if (best.score >= 0.55) {
    if (provenanceOk) {
      reasons.push(`supported by ${perRecord.filter((p) => p.score >= 0.55 && hasProvenance(p.r)).map((p) => p.r.id).join(",")}`);
      return { ...claim, status: "SUPPORTED", reasons, evidenceIds: applicable.map((r) => r.id) };
    }
    reasons.push(`content matches evidence (${best.score.toFixed(2)}) but evidence lacks provenance`);
    return { ...claim, status: "PARTIALLY_SUPPORTED", reasons, evidenceIds: applicable.map((r) => r.id) };
  }
  if (best.score >= 0.3) {
    reasons.push(`partial evidence overlap (${best.score.toFixed(2)})`);
    if (claim.type === "dosage" || claim.type === "treatment") {
      reasons.push("high-risk claim type with only partial backing");
      return { ...claim, status: "HIGH_RISK_UNSUPPORTED", reasons, evidenceIds: applicable.map((r) => r.id) };
    }
    return { ...claim, status: "PARTIALLY_SUPPORTED", reasons, evidenceIds: applicable.map((r) => r.id) };
  }

  reasons.push(`no applicable evidence covers this claim (best overlap ${best.score.toFixed(2)})`);
  if (claim.type === "dosage" || claim.type === "treatment" || claim.type === "recommendation") {
    return { ...claim, status: "HIGH_RISK_UNSUPPORTED", reasons, evidenceIds: applicable.map((r) => r.id) };
  }
  return { ...claim, status: "UNSUPPORTED", reasons, evidenceIds: applicable.map((r) => r.id) };
}

/**
 * @param {{answer:string, evidence?:Array<object>, context?:{crop?:string, disease?:string}}} input
 * @returns {{overall:string, claims:Array, evidenceCount:number, crop:string|null, reasons:string[]}}
 */
export function assessResponse({ answer, evidence = [], context = {} } = {}) {
  const claims = extractClaims(answer);
  if (!evidence.length) {
    return {
      overall: "INSUFFICIENT_EVIDENCE",
      claims: claims.map((c) => ({ ...c, status: "INSUFFICIENT_EVIDENCE", reasons: ["no evidence provided"], evidenceIds: [] })),
      evidenceCount: 0,
      crop: context.crop || null,
      reasons: ["retrieved evidence is empty — every claim is ungrounded"],
    };
  }
  const assessed = claims.map((c) => assessClaim(c, evidence, context));
  let overall = "SUPPORTED";
  for (const c of assessed) {
    if (SEVERITY[c.status] > SEVERITY[overall]) overall = c.status;
  }
  if (!assessed.length) overall = "INSUFFICIENT_EVIDENCE";
  return {
    overall,
    claims: assessed,
    evidenceCount: evidence.length,
    crop: context.crop || null,
    disease: context.disease || null,
    reasons: assessed.flatMap((c) => (c.status === overall ? c.reasons.map((r) => `${c.type}: ${r}`) : [])).slice(0, 6),
  };
}

export default { assessResponse, extractClaims, classifyClaimType, extractDosages, GROUNDING_STATUSES };
