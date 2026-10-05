/**
 * ingestion/report.js
 * 
 * Generates comprehensive ingestion reports covering all aspects of the
 * knowledge import pipeline: records processed, duplicates, validation,
 * provenance, and relationship health.
 */

// ─── Report types ────────────────────────────────────────────────

/**
 * Main ingestion report object.
 */
class IngestionReport {
  constructor() {
    this.documentsImported = 0;
    this.recordsCreated = 0;
    this.recordsUpdated = 0;
    this.recordsSkipped = 0;
    this.duplicates = 0;
    this.invalidRecords = 0;
    this.unverifiedRecords = 0;
    this.verifiedRecords = 0;
    this.highRiskRecords = 0;
    this.missingProvenance = 0;
    this.brokenRelationships = 0;
    this.details = {
      byRecordKind: {},
      bySource: {},
      validation: {
        errors: [],
        warnings: [],
        infos: [],
      },
      dedup: {
        exactDuplicates: 0,
        cropDiseaseDuplicates: 0,
        cropPestDuplicates: 0,
        diseaseSymptomDuplicates: 0,
        nearNameDuplicates: 0,
        uniqueRecords: 0,
      },
      provenance: {
        recordsWithSource: 0,
        recordsWithSourceUrl: 0,
        recordsVerified: 0,
        recordsUnverified: 0,
        sourceBreakdown: {},
      },
      relationships: {
        totalChecked: 0,
        validRelationships: 0,
        brokenRelationships: 0,
      },
    };
  }

  /**
   * Set the number of documents imported.
   * @param {number} count
   * @returns {this}
   */
  withDocumentsImported(count) {
    this.documentsImported = count;
    return this;
  }

  /**
   * Set records created (new records added to KB).
   * @param {number} count
   * @returns {this}
   */
  withRecordsCreated(count) {
    this.recordsCreated = count;
    return this;
  }

  /**
   * Set records updated (existing KB records refreshed).
   * @param {number} count
   * @returns {this}
   */
  withRecordsUpdated(count) {
    this.recordsUpdated = count;
    return this;
  }

  /**
   * Set records skipped (could not be parsed/normalized).
   * @param {number} count
   * @returns {this}
   */
  withRecordsSkipped(count) {
    this.recordsSkipped = count;
    return this;
  }

  /**
   * Set duplicates count.
   * @param {number} count
   * @returns {this}
   */
  withDuplicates(count) {
    this.duplicates = count;
    return this;
  }

  /**
   * Set invalid records count.
   * @param {number} count
   * @returns {this}
   */
  withInvalidRecords(count) {
    this.invalidRecords = count;
    return this;
  }

  /**
   * Set unverified records count.
   * @param {number} count
   * @returns {this}
   */
  withUnverifiedRecords(count) {
    this.unverifiedRecords = count;
    return this;
  }

  /**
   * Set verified records count.
   * @param {number} count
   * @returns {this}
   */
  withVerifiedRecords(count) {
    this.verifiedRecords = count;
    return this;
  }

  /**
   * Set high-risk records count.
   * @param {number} count
   * @returns {this}
   */
  withHighRiskRecords(count) {
    this.highRiskRecords = count;
    return this;
  }

  /**
   * Set missing provenance count.
   * @param {number} count
   * @returns {this}
   */
  withMissingProvenance(count) {
    this.missingProvenance = count;
    return this;
  }

  /**
   * Set broken relationships count.
   * @param {number} count
   * @returns {this}
   */
  withBrokenRelationships(count) {
    this.brokenRelationships = count;
    return this;
  }

  /**
   * Add breakdown by record kind.
   * @param {object} kindCounts - { crop: number, disease: number, ... }
   * @returns {this}
   */
  withByRecordKind(kindCounts) {
    this.details.byRecordKind = kindCounts;
    return this;
  }

  /**
   * Add breakdown by source.
   * @param {object} sourceCounts - { TNAU: 15, ICAR: 10, ... }
   * @returns {this}
   */
  withBySource(sourceCounts) {
    this.details.bySource = sourceCounts;
    return this;
  }

  /**
   * Add validation errors.
   * @param {Array<string>} errors
   * @returns {this}
   */
  withValidationErrors(errors) {
    this.details.validation.errors = errors;
    return this;
  }

  /**
   * Add validation warnings.
   * @param {Array<string>} warnings
   * @returns {this}
   */
  withValidationWarnings(warnings) {
    this.details.validation.warnings = warnings;
    return this;
  }

  /**
   * Add validation infos.
   * @param {Array<string>} infos
   * @returns {this}
   */
  withValidationInfos(infos) {
    this.details.validation.infos = infos;
    return this;
  }

  /**
   * Add dedupplication details.
   * @param {{exactDuplicates, cropDiseaseDuplicates, cropPestDuplicates, diseaseSymptomDuplicates, nearNameDuplicates, uniqueRecords}} details
   * @returns {this}
   */
  withDedupDetails(details) {
    this.details.dedup = { ...this.details.dedup, ...details };
    return this;
  }

  /**
   * Add provenance details.
   * @param {{recordsWithSource, recordsWithSourceUrl, recordsVerified, recordsUnverified, sourceBreakdown}} details
   * @returns {this}
   */
  withProvenanceDetails(details) {
    this.details.provenance = { ...this.details.provenance, ...details };
    return this;
  }

