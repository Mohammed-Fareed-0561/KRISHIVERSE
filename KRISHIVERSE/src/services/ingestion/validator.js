/**
 * ingestion/validator.js
 * 
 * Validates KB v2 normalized agricultural records against schema requirements,
 * relationship constraints, and chemical safety rules.
 * 
 * Critical: Chemical recommendations require verified === true + source + sourceUrl.
 * Otherwise verified = false and the ResponseValidator must block the dosage.
 */
// NOTE: lodash was imported here but never used — dropped in the ESM conversion
// (Phase 3C ingestion repair; no behavior change).

// ─── Known KB v2 crop IDs ────────────────────────────────────────

// These would normally be loaded from the KB, but we define a core set here
const KNOWN_CROP_IDS = new Set([
  'RICE', 'WHEAT', 'COTTON', 'TOMATO', 'CHILI', 'ONION',
  'MANGO', 'BANANA', 'TURMERIC', 'GROUNDNUT',
  'BLACKGRAM', 'GREENGRAM', 'CORIANDER', 'BRINJAL',
  'LADYFINGER', 'PAPAYA'
]);

// ─── Validation result ──────────────────────────────────────────

/**
 * Validation result for a single record.
 */
class ValidationResult {
  constructor() {
    this.valid = true;
    this.errors = [];      // Fatal errors - record should be rejected
    this.warnings = [];    // Warnings - record accepted but with issues
    this.infos = [];       // Informational notes
  }

  addError(msg) {
    this.valid = false;
    this.errors.push(msg);
  }

  addWarning(msg) {
    this.warnings.push(msg);
  }

  addInfo(msg) {
    this.infos.push(msg);
  }
}

/**
 * Validate a single KB v2 normalized record.
 * 
 * @param {object} record - KB v2 normalized record
 * @param {Array<string>} [knownCropIds] - Known crop IDs from the KB
 * @param {Array<string>} [knownDiseaseIds] - Known disease IDs from the KB
 * @returns {ValidationResult}
 */
