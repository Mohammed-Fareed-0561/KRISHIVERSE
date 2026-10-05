/**
 * ingestion/normalizer.js
 * 
 * Normalizes parsed agricultural document records into KB v2 schema format.
 * Deterministic: same input always produces same output.
 * Does not mark records as verified unless source is authoritative and traceable.
 * Leaves null for any field not present in the source document.
 */
// NOTE: lodash was imported here but never used — dropped in the ESM conversion
// (Phase 3C ingestion repair; no behavior change).

// ─── KB v2 schema field definitions ───────────────────────────────

// Record types supported
const SUPPORTED_RECORD_KINDS = [
  'crop', 'disease', 'pest', 'symptom',
  'nutrient_deficiency', 'treatment', 'fertilizer',
  'irrigation', 'harvest', 'storage', 'faq', 'scheme'
];

// Crop type aliases mapping
const CROP_ALIASES_MAP = {
  'rice': 'RICE', 'wheat': 'WHEAT', 'cotton': 'COTTON',
  'tomato': 'TOMATO', 'chili': 'CHILI', 'onion': 'ONION',
  'mango': 'MANGO', 'banana': 'BANANA', 'turmeric': 'TURMERIC',
  'groundnut': 'GROUNDNUT', 'blackgram': 'BLACKGRAM',
  'greengram': 'GREENGRAM', 'coriander': 'CORIANDER',
  'brinjal': 'BRINJAL', 'ladyfinger': 'LADYFINGER',
  'papaya': 'PAPAYA'
};

// Record kind -> default fields mapping
const KIND_DEFAULTS = {
  crop: {
    searchable: true,
    confidence: 0,
    verified: false,
    verifiedBy: null,
    verifiedDate: null,
    lastUpdated: null,
    languages: { en: true, ta: false, hi: false }
  },
  disease: {
    searchable: true,
    confidence: 0,
    verified: false,
    verifiedBy: null,
    verifiedDate: null,
    lastUpdated: null,
    languages: { en: true, ta: false, hi: false }
  },
  pest: {
    searchable: true,
    confidence: 0,
    verified: false,
    verifiedBy: null,
    verifiedDate: null,
    lastUpdated: null,
    languages: { en: true, ta: false, hi: false }
  },
  symptom: {
    searchable: true,
    confidence: 0,
    verified: false,
    verifiedBy: null,
    verifiedDate: null,
    lastUpdated: null,
    languages: { en: true, ta: false, hi: false }
  },
  treatment: {
    searchable: true,
    confidence: 0,
    verified: false,
    verifiedBy: null,
    verifiedDate: null,
    lastUpdated: null,
    languages: { en: true, ta: false, hi: false },
    highRisk: false,
    dosageType: null
  },
  fertilizer: {
    searchable: true,
    confidence: 0,
    verified: false,
    verifiedBy: null,
    verifiedDate: null,
    lastUpdated: null,
    languages: { en: true, ta: false, hi: false }
  },
  irrigation: {
    searchable: true,
    confidence: 0,
    verified: false,
    verifiedBy: null,
    verifiedDate: null,
    lastUpdated: null,
    languages: { en: true, ta: false, hi: false }
  },
  harvest: {
    searchable: true,
    confidence: 0,
    verified: false,
    verifiedBy: null,
    verifiedDate: null,
    lastUpdated: null,
    languages: { en: true, ta: false, hi: false }
  },
  storage: {
    searchable: true,
    confidence: 0,
    verified: false,
    verifiedBy: null,
    verifiedDate: null,
    lastUpdated: null,
    languages: { en: true, ta: false, hi: false }
  },
  faq: {
    searchable: true,
    confidence: 0,
    verified: false,
    verifiedBy: null,
    verifiedDate: null,
    lastUpdated: null,
    languages: { en: true, ta: false, hi: false }
  },
  scheme: {
    searchable: true,
    confidence: 0,
    verified: false,
    verifiedBy: null,
    verifiedDate: null,
    lastUpdated: null,
    languages: { en: true, ta: false, hi: false }
  }
};

