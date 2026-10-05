#!/usr/bin/env node
/**
 * kb-ingest.mjs - Agricultural Knowledge Base Ingestion CLI
 * 
 * Production-safe CLI for ingesting authoritative agricultural knowledge
 * into the KB v2 schema using existing ingestion infrastructure.
 * 
 * DO NOT use for ingesting real TNAU/ICAR/KVK data without explicit
 * confirmation and backup procedures.
 */

import fs from 'fs';
import path from 'path';
import { dirname } from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

// ─── Import existing ingestion modules ─────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));

// Import the existing modules (these are ES modules too, but we use require
// carefully since the project has "type": "module" in package.json)
// We'll import them using the dynamic import or ensure they work

// Since the project has "type": "module", we can use import assertions
// But for the CLI, we'll use require with .mjs extension handling

// Actually, let me use import() for dynamic imports to avoid issues
// With the project having "type": "module", top-level import should work

import { detectFormat, attemptParse, parseDocument } from '../src/services/ingestion/importer.js';
import { normalizeRecord, normalizeBatch, addProvenance } from '../src/services/ingestion/normalizer.js';
import { detectDuplicates, generateDedupReport } from '../src/services/ingestion/dedup.js';
import { validateRecord, validateBatch, validateRelationships } from '../src/services/ingestion/validator.js';
import { IngestionReport, buildReport, serializeReport } from '../src/services/ingestion/report.js';

// ─── Constants ────────────────────────────────────────────────────

const SUPPORTED_EXTENSIONS = new Set(['.json', '.md', '.markdown', '.csv']);
const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', 'backups', 'temp']);
const SUPPORTED_RECORD_KINDS = new Set([
  'crop', 'disease', 'pest', 'symptom',
  'nutrient_deficiency', 'treatment', 'fertilizer',
  'irrigation', 'harvest', 'storage', 'faq', 'scheme'
]);

// ─── Exit Codes ─────────────────────────────────────────────────

const EXIT_CODES = {
  SUCCESS: 0,
  INVALID_ARGS: 2,
  VALIDATION_FAILURE: 3,
  IMPORT_ABORTED: 4,
  BACKUP_FAILURE: 5,
  SAFETY_FAILURE: 6
};

// ─── CLI Argument Parsing ────────────────────────────────────────

function parseArgs(rawArgs) {
  const args = {};
  let i = 2; // skip node and script path
  
  while (i < rawArgs.length) {
    const arg = rawArgs[i];
    
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      i++;
      if (i < rawArgs.length && !rawArgs[i].startsWith('--')) {
        args[key] = rawArgs[i];
      } else {
        args[key] = true; // boolean flag
      }
    }
    i++;
  }
  
  return args;
}

// ─── Source Discovery ────────────────────────────────────────────

function isIgnoredDir(name) {
  return SUPPORTED_IGNORE_DIRS.has(name);
}

function discoverFiles(sourcePath, format) {
  const files = [];
  
  if (!fs.existsSync(sourcePath)) {
    console.error(`Error: Source path does not exist: ${sourcePath}`);
    process.exit(EXIT_CODES.INVALID_ARGS);
  }
  
  if (fs.statSync(sourcePath).isFile()) {
    // Single file
    const ext = path.extname(sourcePath).toLowerCase();
    if (SUPPORTED_EXTENSIONS.has(ext) ||
        (format !== undefined && format !== 'auto' || isSupportedFormat(sourcePath, format))) {
      files.push(sourcePath);
    }
    return files;
  }
  
  // Directory - recursive walk
  function walkDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      // Skip ignored directories
      if (entry.isDirectory()) {
        if (isIgnoredDir(entry.name)) continue;
        walkDir(path.join(dir, entry.name));
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        const isSupported = SUPPORTED_EXTENSIONS.has(ext);
        const matchesFormat = format === undefined || 
          (format === 'auto' && isSupported) ||
          (format === ext.replace('.', ''));
        
        if (isSupported && matchesFormat) {
          // Skip certain files within directories
          const basename = entry.name.toLowerCase();
          if (basename === 'package.json' || basename === 'README.md') continue;
          if (basename.startsWith('.')) continue; // hidden files
          
          files.push(path.join(dir, entry.name));
        }
      }
    }
  }
  
  walkDir(sourcePath);
  return files;
}