  /**
   * Add relationship details.
   * @param {{totalChecked, validRelationships, brokenRelationships}} details
   * @returns {this}
   */
  withRelationshipDetails(details) {
    this.details.relationships = { ...this.details.relationships, ...details };
    return this;
  }

  /**
   * Record a validation error.
   * @param {string} error
   * @returns {this}
   */
  addError(error) {
    this.details.validation.errors.push(error);
    return this;
  }

  /**
   * Add a validation warning.
   * @param {string} warning
   * @returns {this}
   */
  addWarning(warning) {
    this.details.validation.warnings.push(warning);
    return this;
  }

  /**
   * Add a validation info.
   * @param {string} info
   * @returns {this}
   */
  addInfo(info) {
    this.details.validation.infos.push(info);
    return this;
  }

  /**
   * Convert to plain object for JSON serialization.
   * @returns {object}
   */
  toObject() {
    return {
      documentsImported: this.documentsImported,
      recordsCreated: this.recordsCreated,
      recordsUpdated: this.recordsUpdated,
      recordsSkipped: this.recordsSkipped,
      duplicates: this.duplicates,
      invalidRecords: this.invalidRecords,
      unverifiedRecords: this.unverifiedRecords,
      verifiedRecords: this.verifiedRecords,
      highRiskRecords: this.highRiskRecords,
      missingProvenance: this.missingProvenance,
      brokenRelationships: this.brokenRelationships,
      details: this.details,
    };
  }
}

/**
 * Create a default ingestion report and populate it from pipeline results.
 * 
 * @param {{imported, normalized, validated, dedup, provenance, relationships}} pipelineResults
 * @returns {IngestionReport}
 */
function buildReport(pipelineResults) {
  const report = new IngestionReport();

  // Basic counts
  report
    .withDocumentsImported(pipelineResults.imported?.length || 0)
    .withRecordsCreated(pipelineResults.normalized?.length || 0)
    .withRecordsSkipped(pipelineResults.imported?.length ? 
      (pipelineResults.imported.length - pipelineResults.normalized?.length || 0) : 0);

  // Validation results
  const validation = pipelineResults.validated;
  if (validation) {
    report.withInvalidRecords(validation.invalidRecords || 0);
    report.withUnverifiedRecords(validation.unverifiedRecords || 0);
    report.withVerifiedRecords(validation.verifiedRecords || 0);
    report.withHighRiskRecords(validation.highRiskRecords || 0);
    report.withMissingProvenance(validation.missingProvenance || 0);

    // Add validation details
    if (validation.errors && validation.errors.length > 0) {
      report.addError(...validation.errors.slice(0, 20)); // cap at 20
    }
    if (validation.warnings && validation.warnings.length > 0) {
      report.addWarning(...validation.warnings.slice(0, 20));
    }
    if (validation.infos && validation.infos.length > 0) {
      report.addInfo(...validation.infos.slice(0, 20));
    }
  }

  // Duplication results
  const dedup = pipelineResults.dedup;
  if (dedup) {
    report
      .withDuplicates(dedup.totalDuplicates || 0)
      .withDedupDetails({
        exactDuplicates: dedup.exactDuplicates?.length || 0,
        cropDiseaseDuplicates: dedup.cropDiseaseDuplicates?.length || 0,
        cropPestDuplicates: dedup.cropPestDuplicates?.length || 0,
        diseaseSymptomDuplicates: dedup.diseaseSymptomDuplicates?.length || 0,
        nearNameDuplicates: dedup.nearNameDuplicates?.length || 0,
        uniqueRecords: dedup.uniqueRecords?.length || 0,
      });
  }

  // Provenance details
  const provenance = pipelineResults.provenance;
  if (provenance) {
    report
      .withMissingProvenance(provenance.missingProvenance || 0)
      .withHighRiskRecords(provenance.highRiskRecords || 0);

    report.withProvenanceDetails({
      recordsWithSource: provenance.recordsWithSource || 0,
      recordsWithSourceUrl: provenance.recordsWithSourceUrl || 0,
      recordsVerified: provenance.recordsVerified || 0,
      recordsUnverified: provenance.recordsUnverified || 0,
      sourceBreakdown: provenance.sourceBreakdown || {},
    });
  }

  // Relationship details
  const relationships = pipelineResults.relationships;
  if (relationships) {
    report
      .withBrokenRelationships(relationships.brokenRelationships || 0)
      .withRelationshipDetails({
        totalChecked: relationships.totalChecked || 0,
        validRelationships: relationships.validRelationships || 0,
      });
  }

  // By record kind breakdown
  if (pipelineResults.byRecordKind && Object.keys(pipelineResults.byRecordKind).length > 0) {
    report.withByRecordKind(pipelineResults.byRecordKind);
  }

  // By source breakdown
  if (pipelineResults.bySource && Object.keys(pipelineResults.bySource).length > 0) {
    report.withBySource(pipelineResults.bySource);
  }

  return report;
}

/**
 * Serialize report to JSON string.
 * @param {IngestionReport} report
 * @param {number} [indent=2] - JSON indentation
 * @returns {string}
 */
function serializeReport(report, indent = 2) {
  return JSON.stringify(report.toObject(), null, indent);
}

// ─── Export ───────────────────────────────────────────────────────

export {
  IngestionReport,
  buildReport,
  serializeReport,
};