/**
 * Normalize a single record into KB v2 schema format.
 * 
 * @param {object} rawRecord - Raw record from importer
 * @param {string} rawRecordKind - The kind of record (crop, disease, etc.)
 * @param {string} [source='unknown'] - Source identifier from the document
 * @returns {object} Normalized KB v2 record
 */
function normalizeRecord(rawRecord, rawRecordKind, source = 'unknown') {
  // `recordKind` is overloaded in this codebase and the two meanings MUST NOT be
  // confused (Phase 3C audit):
  //   - CONTENT kind  : crop | disease | pest | symptom | treatment | ... (SUPPORTED_RECORD_KINDS)
  //   - PROVENANCE class: "curated" | "synthetic" (used by db/kbNormalize + the v2 KB)
  // Callers (importer, kb-ingest CLI) supply the CONTENT kind positionally. The
  // record's own `recordKind` is only a fallback, and only accepted when it is a
  // content kind — a provenance class must never be promoted to a content kind.
  // Unknown stays 'unknown' (the validator rejects it) rather than being guessed.
  const fromCaller = typeof rawRecordKind === 'string' ? rawRecordKind.trim().toLowerCase() : '';
  const fromRecord = typeof rawRecord?.recordKind === 'string' ? rawRecord.recordKind.trim().toLowerCase() : '';
  const kind = SUPPORTED_RECORD_KINDS.includes(fromCaller)
    ? fromCaller
    : SUPPORTED_RECORD_KINDS.includes(fromRecord)
      ? fromRecord
      : (fromCaller || fromRecord || 'unknown');

  // Start with a clone of the appropriate defaults
  const base = { ...KIND_DEFAULTS[kind] || KIND_DEFAULTS.crop };

  // Build the normalized record
  const normalized = {
    // Identity
    id: rawRecord.id || rawRecord.id || null,
    recordKind: kind || 'unknown',
    status: rawRecord.status || 'active',

    // Searchable flag
    searchable: rawRecord.searchable !== undefined ? !!rawRecord.searchable : base.searchable,

    // Crop/disease relationships
    cropId: rawRecord.cropId || null,
    diseaseId: rawRecord.diseaseId || null,

    // Core name fields
    name: rawRecord.name || null,
    scientificName: rawRecord.scientificName || null,
    aliases: rawRecord.aliases || [],

    // Language support
    languages: rawRecord.languages || base.languages,

    // Content fields by record type
    // Symptoms
    symptoms: rawRecord.symptoms || (kind === 'symptom' ? [rawRecord.name || null] : []),
    cause: rawRecord.cause || null,

    // Prevention and remedies
    prevention: rawRecord.prevention || null,
    immediateAction: rawRecord.immediateAction || null,
    organicRemedy: rawRecord.organicRemedy || null,
    biologicalControl: rawRecord.biologicalControl || null,
    chemicalControl: rawRecord.chemicalControl || null,

    // Fertilizer and irrigation
    fertilizer: rawRecord.fertilizer || (kind === 'fertilizer' ? rawRecord.name || null : null),
    irrigation: rawRecord.irrigation || (kind === 'irrigation' ? rawRecord.name || null : null),

    // Source provenance (CRITICAL: never mark verified without traceable source)
    source: rawRecord.source || source || null,
    sourceUrl: rawRecord.sourceUrl || null,
    verified: rawRecord.verified,
    // NOTE: verified is ONLY set to true if the caller explicitly provides it.
    // This normalizer NEVER sets verified = true on its own.
    verifiedBy: rawRecord.verifiedBy || null,
    verifiedDate: rawRecord.verifiedDate || null,
    lastUpdated: rawRecord.lastUpdated || null,

    // Confidence score
    confidence: typeof rawRecord.confidence === 'number' ? rawRecord.confidence : (base.confidence || 0),

    // Source metadata
    recordKind: kind,
    // kind is already set above
  };

  // Ensure aliases is always an array
  if (!Array.isArray(normalized.aliases)) {
    normalized.aliases = [];
  }

  // Ensure symptoms is always an array
  if (!Array.isArray(normalized.symptoms)) {
    normalized.symptoms = [];
  }

  // Trim name if it's a string
  if (typeof normalized.name === 'string') {
    normalized.name = normalized.name.trim();
  }
  if (typeof normalized.scientificName === 'string') {
    normalized.scientificName = normalized.scientificName.trim();
  }

  // Set cropId for crop records based on name alias mapping
  if (kind === 'crop' && normalized.name && !normalized.cropId) {
    const lowerName = normalized.name.toLowerCase();
    const mapped = CROP_ALIASES_MAP[lowerName];
    if (mapped) {
      normalized.cropId = mapped;
    }
  }

  return normalized;
}