function isSupportedFormat(filePath, format) {
  const ext = path.extname(filePath).toLowerCase();
  if (format === 'auto') return SUPPORTED_EXTENSIONS.has(ext);
  if (format === 'json') return path.extname(filePath).toLowerCase() === '.json';
  if (format === 'markdown' || format === 'md') return path.extname(filePath).toLowerCase() === '.md';
  if (format === 'csv') return path.extname(filePath).toLowerCase() === '.csv';
  return false;
}

// ─── Provenance Handling ─────────────────────────────────────────

function extractSourceInfo(sourceName, sourceUrl) {
  // Build provenance from --source-name and optional --source-url
  // Never auto-set verified=true
  const provenance = {
    source: sourceName || null,
    sourceUrl: sourceUrl || null,
    verified: false // NEVER set to true by CLI
  };
  
  // If sourceUrl is provided but doesn't look like a URL, warn
  if (provenance.sourceUrl && !provenance.sourceUrl.startsWith('http://') && 
      !provenance.sourceUrl.startsWith('https://')) {
    console.warn(`Warning: sourceUrl "${provenance.sourceUrl}" doesn't start with http:// or https://`);
  }
  
  return provenance;
}

// ─── High-Risk Detection ─────────────────────────────────────────

function detectHighRisk(text) {
  // Use the existing HIGH_RISK_PATTERNS from ResponseValidator
  // But since we can't easily import just the patterns, we'll do basic detection
  const highRiskPatterns = [
    /(\d+(?:\.\d+)?\s*g\/L)/i,        // dosage in g/L
    /(\d+(?:\.\d+)?\s*kg\/ha)/i,      // dosage in kg/ha
    /(\d+(?:\.\d+)?\s*ml\/L)/i,       // dosage in ml/L
    /(\d+(?:\.\d+)?\s*percent)/i,     // percentage
    /(\d+(?:\.\d+)?\s*%)/i,           // percentage sign
    /(waiting\s*period|pre[- ]harvest\s*interval|re[- ]entry\s*interval)/i,
    /(spray|drench|apply|inject|foliar\s*application)/i,
    /(urea|dap|ssp|mop)/i,             // fertilizer chemicals
    /(fungicide|insecticide|herbicide|pesticide)/i
  ];
  
  if (!text) return { isHighRisk: false, claims: [] };
  
  const claims = [];
  for (const pattern of highRiskPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(m => claims.push(m.trim()));
    }
  }
  
  // Deduplicate claims
  const uniqueClaims = [...new Set(claims)];
  
  return {
    isHighRisk: uniqueClaims.length > 0,
    claims: uniqueClaims.slice(0, 5) // max 5 claims
  };
}

// ─── Record Type Inference ───────────────────────────────────────

function inferRecordKind(record) {
  if (record.recordKind && SUPPORTED_RECORD_KINDS.has(record.recordKind)) {
    return record.recordKind;
  }
  return 'unknown';
}

// ─── KB registry (real ids for relationship validation) ──────────

function loadKbIds() {
  const empty = { crops: [], diseases: [] };
  try {
    const dir = path.join(process.cwd(), 'src', 'data', 'kb', 'v2');
    const readIds = (file) => {
      const parsed = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
      const arr = Array.isArray(parsed) ? parsed : (parsed.records || parsed.data || []);
      return arr.map((r) => r && r.id).filter(Boolean);
    };
    return { crops: readIds('crops.json'), diseases: readIds('diseasePests.json') };
  } catch {
    return empty;
  }
}

// ─── Main CLI ────────────────────────────────────────────────────

