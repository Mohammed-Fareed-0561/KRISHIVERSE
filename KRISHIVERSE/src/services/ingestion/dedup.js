/**
 * ingestion/dedup.js
 * 
 * Detects and reports duplicates in agricultural knowledge records.
 * Does NOT automatically merge uncertain records - creates a review report
 * for ambiguous duplicates instead.
 * Deterministic: same input always produces same output.
 */

// ─── Duplicate detection types ────────────────────────────────────

/**
 * Result of duplicate detection for a single record.
 */
class DuplicateResult {
  constructor(record, match, detectionType, confidence = 1.0) {
    this.record = record;
    this.match = match; // The matching record that duplicates this one
    this.detectionType = detectionType; // 'exact' | 'crop_disease' | 'crop_pest' | 'disease_symptom' | 'near_name'
    this.confidence = confidence; // 0.0 - 1.0, for near duplicates
    this.reviewNeeded = detectionType === 'near_name' || confidence < 1.0;
  }
}

/**
 * Detection results container.
 */
class DedupResults {
  constructor() {
    this.exactDuplicates = [];      // Same id
    this.cropDiseaseDuplicates = []; // Same crop + disease
    this.cropPestDuplicates = [];    // Same crop + pest
    this.diseaseSymptomDuplicates = []; // Same disease + symptom
    this.nearNameDuplicates = [];    // Similar names, needs review
    this.uniqueRecords = [];         // Records with no duplicates
    this.reviewReport = [];          // Records needing manual review
  }

  get totalDuplicates() {
    return this.exactDuplicates.length +
      this.cropDiseaseDuplicates.length +
      this.cropPestDuplicates.length +
      this.diseaseSymptomDuplicates.length +
      this.nearNameDuplicates.length;
  }

  get totalUnique() {
    return this.uniqueRecords.length;
  }

  get totalReview() {
    return this.reviewReport.length;
  }
}

/**
 * Detect duplicates in a batch of KB v2 normalized records.
 * 
 * @param {Array<object>} records - KB v2 normalized records
 * @param {object} [options] - Detection options
 * @param {boolean} [options.exactId=true] - Detect exact id duplicates
 * @param {boolean} [options.cropDisease=true] - Detect same crop + disease
 * @param {boolean} [options.cropPest=true] - Detect same crop + pest
 * @param {boolean} [options.diseaseSymptom=true] - Detect same disease + symptom
 * @param {number} [options.nameSimilarityThreshold=0.8] - Similarity threshold for near name matches
 * @returns {DedupResults} Detection results
 */