function validateRecord(record, knownCropIds, knownDiseaseIds) {
  const result = new ValidationResult();
  const { recordKind, source, sourceUrl, verified, name, symptoms,
    diseaseId, cropId, chemicalControl, organicRemedy, biologicalControl } = record;

  // ─── 1. Required fields ──────────────────────────────────────
  if (!record.id && !record.name) {
    result.addError('Record must have id or name');
  }

  // ─── 2. recordKind validation ────────────────────────────────
  if (!recordKind || !['crop', 'disease', 'pest', 'symptom', 'treatment',
    'fertilizer', 'irrigation', 'harvest', 'storage', 'faq', 'scheme'].includes(recordKind)) {
    result.addError(`Invalid recordKind: ${recordKind}`);
  }

  // ─── 3. Source provenance ────────────────────────────────────
  // Critical: Chemical safety rule
  // ================================
  // Chemical recommendations (chemicalControl, or any field containing dosage/
  // chemical names) require verified === true AND source AND sourceUrl.
  // If not, verified must remain false and the ResponseValidator will block.
  if (recordKind === 'treatment') {
    // Check for dosage patterns in any text field
    const textFields = [organicRemedy, biologicalControl, chemicalControl, name].filter(
      f => f && typeof f === 'string'
    );
    const hasDosagePattern = textFields.some(f => /(\d+(?:\.\d+)?\s*(g|kg|mg|ml|l| litre|percent|%|kg\/ha))/i.test(f));

    if (hasDosagePattern && !verified && (!source || !sourceUrl)) {
      result.addWarning('Chemical dosage present without full provenance - ResponseValidator will block dosage');
    }

    // If dosage present without verified source, flag but don't block here
    // (ResponseValidator handles the UI blocking)
    if (hasDosagePattern && verified && (!source || !sourceUrl)) {
      result.addWarning('Dosage marked verified but provenance incomplete - sourceUrl may be missing');
    }
  }

  // Source must be present for non-synthetic records (with warning, not error)
  if (recordKind !== 'synthetic' && !source) {
    result.addWarning('Record missing source provenance');
  }

  // If source is present, sourceUrl should ideally be present for treatments
  if (source && recordKind === 'treatment' && !sourceUrl) {
    result.addWarning('Treatment has source but no sourceUrl - verification incomplete');
  }

  // ─── 4. Crop ID validation ───────────────────────────────────
  if (cropId && !knownCropIds.includes(cropId)) {
    result.addWarning(`Unrecognized cropId: ${cropId}`);
  }

  // If record is a disease and has cropId, cropId should be known
  if (recordKind === 'disease' && cropId && !knownCropIds.includes(cropId)) {
    result.addError(`Disease record has unrecognized cropId: ${cropId}`);
  }

  // ─── 5. Disease ID validation ────────────────────────────────
  if (diseaseId && !knownDiseaseIds.includes(diseaseId)) {
    result.addWarning(`Unrecognized diseaseId: ${diseaseId}`);
  }

  // If record is a treatment and has diseaseId, diseaseId should be known
  if (recordKind === 'treatment' && diseaseId && !knownDiseaseIds.includes(diseaseId)) {
    result.addError(`Treatment record has unrecognized diseaseId: ${diseaseId}`);
  }

  // ─── 5. Relationship validation ──────────────────────────────
  // Crop -> Disease: disease records with cropId should have valid crop
  if (recordKind === 'disease' && cropId) {
    // Check that cropId is in the right format
    if (cropId && !/^crop_[a-z0-9]+$/i.test(cropId) && !KNOWN_CROP_IDS.has(cropId)) {
      // Could be a legacy format, warning only
      result.addWarning(`Disease cropId format may not match KB v2: ${cropId}`);
    }
  }

  // Disease -> Treatment: treatment records with diseaseId
  if (recordKind === 'treatment' && diseaseId) {
    // Check diseaseId format
    if (diseaseId && !/^dp_[a-z0-9_]+$/i.test(diseaseId)) {
      result.addWarning(`Treatment diseaseId format may not match KB v2: ${diseaseId}`);
    }
  }

  // Symptom fields should be array
  if (symptoms !== undefined && !Array.isArray(symptoms)) {
    result.addError('symptoms field must be an array');
  }

  // ─── 5. Verified state validation ────────────────────────────
  // The normalizer NEVER sets verified = true.
  // Only the ingestion pipeline's verification step can set it, and only with full provenance.
  if (verified === true && (!source || !sourceUrl)) {
    result.addError('Record marked verified but missing source or sourceUrl - provenance incomplete');
  }

  if (verified === true && source && sourceUrl) {
    result.addInfo('Record fully verified with provenance');
  }

  // If verified is set but source is empty string or sourceUrl is empty
  if (verified === true && (source === '' || sourceUrl === '')) {
    result.addError('Record marked verified with empty source or sourceUrl');
  }

  // ─── 6. Unsafe dosage claims (chemical safety) ───────────────
  // These are flagged for the ResponseValidator to block at the UI level
  // The validator here just reports; actual blocking is in ResponseValidator
  
  const dosagePatterns = [
    /(\d+(?:\.\d+)?\s*g\/L)/i,
    /(\d+(?:\.\d+)?\s*kg\/ha)/i,
    /(\d+(?:\.\d+)?\s*ml\/L)/i,
    /(\d+(?:\.\d+)?\s*percent)/i,
    /(\d+(?:\.\d+)?\s*%)/i,
  ];

  const textContainingDosage = [
    record.name,
    record.chemicalControl,
    record.organicRemedy,
    record.biologicalControl,
  ].filter(t => t && typeof t === 'string').some(text => dosagePatterns.some((re) => re.test(text)));

  if (textContainingDosage && !(verified === true && source && sourceUrl)) {
    result.addWarning('Unverified chemical dosage claim - ResponseValidator will block at UI');
  }

  // ─── 7. Duplicate ID check (high-level) ──────────────────────
  if (record.id) {
    // Check for null/empty id
    if (record.id.trim() === '') {
      result.addError('Record ID is empty string');
    }
  }

  // ─── 8. Content completeness checks ──────────────────────────
  // For certain record types, ensure required content exists
  const typeChecks = {
    crop: !!record.name,
    disease: !!record.name || !!record.scientificName,
    treatment: !!(record.chemicalControl || record.organicRemedy || record.immediateAction),
    fertilizer: !!record.fertilizer,
    irrigation: !!record.irrigation,
  };

  if (typeChecks[recordKind] === false) {
    result.addWarning(`${recordKind} record may be missing required content`);
  }

  return result;
}

