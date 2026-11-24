/**
 * ingestion/importer.js
 * 
 * Parses authoritative agricultural documents from JSON, Markdown, and CSV formats.
 * Deterministic: same input always produces same output.
 * Does not generate synthetic agricultural facts - only extracts structured data
 * from provided documents, leaving null for missing fields.
 */

import fs from 'fs';
import path from 'path';
// NOTE: lodash was imported here but never used — dropped in the ESM conversion
// (Phase 3C ingestion repair; no behavior change).

// ─── Format detectors ──────────────────────────────────────────────

/**
 * Detect whether the given content is JSON, Markdown, or CSV.
 * @param {string} content
 * @returns {'json'|'markdown'|'csv'|'unknown'}
 */
function detectFormat(content) {
  const trimmed = content.trim();

  // Try JSON first
  try {
    JSON.parse(trimmed);
    return 'json';
  } catch (e) {
    // Not JSON, continue
  }

  // Check for CSV (comma-separated, header row)
  if (trimmed.includes(',') && trimmed.split('\n').length > 1) {
    const firstLine = trimmed.split('\n')[0];
    if (firstLine.includes('id') || firstLine.includes('name') || firstLine.includes('source')) {
      return 'csv';
    }
  }

  // Check for Markdown (has # headers, markdown table patterns, or YAML front matter)
  if (trimmed.startsWith('#') || trimmed.startsWith('---') || /^\|/.test(trimmed)) {
    return 'markdown';
  }

  return 'unknown';
}

/**
 * Try to parse content as each format, return first success.
 * @param {string} content
 * @returns {object|null} { format, data } or null
 */
function attemptParse(content) {
  const format = detectFormat(content);
  if (format === 'json') {
    try {
      const data = JSON.parse(content);
      // Normalize to a record array: accept a bare object or {records:[...]}.
      // Without this, single-record JSON docs spread-crash downstream and are
      // silently skipped (caught TypeError → 0 records).
      const records = Array.isArray(data) ? data : data && Array.isArray(data.records) ? data.records : data && typeof data === 'object' ? [data] : [];
      return { format, data: records };
    } catch (e) {
      return null;
    }
  }
  if (format === 'csv') {
    try {
      return parseCSV(content);
    } catch (e) {
      return null;
    }
  }
  if (format === 'markdown') {
    try {
      return parseMarkdown(content);
    } catch (e) {
      return null;
    }
  }
  return null;
}

/**
 * Parse CSV content into array of record objects.
 * First row is treated as headers.
 * @param {string} content
 * @returns {{format: 'csv', data: Array<object>}}
 */
function parseCSV(content) {
  const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  if (lines.length < 2) {
    throw new Error('CSV must have at least header row + 1 data row');
  }

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const record = {};
    for (let j = 0; j < headers.length; j++) {
      record[headers[j]] = j < values.length ? values[j] : null;
    }
    records.push(record);
  }

  return { format: 'csv', data: records };
}

/**
 * Parse Markdown document into structured records.
 * Supports:
 * - YAML front matter (`--- ... ---`)
 * - JSON block (` { } `)
 * - Heading-structured records
 * - Table-structured records
 * @param {string} content
 * @returns {{format: 'markdown', data: Array<object>}}
 */
function parseMarkdown(content) {
  const lines = content.replaceAll(String.fromCharCode(13), '').split('\n');
  const records = [];
  let i = 0;

  // Check for YAML front matter
  if (lines[0] === '---') {
    let fmEnd = 1;
    while (fmEnd < lines.length && lines[fmEnd] !== '---') fmEnd++;
    if (fmEnd < lines.length) {
      // Parse front matter (was: lines.slice(2, ...) skipped the first field
      // and JSON.parse rejected YAML — both silently yielded zero records)
      const frontMatter = parseFrontMatter(lines.slice(1, fmEnd));
      i = fmEnd + 1;

      // Process remaining content for records
      while (i < lines.length) {
        const parsed = parseMdBlock(lines, i, frontMatter);
        if (parsed) {
          records.push(parsed.record);
          // Skip past this record
          i += parsed.skipLines;
        } else {
          i++;
        }
      }
      return { format: 'markdown', data: records };
    }
  }

  // Process without front matter - look for heading or table records
  while (i < lines.length) {
    const parsed = parseMdBlock(lines, i, {});
    if (parsed) {
      records.push(parsed.record);
      i += parsed.skipLines;
    } else {
      i++;
    }
  }

  return { format: 'markdown', data: records };
}

/**
 * Parse YAML-ish front matter lines into an object.
 * Accepts one `key: value` pair per line (same rule as markdown blocks);
 * falls back to JSON for single-line `{...}` content. Never throws.
 */