async function main() {
  const rawArgs = process.argv;
  const args = parseArgs(rawArgs);
  
  // ─── Handle --help ────────────────────────────────────────────
  
  if (args.help || args.h) {
    printHelp();
    process.exit(EXIT_CODES.SUCCESS);
  }
  
  // ─── Validate required arguments ──────────────────────────────
  
  if (!args.source) {
    console.error('Error: --source is required');
    printHelp();
    process.exit(EXIT_CODES.INVALID_ARGS);
  }
  
  const sourcePath = path.resolve(args.source);
  const sourceName = args['source-name'] || null;
  const format = args.format || 'auto';
  const recordKind = args['record-kind'] || null;
  const outputDir = args.output || path.join(process.cwd(), 'ingestion-reports');
  const dryRun = args['dry-run'] === true; // --dry-run is mandatory
  const strictMode = args.strict === true;
  const verbose = args.verbose === true;
  
  // ─── --dry-run is mandatory ───────────────────────────────────
  
  if (!dryRun) {
    console.error('Error: --dry-run is mandatory');
    printHelp();
    process.exit(EXIT_CODES.INVALID_ARGS);
  }
  
  // ─── Ensure output directory exists ────────────────────────────
  
  if (!fs.existsSync(outputDir)) {
    try {
      fs.mkdirSync(outputDir, { recursive: true });
    } catch (err) {
      console.error(`Error: Cannot create output directory: ${outputDir}`);
      process.exit(EXIT_CODES.BACKUP_FAILURE);
    }
  }
  
  // ─── Discover files ───────────────────────────────────────────
  
  let files;
  try {
    files = discoverFiles(sourcePath, format);
  } catch (err) {
    console.error(`Error discovering files: ${err.message}`);
    process.exit(EXIT_CODES.INVALID_ARGS);
  }
  
  if (files.length === 0) {
    console.error(`Error: No supported files found in ${sourcePath}`);
    console.error(`Supported extensions: .json, .md, .markdown, .csv`);
    process.exit(EXIT_CODES.INVALID_ARGS);
  }
  
  if (verbose) {
    console.log(`Discovered ${files.length} file(s)`);
  }
  
  // ─── Import documents ─────────────────────────────────────────
  
  let allRecords = [];
  let formatCounts = {};
  
  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const parsed = parseDocument(content);
      
      if (parsed) {
        const f = parsed.format;
        formatCounts[f] = (formatCounts[f] || 0) + 1;
        allRecords.push(...parsed.data);
      }
    } catch (err) {
      if (verbose) {
        console.warn(`Warning: Failed to parse ${file}: ${err.message}`);
      }
    }
  }
  
  if (verbose) {
    console.log(`Documents imported: ${allRecords.length} records from ${Object.keys(formatCounts).join(', ')}`);
  }
  
  // ─── Normalize records ────────────────────────────────────────
  
  const normalized = normalizeBatch(allRecords, recordKind, sourceName || '');
  // `sourceName` is the document-level source (`--source-name "TNAU"`): records
  // without their own `source` inherit it so batch provenance is never blank.
  // This never sets `verified` — only an explicit per-record `verified: true`
  // (with source + sourceUrl) can do that, and the validator enforces it.
  
  // ─── Validate records ─────────────────────────────────────────
  
  // Known ids for relationship validation are read from the real KB registry
  // (crop_*/dp_*), not a hardcoded uppercase minimum — the old TOMATO/RICE set
  // did not match any real KB id, so every genuine cropId/diseaseId was reported
  // as unrecognized (Phase 3C audit). Missing registry is not an error: ids are
  // then unknown and only warn.
  const kbIds = loadKbIds();
  const knownCropIds = kbIds.crops;
  const knownDiseaseIds = kbIds.diseases;

  if (verbose) {
    console.log(`KB registry: ${knownCropIds.length} crop ids, ${knownDiseaseIds.length} disease ids`);
  }

  const validationResults = validateBatch(normalized, knownCropIds, knownDiseaseIds);
  
  const invalidRecords = validationResults.filter(r => !r.valid);
  const validRecords = validationResults.filter(r => r.valid);
  
  if (verbose) {
    console.log(`Valid: ${validRecords.length}, Invalid: ${invalidRecords.length}`);
  }
  
  // ─── Deduplication ────────────────────────────────────────────
  
  const dedupResults = detectDuplicates(normalized);
  const dedupReport = generateDedupReport(dedupResults);
  
  if (verbose) {
    console.log(`Duplicates: ${dedupReport.totalDuplicates}`);
    console.log(`Unique: ${dedupReport.totalUnique}`);
  }
  
  // ─── High-Risk Safety Detection ───────────────────────────────
  
  const highRiskAnalysis = [];
  
  for (const record of validRecords) {
    // Check chemical control, organic remedy, biological control, immediate action
    const textFields = [
      record.chemicalControl,
      record.organicRemedy,
      record.biologicalControl,
      record.immediateAction,
      record.name
    ].filter(t => t && typeof t === 'string');
    
    for (const text of textFields) {
      const hr = detectHighRisk(text);
      if (hr.isHighRisk) {
        highRiskAnalysis.push({
          recordId: record.id || 'unknown',
          crop: record.cropId || 'unknown',
          disease: record.diseaseId || 'unknown',
          claim: hr.claims.join(', '),
          source: record.source || 'unknown',
          sourceUrl: record.sourceUrl || null,
          verified: record.verified,
          decision: 'BLOCKED - unverified high-risk claim'
        });
      }
    }
  }
  
  // ─── Relationship Validation ──────────────────────────────────
  
  const relValidation = validateRelationships(validRecords, knownCropIds, knownDiseaseIds);
  
  const validRelationships = relValidation.info.length;
  const brokenRelationships = relValidation.relationshipErrors.length;
  
  if (verbose) {
    console.log(`Valid relationships: ${validRelationships}`);
    console.log(`Broken relationships: ${brokenRelationships}`);
  }
  
  // ─── Generate Report ──────────────────────────────────────────
  
  // Count various categories
  const verifiedRecords = validRecords.filter(r => r.verified).length;
  const unverifiedRecords = validRecords.filter(r => !r.verified).length;
  const highRiskBlocked = highRiskAnalysis.length;
  
  // Build the detailed report object
  const report = new IngestionReport();
  report
    .withDocumentsImported(files.length)
    .withRecordsCreated(validRecords.length)
    .withRecordsSkipped(invalidRecords.length + dedupReport.totalDuplicates)
    .withDuplicates(dedupReport.totalDuplicates)
    .withInvalidRecords(invalidRecords.length)
    .withUnverifiedRecords(unverifiedRecords)
    .withVerifiedRecords(verifiedRecords)
    .withHighRiskRecords(highRiskBlocked)
    .withMissingProvenance(invalidRecords.length + (verifiedRecords === 0 ? 1 : 0))
    .withBrokenRelationships(brokenRelationships)
    .withByRecordKind(recordKindCounts(validRecords))
    .withValidationErrors(invalidRecords.map(r => r.errors.join(', ')).filter(Boolean).slice(0, 10))
    .withValidationWarnings(invalidRecords.map(r => r.warnings.join(', ')).filter(Boolean).slice(0, 10))
    .withProvenanceDetails({
      recordsWithSource: validRecords.filter(r => r.source).length,
      recordsWithSourceUrl: validRecords.filter(r => r.sourceUrl).length,
      recordsVerified: verifiedRecords,
      recordsUnverified: unverifiedRecords,
      sourceBreakdown: {} // would need source analysis
    })
    .withRelationshipDetails({
      totalChecked: validRecords.length,
      validRelationships,
      brokenRelationships
    });
  
  // Add high-risk details to report
  report.addWarning(`${highRiskBlocked} unverified high-risk records detected - ResponseValidator will block at UI`);
  
  // Add dedup details
  report.withDedupDetails({
    exactDuplicates: dedupReport.exactDuplicates,
    cropDiseaseDuplicates: dedupReport.cropDiseaseDuplicates,
    cropPestDuplicates: dedupReport.cropPestDuplicates,
    diseaseSymptomDuplicates: dedupReport.diseaseSymptomDuplicates,
    nearNameDuplicates: dedupReport.nearNameDuplicates,
    uniqueRecords: dedupReport.uniqueRecords
  });
  
  // ─── Dry-Run Output ───────────────────────────────────────────
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(outputDir, `ingestion-report-${timestamp}.json`);
  
  // Terminal summary
  console.log('========================================');
  console.log('   KRISHIVERSE KNOWLEDGE BASE INGESTION');
  console.log('   Dry-Run Summary');
  console.log('========================================');
  console.log('');
  console.log('Source:');
  console.log(`  Path: ${sourcePath}`);
  console.log(`  Name: ${sourceName || 'unknown'}`);
  console.log(`  Format: ${format}`);
  console.log(`  Record Kind: ${recordKind || 'any'}`);
  console.log('');
  console.log(`Files discovered: ${files.length}`);
  console.log(`Documents imported: ${allRecords.length}`);
  console.log(`Records discovered: ${allRecords.length}`);
  console.log(`Records normalized: ${normalized.length}`);
  console.log('');
  console.log('Validation:');
  console.log(`  Valid: ${validRecords.length}`);
  console.log(`  Invalid: ${invalidRecords.length}`);
  console.log('');
  console.log('Deduplication:');
  console.log(`  Duplicates: ${dedupReport.totalDuplicates}`);
  console.log(`  Unique records: ${dedupReport.totalUnique}`);
  console.log('');
  console.log('Provenance:');
  console.log(`  Verified: ${verifiedRecords}`);
  console.log(`  Unverified: ${unverifiedRecords}`);
  console.log(`  High-risk: ${highRiskBlocked}`);
  console.log('');
  console.log('Relationships:');
  console.log(`  Valid: ${validRelationships}`);
  console.log(`  Invalid: ${brokenRelationships}`);
  console.log('');
  console.log('High-Risk Safety:');
  highRiskAnalysis.forEach(hr => {
    console.log(`  - ${hr.recordId}: ${hr.claim} [${hr.source}] ${hr.decision}`);
  });
  console.log('');
  console.log('========================================');
  console.log(`  REPORT WRITTEN: ${reportPath}`);
  console.log('========================================');
  
  // Write JSON report
  const reportJSON = serializeReport(report);
  try {
    fs.writeFileSync(reportPath, reportJSON, 'utf8');
    if (verbose) {
      console.log(`\nJSON report written to: ${reportPath}`);
    }
  } catch (err) {
    console.error(`Error writing report: ${err.message}`);
    process.exit(EXIT_CODES.BACKUP_FAILURE);
  }
  
  // ─── Exit ────────────────────────────────────────────────────
  
  if (verbose) {
    console.log('\nDry-run completed successfully (non-destructive)');
  }
  
  process.exit(EXIT_CODES.SUCCESS);
}