/**
 * Validate a batch of records.
 * 
 * @param {Array<object>} records - KB v2 normalized records
 * @param {Array<string>} [knownCropIds] - Known crop IDs
 * @param {Array<string>} [knownDiseaseIds] - Known disease IDs
 * @returns {Array<ValidationResult>} Validation results for each record
 */
function validateBatch(records, knownCropIds, knownDiseaseIds) {
  knownCropIds = knownCropIds || [...KNOWN_CROP_IDS];
  knownDiseaseIds = knownDiseaseIds || [];

  return records.map(record => validateRecord(record, knownCropIds, knownDiseaseIds));
}

/**
 * Validate relationships between records in a batch.
 * Checks that referenced entities exist and relationships are valid.
 * 
 * @param {Array<object>} records - KB v2 normalized records
 * @param {Array<string>} knownCropIds - Known crop IDs
 * @param {Array<string>} knownDiseaseIds - Known disease IDs
 * @returns {{valid: boolean, relationshipErrors: Array<object>, info: Array<object>}}
 */
function validateRelationships(records, knownCropIds, knownDiseaseIds) {
  knownCropIds = knownCropIds || [...KNOWN_CROP_IDS];
  knownDiseaseIds = knownDiseaseIds || [];

  const relationshipErrors = [];
  const info = [];
  const recordMap = new Map();

  // Build map of records by id
  for (const record of records) {
    if (record.id) {
      recordMap.set(record.id, record);
    }
  }

  // Check all relationships
  for (const record of records) {
    const recordKind = record.recordKind;

    // Crop -> Disease relationships
    if (record.cropId && recordKind === 'disease') {
      if (!knownCropIds.includes(record.cropId)) {
        relationshipErrors.push({
          type: 'invalid_crop_ref',
          recordId: record.id,
          field: 'cropId',
          value: record.cropId,
          message: `Disease references unknown crop: ${record.cropId}`,
        });
      }
    }

    // Disease -> Treatment relationships
    if (record.diseaseId && record.recordKind === 'treatment') {
      if (!knownDiseaseIds.includes(record.diseaseId)) {
        relationshipErrors.push({
          type: 'invalid_disease_ref',
          recordId: record.id,
          field: 'diseaseId',
          value: record.diseaseId,
          message: `Treatment references unknown disease: ${record.diseaseId}`,
        });
      }
    }

    // Treatment -> Disease (must have valid diseaseId)
    if (record.recordKind === 'treatment' && !record.diseaseId) {
      relationshipErrors.push({
        type: 'missing_disease_ref',
        recordId: record.id,
        field: 'diseaseId',
        message: 'Treatment record missing diseaseId reference',
      });
    }

    // Store info
    if (record.verified === true && record.source && record.sourceUrl) {
      info.push({
        type: 'fully_verified',
        recordId: record.id,
        message: 'Record has full provenance verification',
      });
    }
  }

  return {
    valid: relationshipErrors.length === 0,
    relationshipErrors,
    info,
  };
}

// ─── Export ───────────────────────────────────────────────────────

export {
  ValidationResult,
  validateRecord,
  validateBatch,
  validateRelationships,
  KNOWN_CROP_IDS,
};