function detectDuplicates(records, options = {}) {
  const opts = {
    exactId: options.exitExactId !== false,
    cropDisease: options.cropDisease !== false,
    cropPest: options.cropPest !== false,
    diseaseSymptom: options.diseaseSymptom !== false,
    nameSimilarityThreshold: options.nameSimilarityThreshold !== undefined
      ? options.nameSimilarityThreshold
      : 0.8,
  };

  const results = new DedupResults();
  const seenById = new Map();       // id -> [records with that id]
  const seenByCropDisease = new Map(); // "cropId:diseaseId" -> [records]
  const seenByCropPest = new Map();   // "cropId" -> [records without diseaseId but with pest-like features]
  const seenByDiseaseSymptom = new Map(); // "diseaseId:symptomsHash" -> [records]

  // First pass: index records by various keys
  for (const record of records) {
    // 1. Exact id matching
    if (opts.exactId && record.id) {
      if (!seenById.has(record.id)) {
        seenById.set(record.id, []);
      }
      seenById.get(record.id).push(record);
    }

    // 2. Crop + disease matching
    if (opts.cropDisease && record.cropId && record.diseaseId) {
      const key = `${record.cropId}:${record.diseaseId}`;
      if (!seenByCropDisease.has(key)) {
        seenByCropDisease.set(key, []);
      }
      seenByCropDisease.get(key).push(record);
    }

    // 3. Crop + pest matching (crop without diseaseId, but with pest features)
    if (opts.cropPest && record.cropId && record.recordKind === 'pest') {
      const key = record.cropId;
      if (!seenByCropPest.has(key)) {
        seenByCropPest.set(key, []);
      }
      seenByCropPest.get(key).push(record);
    }

    // 4. Disease + symptom matching
    if (opts.diseaseSymptom && record.diseaseId && record.symptoms && record.symptoms.length > 0) {
      const symptomsHash = record.symptoms.sort().join('|');
      const key = `${record.diseaseId}:${symptomsHash}`;
      if (!seenByDiseaseSymptom.has(key)) {
        seenByDiseaseSymptom.set(key, []);
      }
      seenByDiseaseSymptom.get(key).push(record);
    }
  }

  // 2. Second pass: identify duplicates
  const recordIndices = new Map(); // record -> index in records array
  for (let i = 0; i < records.length; i++) {
    recordIndices.set(records[i], i);
  }

  // Track which records have been marked as duplicates
  const isDuplicate = new Set();

  // --- Exact id duplicates ---
  if (opts.exactId) {
    for (const [, matches] of seenById) {
      if (matches.length > 1) {
        // All records with the same id are duplicates of each other
        // Keep the first as "unique", mark the rest as duplicates
        const first = matches[0];

        for (let i = 1; i < matches.length; i++) {
          const dup = matches[i];
          results.exactDuplicates.push(new DuplicateResult(dup, first, 'exact'));
          isDuplicate.add(recordIndices.get(dup));
        }
      }
    }
  }

  // --- Crop + disease duplicates ---
  if (opts.cropDisease) {
    for (const [, matches] of seenByCropDisease) {
      if (matches.length > 1) {
        // All records with same crop + disease are duplicates
        // Keep first as unique, rest as duplicates
        const first = matches[0];

        for (let i = 1; i < matches.length; i++) {
          const dup = matches[i];
          results.cropDiseaseDuplicates.push(new DuplicateResult(dup, first, 'crop_disease'));
          isDuplicate.add(recordIndices.get(dup));
        }
      }
    }
  }

  // --- Crop + pest duplicates ---
  if (opts.cropPest) {
    for (const [, matches] of seenByCropPest) {
      if (matches.length > 1) {
        const first = matches[0];

        for (let i = 1; i < matches.length; i++) {
          const dup = matches[i];
          results.cropPestDuplicates.push(new DuplicateResult(dup, first, 'crop_pest'));
          isDuplicate.add(recordIndices.get(dup));
        }
      }
    }
  }

  // --- Disease + symptom duplicates ---
  if (opts.diseaseSymptom) {
    for (const [, matches] of seenByDiseaseSymptom) {
      if (matches.length > 1) {
        const first = matches[0];

        for (let i = 1; i < matches.length; i++) {
          const dup = matches[i];
          results.diseaseSymptomDuplicates.push(new DuplicateResult(dup, first, 'disease_symptom'));
          isDuplicate.add(recordIndices.get(dup));
        }
      }
    }
  }

  // --- Near name duplicates ---
  // Compare names using simple similarity (Jaccard on character trigrams, or simple starts/ends)
  const nameCandidates = [];

  for (const record of records) {
    // Skip if already marked as exact duplicate (same id)
    if (isDuplicate.has(recordIndices.get(record))) continue;

    // Collect records with name fields for comparison
    if (record.name && typeof record.name === 'string' && record.name.length > 0) {
      nameCandidates.push({ record, name: record.name.toLowerCase().trim() });
    }
    // Also check scientificName
    if (record.scientificName && typeof record.scientificName === 'string' && record.scientificName.length > 0) {
      nameCandidates.push({ record, name: record.scientificName.toLowerCase().trim() });
    }
  }

  // Compare all pairs
  for (let i = 0; i < nameCandidates.length; i++) {
    for (let j = i + 1; j < nameCandidates.length; j++) {
      const r1 = nameCandidates[i];
      const r2 = nameCandidates[j];

      // Skip if either record already has a duplicate of higher priority
      if (isDuplicate.has(recordIndices.get(r1.record)) || isDuplicate.has(recordIndices.get(r2.record))) {
        continue;
      }

      const similarity = nameSimilarity(r1.name, r2.name);

      if (similarity >= opts.nameSimilarityThreshold) {
        // This is a near duplicate - mark the second one
        // But only if neither has been captured by a higher-priority duplicate type
        // Check if already in a higher-priority list
        const alreadyCaptured =
          results.exactDuplicates.some(d => d.record === r1.record ||
                                          d.record === r2.record) ||
          results.cropDiseaseDuplicates.some(d => d.record === r1.record ||
                                              d.record === r2.record) ||
          results.cropPestDuplicates.some(d => d.record === r1.record ||
                                             d.record === r2.record) ||
          results.diseaseSymptomDuplicates.some(d => d.record === r1.record ||
                                                 d.record === r2.record);

        if (!alreadyCaptured) {
          // Determine which record is "second" based on id order
          const idx1 = recordIndices.get(r1.record);
          const idx2 = recordIndices.get(r2.record);
          const second = idx1 < idx2 ? r2.record : r1.record;
          const first = idx1 < idx2 ? r1.record : r2.record;

          results.nearNameDuplicates.push(new DuplicateResult(second, first, 'near_name', similarity));
          isDuplicate.add(recordIndices.get(second));
        }
      }
    }
  }

  // --- Collect unique records (not marked as duplicates) ---
  for (const record of records) {
    if (!isDuplicate.has(recordIndices.get(record))) {
      results.uniqueRecords.push(record);
    }
  }

  // --- Generate review report for near-name duplicates ---
  for (const dup of results.nearNameDuplicates) {
    results.reviewReport.push({
      type: 'near_duplicate_name',
      recordId: dup.record.id || 'unknown',
      matchRecordId: dup.match.id || 'unknown',
      recordName: dup.record.name || dup.record.scientificName || '',
      matchName: dup.match.name || dup.match.scientificName || '',
      similarity: dup.confidence,
      reason: 'Names are similar but provenance or context differs - requires manual review',
    });
  }

  // --- Also add records with missing provenance to review ---
  for (const record of records) {
    if (!record.source && record.recordKind !== 'unknown') {
      results.reviewReport.push({
        type: 'missing_provenance',
        recordId: record.id || 'unknown',
        reason: 'Record has no source provenance - requires verification before inclusion',
      });
    }
  }

  return results;
}

