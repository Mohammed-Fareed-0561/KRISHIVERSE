import { AdminError, Incident, AuditLog } from '../store/collections.js'

const LOG_CAP = 500
let ring = []

/** In-process structured log ring (section 33). Never contains payloads or secrets. */
export function captureLog(entry) {
  try {
    ring.push({
      at: entry.at || new Date().toISOString(),
      level: entry.level || 'info',
      scope: entry.scope || 'admin',
      message: String(entry.message || '').slice(0, 300),
      requestId: entry.requestId || null,
      route: entry.route || null,
      status: entry.status ?? null,
      ms: entry.ms ?? null,
    })
    if (ring.length > LOG_CAP) ring = ring.slice(ring.length - LOG_CAP)
  } catch {
    /* logging must never break the caller */
  }
}

export function recentLogs({ limit = 200, scope, level } = {}) {
  const filtered = ring
    .filter((entry) => (!scope || entry.scope === scope) && (!level || entry.level === level))
    .slice()
    .reverse()
  return filtered.slice(0, Math.min(Number.parseInt(limit, 10) || 200, LOG_CAP))
}

export function resetLogs() {
  ring = []
}

const QUERY_CAP = 500

export async function listErrors({ from, to, severity, code, scope, limit } = {}) {
  const filter = {}
  if (severity) filter.severity = severity
  if (code) filter.code = code
  if (scope) filter.scope = scope
  if (from || to) {
    filter.at = {}
    if (from) filter.at.$gte = new Date(from)
    if (to) filter.at.$lte = new Date(to)
  }
  try {
    const docs = await AdminError.find(filter)
      .sort({ at: -1 })
      .limit(Math.min(Number.parseInt(limit, 10) || QUERY_CAP, QUERY_CAP))
      .lean()
    return docs.map((doc) => ({
      id: doc._id?.toString(),
      at: doc.at,
      severity: doc.severity,
      code: doc.code,
      scope: doc.scope,
      route: doc.route,
      method: doc.method,
      message: doc.message,
      requestId: doc.requestId,
      context: doc.context,
    }))
  } catch (error) {
    throw Object.assign(new Error('error log unavailable'), { status: 503, code: 'errors_unavailable' })
  }
}

export async function errorSummary({ from, to } = {}) {
  const docs = await listErrors({ from, to, limit: QUERY_CAP })
  const byCode = {}
  const bySeverity = {}
  const byScope = {}
  for (const doc of docs) {
    byCode[doc.code] = (byCode[doc.code] || 0) + 1
    bySeverity[doc.severity] = (bySeverity[doc.severity] || 0) + 1
    byScope[doc.scope] = (byScope[doc.scope] || 0) + 1
  }
  return { total: docs.length, byCode, bySeverity, byScope, latestAt: docs[0]?.at || null }
}

export async function listIncidents({ status, limit } = {}) {
  const filter = {}
  if (status) filter.status = status
  const docs = await Incident.find(filter).sort({ openedAt: -1 }).limit(Number.parseInt(limit, 10) || 100).lean()
  return docs.map(publicView)
}

export async function createIncident({ title, severity, summary, impact, relatedErrorCode, actor }) {
  if (!title) {
    throw Object.assign(new Error('title is required'), { status: 400, code: 'title_required' })
  }
  if (!['sev1', 'sev2', 'sev3'].includes(severity)) {
    throw Object.assign(new Error('severity must be sev1 | sev2 | sev3'), { status: 400, code: 'invalid_severity' })
  }
  const count = await Incident.countDocuments()
  const incidentId = `INC-${String(count + 1).padStart(4, '0')}`
  const doc = await Incident.create({
    incidentId,
    title: String(title).slice(0, 200),
    severity,
    summary: String(summary || '').slice(0, 1000),
    impact: String(impact || '').slice(0, 500),
    relatedErrorCode: relatedErrorCode || undefined,
    commander: actor?.email || null,
    timeline: [{ at: new Date(), note: 'Incident opened', actor: actor?.email || 'system' }],
  })
  captureLog({ level: 'warn', scope: 'incidents', message: `incident opened ${incidentId}: ${title}` })
  return publicView(doc.toObject())
}