function parseFrontMatter(fmLines) {
  const joined = fmLines.join('\n').trim();
  if (joined.startsWith('{')) {
    try {
      const parsed = JSON.parse(joined);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch (e) { /* fall through to kv parsing */ }
  }
  const out = {};
  for (const raw of fmLines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const kvMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*[:=]\s*(.*)$/);
    if (kvMatch) {
      const value = kvMatch[2].trim().replace(/^"|"$/g, '');
      out[kvMatch[1]] = value === 'true' ? true : value === 'false' ? false : value;
    }
  }
  return out;
}

/**
 * Parse a single markdown block into a record.
 * @param {string[]} lines
 * @param {number} startLine
 * @param {object} frontMatter
 * @returns {{record: object, skipLines: number}|null}
 */
function parseMdBlock(lines, startLine, frontMatter) {
  let i = startLine;
  // Front matter wins over the placeholder defaults (a real document source
  // must never be overwritten with source:'markdown').
  const record = { source: 'markdown', sourceUrl: null, verified: false, verifiedBy: null, verifiedDate: null, lastUpdated: null, ...frontMatter };

  // Look for YAML front matter within block
  if (lines[i] === '---') {
    let fmEnd = i + 1;
    while (fmEnd < lines.length && lines[fmEnd] !== '---') fmEnd++;
    if (fmEnd < lines.length) {
      Object.assign(record, parseFrontMatter(lines.slice(i + 1, fmEnd)));
      i = fmEnd + 1;
    }
  }

  // Look for key-value pairs or table rows
  // Collect all non-empty, non-header lines until we hit a blank line or new heading
  const fields = {};
  const fieldOrder = [];

  while (i < lines.length) {
    const line = lines[i].trim();

    // Skip blank lines
    if (line === '') {
      i++;
      continue;
    }

    // Stop on new heading
    if (line.startsWith('#')) {
      break;
    }

    // Stop on table separator
    if (/^\|[\s\S]*\|$/.test(line) && lines[i + 1] && /^\|[\s\S]*\|$/.test(lines[i + 1]) && lines[i].includes('|')) {
      // This might be a table, handle separately
      break;
    }

    // Try to parse as "key: value" or "key = value"
    const kvMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*[:=]\s*(.*)$/);
    if (kvMatch) {
      const key = kvMatch[1];
      const value = kvMatch[2].trim().replace(/^"|"$/g, '');
      fields[key] = value;
      fieldOrder.push(key);
      i++;
      continue;
    }

    // Try table row: | key | value |
    const tableMatch = line.match(/^\|\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\|\s*(.*?)\s*\|$/);
    if (tableMatch) {
      fields[tableMatch[1]] = tableMatch[2].trim().replace(/^"|"$/g, '');
      fieldOrder.push(tableMatch[1]);
      i++;
      continue;
    }

    // If we hit content that doesn't match any pattern and isn't a simple value,
    // stop collecting fields
    if (!/^[\|\-\*\_\#\.\!\@\$\%\(\)\[\]\{\}]/.test(line) && line.length > 20) {
      // Likely a long description, stop
      break;
    }

    i++;
  }

  // Also check if there's content after the fields that looks like a description
  // Assign fields to record
  Object.assign(record, fields);
  record._rawText = lines.slice(startLine, i).join('\n');

  // A valid record must have at least an id or name
  if (!record.id && !record.name) {
    return null;
  }

  // Determine skipLines
  let skipLines = i - startLine;
  if (skipLines < 1) skipLines = 1;

  return { record, skipLines };
}

/**
 * Parse authoritative agricultural document (any format).
 * @param {string} content
 * @returns {{format: string, records: Array<object>}|null}
 */
function parseDocument(content) {
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return null;
  }
  return attemptParse(content);
}

/**
 * Import from a file path (supports JSON, Markdown, CSV).
 * @param {string} filePath
 * @returns {{format: string, records: Array<object>}|null}
 */
function importFromFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return parseDocument(content);
  } catch (e) {
    console.warn(`Failed to import ${filePath}: ${e.message}`);
    return null;
  }
}

/**
 * Batch import from multiple file paths.
 * @param {Array<string>} filePaths
 * @returns {{format: string, records: Array<object>, byFormat: Map}|null}
 */
function importBatch(filePaths) {
  const byFormat = new Map();
  const allRecords = [];

  for (const filePath of filePaths) {
    const result = importFromFile(filePath);
    if (result) {
      const { format, data } = result;
      if (!byFormat.has(format)) {
        byFormat.set(format, []);
      }
      byFormat.get(format).push(...data);
      allRecords.push(...data);
    }
  }

  return allRecords.length > 0
    ? { format: 'batch', records: allRecords, byFormat }
    : null;
}

// ─── Export ───────────────────────────────────────────────────────

export {
  detectFormat,
  attemptParse,
  parseDocument,
  importFromFile,
  importBatch,
  parseCSV,
  parseMarkdown,
};