/**
 * Calculate simple name similarity using character trigram Jaccard index.
 * 
 * @param {string} a
 * @param {string} b
 * @returns {number} Similarity score between 0 and 1
 */
function nameSimilarity(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;

  // Generate trigrams
  const trigramsA = new Set();
  const trigramsB = new Set();

  for (let i = 0; i <= a.length - 3; i++) {
    trigramsA.add(a.substring(i, i + 3));
  }
  for (let i = 0; i <= b.length - 3; i++) {
    trigramsB.add(b.substring(i, i + 3));
  }

  // Jaccard similarity
  const intersection = new Set([...trigramsA].filter(x => trigramsB.has(x)));
  const union = new Set([...trigramsA, ...trigramsB]);

  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

/**
 * Generate a deduplication summary report.
 * 
 * @param {DedupResults} results - Results from detectDuplicates
 * @returns {object} Summary report
 */
function generateDedupReport(results) {
  return {
    totalRecords: results.uniqueRecords.length + results.totalDuplicates,
    totalUnique: results.totalUnique,
    totalDuplicates: results.totalDuplicates,
    exactDuplicates: results.exactDuplicates.length,
    cropDiseaseDuplicates: results.cropDiseaseDuplicates.length,
    cropPestDuplicates: results.cropPestDuplicates.length,
    diseaseSymptomDuplicates: results.diseaseSymptomDuplicates.length,
    nearNameDuplicates: results.nearNameDuplicates.length,
    recordsRequiringReview: results.reviewReport.length,
    reviewBreakdown: results.reviewReport.reduce((acc, r) => {
      acc[r.type] = (acc[r.type] || 0) + 1;
      return acc;
    }, {}),
  };
}

// ─── Export ───────────────────────────────────────────────────────

export {
  DedupResults,
  DuplicateResult,
  detectDuplicates,
  generateDedupReport,
  nameSimilarity,
};