export async function updateIncident({ incidentId, status, note, actor }) {
  const doc = await Incident.findOne({ incidentId })
  if (!doc) {
    throw Object.assign(new Error(`Incident ${incidentId} not found`), { status: 404, code: 'incident_not_found' })
  }
  if (status) {
    if (!['open', 'mitigated', 'resolved'].includes(status)) {
      throw Object.assign(new Error('status must be open | mitigated | resolved'), { status: 400, code: 'invalid_status' })
    }
    doc.status = status
    if (status === 'resolved' && !doc.closedAt) doc.closedAt = new Date()
    if (status !== 'resolved') doc.closedAt = undefined
  }
  if (note) doc.timeline.push({ at: new Date(), note: String(note).slice(0, 500), actor: actor?.email || 'system' })
  await doc.save()
  captureLog({ level: 'info', scope: 'incidents', message: `incident ${incidentId} -> ${doc.status}` })
  return publicView(doc.toObject())
}

export async function incidentSummary() {
  const docs = await Incident.find().sort({ openedAt: -1 }).limit(500).lean()
  const byStatus = {}
  const bySeverity = {}
  for (const doc of docs) {
    byStatus[doc.status] = (byStatus[doc.status] || 0) + 1
    bySeverity[doc.severity] = (bySeverity[doc.severity] || 0) + 1
  }
  return {
    total: docs.length,
    byStatus,
    bySeverity,
    open: docs.filter((doc) => doc.status !== 'resolved').length,
    oldestOpenAt: docs.filter((doc) => doc.status !== 'resolved').slice(-1)[0]?.openedAt || null,
  }
}

/** Combined log stream for section 33: in-process logs + error log + audit trail. */
export async function logStream({ limit = 200 } = {}) {
  const cap = Math.min(Number.parseInt(limit, 10) || 200, 500)
  const [errors, audit] = await Promise.all([
    AdminError.find().sort({ at: -1 }).limit(cap).lean().catch(() => []),
    AuditLog.find().sort({ at: -1 }).limit(cap).lean().catch(() => []),
  ])

  const merged = [
    ...recentLogs({ limit: cap }).map((entry) => ({
      at: entry.at, source: 'process', level: entry.level, scope: entry.scope,
      message: entry.message, route: entry.route, status: entry.status, requestId: entry.requestId,
    })),
    ...errors.map((doc) => ({
      at: doc.at, source: 'error-log', level: doc.severity, scope: doc.scope,
      message: `${doc.code}: ${doc.message}`, route: doc.route, status: doc.context?.status ?? null, requestId: doc.requestId,
    })),
    ...audit.map((doc) => ({
      at: doc.at, source: 'audit', level: doc.result === 'allowed' ? 'info' : 'warn', scope: 'audit',
      message: `${doc.actorLabel || doc.actorId || 'system'} ${doc.action} -> ${doc.result}`, route: doc.target, status: null, requestId: doc.requestId,
    })),
  ]
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, cap)

  return {
    generatedAt: new Date().toISOString(),
    entries: merged,
    sources: ['process ring buffer (500 entries, resets on restart)', 'admin error collection', 'audit trail'],
    redaction: 'Request bodies, messages, and credentials are never written to the log stream.',
  }
}

function publicView(doc) {
  return {
    incidentId: doc.incidentId,
    title: doc.title,
    severity: doc.severity,
    status: doc.status,
    openedAt: doc.openedAt,
    closedAt: doc.closedAt,
    commander: doc.commander,
    summary: doc.summary,
    impact: doc.impact,
    relatedErrorCode: doc.relatedErrorCode,
    timeline: doc.timeline || [],
  }
}