/**
 * Normalize a batch of records from any source format into KB v2 schema.
 * 
 * @param {Array<object>} records - Raw records from importer
 * @param {string} [kind] - Default record kind if not specified per record
 * @param {string} [source='unknown'] - Default source if not specified
 * @returns {Array<object>} Array of KB v2 normalized records
 */
function normalizeBatch(records, kind, source) {
  return records
    .map(record => normalizeRecord(record, kind, source))
    .filter(r => r.id !== null && r.id !== undefined && r.id !== '');
}

/**
 * Add provenance tracking to normalized records.
 * This records when and how the record was imported, but does NOT set verified=true.
 * 
 * @param {Array<object>} records - KB v2 normalized records
 * @param {object} importInfo - Import metadata
 * @returns {Array<object>} Records with added provenance
 */
function addProvenance(records, importInfo) {
  const timestamp = importInfo.importDate || new Date().toISOString();

  return records.map(record => ({
    ...record,
    _importedAt: timestamp,
    _importSource: importInfo.source || 'unknown',
    _importBatch: importInfo.batchId || 'default',
    // verified is NEVER set to true here. It is only PRESERVED when the source
    // record already carried an explicit `true` (which the validator has already
    // required to have source + sourceUrl). Forcing `false` here would silently
    // destroy authoritative provenance that survived import — provenance loss is
    // a pipeline defect, not a safety measure (Phase 3C).
    verified: record.verified === true
  }));
}

/**
 * Validate that a normalized KB v2 record has all required fields.
 * 
 * @param {object} record - KB v2 normalized record
 * @returns {{valid: boolean, missing: Array<string>, warnings: Array<string>}}
 */
function validateRequiredFields(record) {
  const missing = [];
  const warnings = [];

  // Every record needs at least an id or name
  if (!record.id && !record.name) {
    missing.push('id or name');
  }

  // recordKind must be valid
  if (!record.recordKind || !SUPPORTED_RECORD_KINDS.includes(record.recordKind)) {
    missing.push('valid recordKind');
  }

  // Language object should have at least en
  if (!record.languages || !record.languages.en) {
    warnings.push('No English language support');
  }

  // Source should be present for non-synthetic records
  if (record.recordKind !== 'synthetic' && !record.source) {
    warnings.push('Missing source provenance');
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings
  };
}

/**
 * Infer the record kind from the record content if not explicitly specified.
 * Uses heuristic rules based on field presence.
 * 
 * @param {object} record - Partial KB v2 record
 * @returns {string} Inferred record kind
 */
function inferRecordKind(record) {
  const kind = record.recordKind;
  if (kind && SUPPORTED_RECORD_KINDS.includes(kind)) {
    return kind;
  }

  // Heuristics based on field presence
  if (record.fertilizer !== undefined && record.fertilizer !== null) {
    return 'fertilizer';
  }
  if (record.irrigation !== undefined && record.irrigation !== null) {
    return 'irrigation';
  }
  if (record.symptoms && Array.isArray(record.symptoms) && record.symptoms.length > 0) {
    return 'symptom';
  }
  if (record.diseaseId !== null && record.diseaseId !== undefined) {
    return 'disease';
  }
  if (record.cropId !== null && record.cropId !== undefined) {
    return 'crop';
  }
  if (record.name && /(treatment|remedy|dosage|curative|spray)/i.test(record.name)) {
    return 'treatment';
  }

  return 'unknown';
}

// ─── Export ───────────────────────────────────────────────────────

export {
  SUPPORTED_RECORD_KINDS,
  normalizeRecord,
  normalizeBatch,
  addProvenance,
  validateRequiredFields,
  inferRecordKind,
  KIND_DEFAULTS,
};