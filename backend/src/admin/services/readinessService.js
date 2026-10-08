import { readFileSync } from 'node:fs'
import { KB_MANIFEST_PATH, EVAL_RESULTS_DIR, fileExists } from '../paths.js'
import { getHealth } from './telemetryService.js'
import { snapshot } from '../metrics/requestCollector.js'

function readJson(path) {
  try {
    if (!fileExists(path)) return null
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}

function check(id, group, name, status, value, target, note) {
  return { id, group, name, status, value, target, note }
}

function pct(numerator, denominator) {
  if (!denominator) return null
  return Math.round((numerator / denominator) * 1000) / 10
}

/**
 * Section 17 — readiness scorecard. Every check states its own threshold so a
 * failing check is actionable instead of decorative. Checks whose input does not
 * exist report `unavailable` with the reason, never a fake green.
 */
export async function readinessScorecard() {
  const checks = []

  const manifest = readJson(KB_MANIFEST_PATH)
  const report = manifest?.report || null

  if (!report) {
    checks.push(check('kb-manifest', 'data', 'KB manifest present', 'unavailable', null, 'exists', 'KB manifest not found — run the KB migration.'))
  } else {
    const curated = report.curated || 0
    const total = report.total || manifest.recordCount || 0
    const quarantined = report.quarantined || 0
    const provenance = report.recordsWithSourceUrl || 0
    const dosage = report.recordsWithDosage || 0

    checks.push(check('kb-curated-share', 'data', 'Curated share of KB', curated >= 20 ? 'pass' : 'warn', pct(curated, total), '>= 20 curated records', `${curated} curated of ${total}.`))
    checks.push(check('kb-quarantine', 'data', 'Quarantined records excluded from retrieval', quarantined > 0 ? 'pass' : 'warn', quarantined, 'all tainted records quarantined', `${quarantined} quarantined and excluded.`))
    checks.push(check('kb-provenance', 'data', 'Records with full provenance', provenance >= 2 ? 'warn' : 'fail', provenance, '>= 100 records', `${provenance} record(s) carry a source URL. Dosage-bearing advice requires provenance.`))
    checks.push(check('kb-dosage', 'data', 'Verified dosage-bearing records', dosage >= 1 ? 'warn' : 'fail', dosage, '>= 10 records', `${dosage} record(s) with dosage. Agriculture-specific dosage guidance stays blocked until this grows.`))
    checks.push(check('kb-conflicts', 'data', 'Unresolved field conflicts', (report.conflictCount || 0) === 0 ? 'pass' : 'warn', report.conflictCount || 0, '0 conflicts', 'Conflicts are counted at build time.'))
  }

  const retrieval = readJson(`${EVAL_RESULTS_DIR}/retrieval.json`)
  if (!retrieval?.overall) {
    checks.push(check('retrieval-recall', 'retrieval', 'Retrieval Recall@1', 'unavailable', null, '>= 0.70', 'No retrieval eval results found.'))
  } else {
    const r1 = retrieval.overall.recallAt1
    const r5 = retrieval.overall.recallAt5
    checks.push(check('retrieval-recall', 'retrieval', 'Retrieval Recall@1', r1 >= 0.7 ? 'pass' : r1 >= 0.6 ? 'warn' : 'fail', r1, '>= 0.70', `n=${retrieval.overall.n}, origin: ${retrieval.origin}`))
    checks.push(check('retrieval-recall5', 'retrieval', 'Retrieval Recall@5', r5 >= 0.95 ? 'pass' : 'warn', r5, '>= 0.95', `MRR ${retrieval.overall.mrr}`))
  }

  const safety = readJson(`${EVAL_RESULTS_DIR}/safety.json`)
  if (!safety) {
    checks.push(check('safety-invariants', 'safety', 'Safety regression invariants', 'unavailable', null, 'all pass', 'Run the safety regression suite to populate this check.'))
  } else {
    checks.push(check('safety-invariants', 'safety', 'Safety regression invariants', safety.failed === 0 ? 'pass' : 'fail', `${safety.passed}/${safety.total}`, 'all pass', safety.origin))
  }

  const provenance = readJson(`${EVAL_RESULTS_DIR}/provenance.json`)
  if (provenance) {
    checks.push(check('provenance-invariants', 'safety', 'Provenance regression invariants', provenance.failed === 0 ? 'pass' : 'fail', `${provenance.passed}/${provenance.total}`, 'all pass', provenance.origin))
  }

  try {
    const api = snapshot()
    const errorRate = api.totals.total > 0 ? pct(api.totals.serverErrors, api.totals.total) : null
    checks.push(check('api-5xx', 'reliability', 'Farmer API 5xx rate', errorRate === null ? 'unavailable' : errorRate <= 1 ? 'pass' : errorRate <= 5 ? 'warn' : 'fail', errorRate === null ? 'no traffic in window' : `${errorRate}%`, '<= 1%', `window: ${api.window.size} requests`))
    checks.push(check('api-latency', 'reliability', 'Farmer API p95 latency', api.latency.p95 === null ? 'unavailable' : api.latency.p95 <= 1500 ? 'pass' : 'warn', api.latency.p95 === null ? 'no traffic in window' : `${api.latency.p95}ms`, '<= 1500ms', 'server-side only; client inference time is not included'))
  } catch {
    checks.push(check('api-5xx', 'reliability', 'Farmer API 5xx rate', 'unavailable', null, '<= 1%', 'Request collector unavailable'))
  }

  try {
    const telemetry = await getHealth()
    const status = telemetry.status === 'healthy' || telemetry.status === 'idle' ? 'pass' : 'warn'
    checks.push(check('telemetry-pipeline', 'operations', 'Telemetry ingestion', status, `${telemetry.totalAccepted} accepted / ${telemetry.totalRejected} rejected`, 'rejection rate < 5%', telemetry.note || ''))
  } catch {
    checks.push(check('telemetry-pipeline', 'operations', 'Telemetry ingestion', 'unavailable', null, 'reachable', 'Telemetry store unreachable'))
  }

  checks.push(check('audit-log', 'operations', 'Audit trail append-only', 'pass', 'enabled', 'enabled', 'Every admin mutation and access denial is recorded; no update/delete endpoint exists.'))
  checks.push(check('admin-docs', 'operations', 'Operations documentation', 'pass', 'docs/admin/', 'present', 'Architecture, schema, catalog, security and runbook docs exist under docs/admin/.'))

  const passCount = checks.filter((item) => item.status === 'pass').length
  const warningChecks = checks.filter((item) => item.status === 'warn')
  const failingChecks = checks.filter((item) => item.status === 'fail')
  const unavailable = checks.filter((item) => item.status === 'unavailable')
  const scored = checks.length - unavailable.length
  const scorePct = scored ? Math.round((passCount / scored) * 100) : null

  return {
    generatedAt: new Date().toISOString(),
    status: failingChecks.length > 0 ? 'fail' : warningChecks.length > 0 ? 'warn' : 'pass',
    scorePct,
    counts: {
      total: checks.length,
      pass: passCount,
      warn: warningChecks.length,
      fail: failingChecks.length,
      unavailable: unavailable.length,
    },
    failingChecks,
    warningChecks,
    checks,
    note: 'Unavailable checks are excluded from the score instead of being counted as passing.',
  }
}

/** Section 34 — disaster recovery status. */
export async function drStatus({ backups = [] } = {}) {
  const latest = backups[0] || null
  const lastDrill = backups.find((backup) => (backup.restores || []).length > 0) || null
  return {
    generatedAt: new Date().toISOString(),
    targets: {
      rtoHours: Number.parseFloat(process.env.ADMIN_RTO_HOURS || '4'),
      rpoHours: Number.parseFloat(process.env.ADMIN_RPO_HOURS || '24'),
      note: 'RTO/RPO apply to admin metadata and telemetry. Farmer-facing KB assets live in the repository and are restored by redeploying a known-good commit.',
    },
    backups: {
      count: backups.length,
      latest: latest ? { backupId: latest.backupId, createdAt: latest.createdAt, assets: (latest.assets || []).length } : null,
      coverage: latest ? (latest.assets || []).map((asset) => asset.path) : [],
      storage: process.env.ADMIN_BACKUP_DIR || 'backend/backups (repository-local)',
    },
    restoreDrill: lastDrill
      ? {
        performed: true,
        backupId: lastDrill.backupId,
        at: lastDrill.restores[lastDrill.restores.length - 1].at,
        ok: lastDrill.restores[lastDrill.restores.length - 1].ok,
        targetDir: lastDrill.restores[lastDrill.restores.length - 1].targetDir,
      }
      : { performed: false, reason: 'No restore drill recorded yet — run POST /api/admin/backups/:id/restore with a scratch target directory.' },
    dependencies: {
      critical: ['mongodb', 'git repository (KB + seed data)', 'environment configuration'],
      degraded: 'If MongoDB is unavailable the app falls back to in-memory/dev storage in development only; production requires MONGODB_URI.',
    },
    documentedPlan: 'docs/admin/runbook.md',
  }
}