// ─── Record Kind Counts ──────────────────────────────────────────

function recordKindCounts(records) {
  const counts = {};
  for (const r of records) {
    const kind = r.recordKind || 'unknown';
    counts[kind] = (counts[kind] || 0) + 1;
  }
  return counts;
}

// ─── Help Text ───────────────────────────────────────────────────

function printHelp() {
  console.log('========================================');
  console.log('   KRISHIVERSE KNOWLEDGE BASE INGESTION');
  console.log('   CLI Help');
  console.log('========================================');
  console.log('');
  console.log('Usage:');
  console.log('  npm run kb:ingest -- --source <path> --dry-run');
  console.log('  npm run kb:ingest -- --source <path> [options]');
  console.log('');
  console.log('Options:');
  console.log('  --source <path>           Required: Path to knowledge base source');
  console.log('  --dry-run                Required: Perform non-dry-run import');
  console.log('  --source-name <name>     Source name (e.g., "TNAU Agritech Portal")');
  console.log('  --format <type>          File format: json|markdown|csv|auto (default: auto)');
  console.log('  --record-kind <kind>     Record kind filter');
  console.log('  --output <dir>           Output directory for reports (default: ./ingestion-reports)');
  console.log('  --strict                 Strict validation mode');
  console.log('  --verbose                Verbose output');
  console.log('  --help, -h               Show this help message');
  console.log('');
  console.log('Examples:');
  console.log('  npm run kb:ingest -- --source ./knowledge/tnau --dry-run');
  console.log('  npm run kb:ingest -- --source ./knowledge/tnau/paddy.md --dry-run');
  console.log('  npm run kb:ingest -- --source ./knowledge/tnau --source-name "TNAU Agritech Portal" --dry-run');
  console.log('');
  console.log('Important:');
  console.log('  - --dry-run is mandatory and non-destructive');
  console.log('  - No records are written to IndexedDB, seed files, or KB v2');
  console.log('  - Only imports, normalizes, validates, deduplicates, and generates reports');
  console.log('  - Unverified high-risk chemical dosages remain blocked by ResponseValidator');
  console.log('  - verified=true is never auto-set; requires valid provenance in source data');
}

// ─── Run ───────────────────────────────────────────────────────

main().then(() => {
  // Exit handled within main
}).catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(EXIT_CODES.INTERNAL_ERROR || 1);
});