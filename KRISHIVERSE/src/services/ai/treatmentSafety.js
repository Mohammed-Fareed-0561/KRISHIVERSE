/**
 * treatmentSafety.js
 *
 * Verified-treatment policy for the Crop Doctor (image diagnosis) flow.
 *
 * A chemical/fertilizer/pesticide dosage may ONLY be shown to the farmer when
 * the backing knowledge-base record carries full provenance:
 *   - verified === true
 *   - a non-empty source
 *   - a non-empty sourceUrl
 *
 * Under the current KB (KB_SCHEMA_VERSION 2) every record is unverified, so no
 * hardcoded or KB-sourced dosage can reach the farmer. When no verified
 * treatment exists we never invent a dose and never fall back to the old
 * hardcoded chemical advice — we show a safe message instead. Non-chemical
 * (dosage-free) guidance is kept, and everything is classified through the same
 * HIGH_RISK_PATTERNS the ResponseValidator uses.
 */

import { HIGH_RISK_PATTERNS } from "./ResponseValidator";

export const VERIFIED_TREATMENT_UNAVAILABLE =
  "Verified treatment information is unavailable for this condition. Do not apply chemicals without expert guidance — consult your local agriculture officer or Krishi Vigyan Kendra (KVK) before any treatment.";

/**
 * A record is trusted to back a high-risk (chemical/fertilizer/pesticide)
 * dosage only when it carries full provenance: verified flag + source + sourceUrl.
 */
export function isFullyVerified(record) {
  if (!record) return false;
  return record.verified === true && Boolean(record.source) && Boolean(record.sourceUrl);
}

/**
 * True when a treatment string contains a high-risk claim (exact chemical dose,
 * chemical class, spray interval…). Reuses the ResponseValidator's patterns so
 * the Crop Doctor and the chat validator enforce the same rules.
 */
export function hasHighRiskDosage(text) {
  const t = String(text || "");
  if (!t) return false;
  return HIGH_RISK_PATTERNS.some((re) => re.test(t));
}

/** Normalize a treatment entry (string or {action, description, name}) to text. */
export function toTreatmentText(entry) {
  if (!entry) return "";
  if (typeof entry === "string") return entry;
  return entry.action || entry.description || entry.name || "";
}

/**
 * Filter a treatment list against the verified-only dosage policy.
 *
 * @param {Array} list treatments (strings or {action|description|name})
 * @param {{ backing?: Array }} options backing KB records; any dosage-bearing
 *   entry is kept ONLY if at least one backing record isFullyVerified.
 * @returns {{ kept: Array, blocked: Array }}
 */
export function sanitizeTreatmentList(list, { backing = [] } = {}) {
  const trusted = backing.some(isFullyVerified);
  const kept = [];
  const blocked = [];
  for (const entry of list ?? []) {
    const text = toTreatmentText(entry);
    if (!text) continue;
    if (hasHighRiskDosage(text)) {
      if (trusted) kept.push(entry);
      else blocked.push(entry);
    } else {
      kept.push(entry);
    }
  }
  return { kept, blocked };
}

/**
 * Sanitize a `{ recommendations: { natural, chemical, ... } }` diagnosis result
 * (the shape produced by GeminiVisionService). Every section that loses all of
 * its trusted content is replaced with the safe verification message.
 */
export function sanitizeRecommendations(recommendations, options = {}) {
  if (!recommendations || typeof recommendations !== "object") {
    return {
      immediate: "Verified treatment information is unavailable for this condition.",
      natural: [VERIFIED_TREATMENT_UNAVAILABLE],
      chemical: [VERIFIED_TREATMENT_UNAVAILABLE],
    };
  }

  const natural = sanitizeTreatmentList(recommendations.natural, options);
  const chemical = sanitizeTreatmentList(recommendations.chemical, options);

  return {
    ...recommendations,
    natural: natural.kept.length > 0 ? natural.kept : [VERIFIED_TREATMENT_UNAVAILABLE],
    chemical: chemical.kept.length > 0 ? chemical.kept : [VERIFIED_TREATMENT_UNAVAILABLE],
  };
}

export default {
  VERIFIED_TREATMENT_UNAVAILABLE,
  isFullyVerified,
  hasHighRiskDosage,
  toTreatmentText,
  sanitizeTreatmentList,
  sanitizeRecommendations,
};
