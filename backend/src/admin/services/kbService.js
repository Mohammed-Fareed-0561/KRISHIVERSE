import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { FRONTEND_DIR, KB_MANIFEST_PATH, fileExists } from '../paths.js'

const KB_DIR = join(FRONTEND_DIR, 'src', 'data', 'kb', 'v2')
const RECORD_FILES = ['crops.json', 'diseasePests.json', 'symptoms.json', 'treatments.json']
const CACHE_TTL_MS = 5 * 60 * 1000

let manifestCache = { at: 0, value: null }
let scanCache = { at: 0, value: null }

function readJson(path) {
  try {
    if (!fileExists(path)) return null
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}

export function kbState() {
  if (Date.now() - manifestCache.at < CACHE_TTL_MS && manifestCache.value) return manifestCache.value
  const manifest = readJson(KB_MANIFEST_PATH)
  if (!manifest) {
    return { available: false, reason: 'KB manifest not found at src/data/kb/v2/manifest.json' }
  }
  const report = manifest.report || {}
  const total = report.total || manifest.recordCount || 0
  const value = {
    available: true,
    version: manifest.version ?? null,
    generatedAt: manifest.generatedAt ?? null,
    inputChecksum: manifest.inputChecksum ?? null,
    counts: {
      total,
      curated: report.curated ?? null,
      synthetic: report.synthetic ?? null,
      community: report.community ?? null,
      unknown: report.unknown ?? null,
      quarantined: report.quarantined ?? null,
      verified: report.verifiedRecords ?? null,
      withSource: report.recordsWithSource ?? null,
      withSourceUrl: report.recordsWithSourceUrl ?? null,
      withCropId: report.withCropId ?? null,
      withDiseaseId: report.withDiseaseId ?? null,
      withDosage: report.recordsWithDosage ?? null,
      orphanTreatments: report.orphanTreatments ?? null,
      unresolvedEdges: report.unresolvedEdges ?? null,
      conflictCount: report.conflictCount ?? null,
    },
    shares: {
      curatedPct: pct(report.curated, total),
      quarantinedPct: pct(report.quarantined, total),
      provenancePct: pct(report.recordsWithSourceUrl, total),
      verifiedPct: pct(report.verifiedRecords, total),
      cropLinkedPct: pct(report.withCropId, total),
    },
    conflicts: Array.isArray(report.conflicts) ? report.conflicts.slice(0, 25) : [],
    note: 'Build-time snapshot from the KB manifest; refreshes when the KB is rebuilt.',
  }
  manifestCache = { at: Date.now(), value }
  return value
}

function pct(part, whole) {
  if (!whole) return null
  return Math.round((part / whole) * 1000) / 10
}

function bucketFreshness(updatedAt) {
  if (!updatedAt) return 'never'
  const at = new Date(updatedAt).getTime()
  if (Number.isNaN(at)) return 'never'
  const age = Date.now() - at
  if (age <= 30 * 24 * 3600 * 1000) return 'last30d'
  if (age <= 90 * 24 * 3600 * 1000) return 'last90d'
  if (age <= 365 * 24 * 3600 * 1000) return 'last365d'
  return 'older'
}

/**
 * Section 9 — source monitoring. Scans the on-disk KB records once per cache
 * window and aggregates provenance, freshness, and duplicate signals.
 */
export function kbSourceScan({ force = false } = {}) {
  if (!force && Date.now() - scanCache.at < CACHE_TTL_MS && scanCache.value) return scanCache.value

  const files = {}
  for (const name of RECORD_FILES) {
    files[name] = readJson(join(KB_DIR, name))
    if (!Array.isArray(files[name])) files[name] = []
  }

  const total = { records: 0, byFile: {}, bySource: {}, byOrganization: {}, byRecordKind: {}, byStatus: {} }
  const freshness = { never: 0, last30d: 0, last90d: 0, last365d: 0, older: 0 }
  const provenance = { withSource: 0, withSourceUrl: 0, verified: 0, quarantineReasons: {} }
  const identityCounts = {}
  let dosageRecords = 0
  let dosageWithProvenance = 0

  for (const [name, records] of Object.entries(files)) {
    total.byFile[name] = records.length
    total.records += records.length
    for (const record of records) {
      const source = (record.source || '').trim()
      const org = (record.sourceOrganization || '').trim()

      if (source) {
        provenance.withSource += 1
        total.bySource[source] = (total.bySource[source] || 0) + 1
      }
      if (org) total.byOrganization[org] = (total.byOrganization[org] || 0) + 1
      if (record.sourceUrl) provenance.withSourceUrl += 1
      if (record.verified) provenance.verified += 1
      if (record.recordKind) total.byRecordKind[record.recordKind] = (total.byRecordKind[record.recordKind] || 0) + 1
      if (record.status) total.byStatus[record.status] = (total.byStatus[record.status] || 0) + 1

      freshness[bucketFreshness(record.lastUpdated)] += 1

      if (record.quarantineReason) {
        provenance.quarantineReasons[record.quarantineReason] =
          (provenance.quarantineReasons[record.quarantineReason] || 0) + 1
      }

      if (record.dosageType || record.recordKind === 'treatment') {
        dosageRecords += 1
        if (record.sourceUrl && record.verified) dosageWithProvenance += 1
      }

      const identity = `${record.name || record.text || record.method || record.id || ''}|${record.cropId || record.diseaseId || ''}`
      identityCounts[identity] = (identityCounts[identity] || 0) + 1
    }
  }

  const duplicateGroups = Object.entries(identityCounts).filter(([, count]) => count > 1)
  const duplicateRecords = duplicateGroups.reduce((sum, [, count]) => sum + count - 1, 0)

  const value = {
    generatedAt: new Date().toISOString(),
    total: total.records,
    byFile: total.byFile,
    bySource: topEntries(total.bySource, 25),
    byOrganization: topEntries(total.byOrganization, 25),
    byRecordKind: total.byRecordKind,
    byStatus: total.byStatus,
    provenance: {
      ...provenance,
      quarantineReasons: topEntries(provenance.quarantineReasons, 15),
      citationAvailabilityPct: pct(provenance.withSourceUrl, total.records),
      verifiedPct: pct(provenance.verified, total.records),
    },
    freshness,
    duplicates: {
      duplicateRecords,
      duplicateGroups: duplicateGroups.length,
      sample: duplicateGroups.slice(0, 10).map(([identity, count]) => ({ identity: identity.slice(0, 80), count })),
      method: 'duplicate = identical name + linked crop/disease within a record file',
    },
    dosage: { total: dosageRecords, withProvenance: dosageWithProvenance },
    cacheTtlMs: CACHE_TTL_MS,
    note: 'Scanned from src/data/kb/v2/*.json on disk; cached for 5 minutes.',
  }

  scanCache = { at: Date.now(), value }
  return value
}

function topEntries(map, limit) {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }))
}

export function resetKbCache() {
  manifestCache = { at: 0, value: null }
  scanCache = { at: 0, value: null }
}
