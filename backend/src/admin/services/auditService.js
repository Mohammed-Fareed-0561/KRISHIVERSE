import { AuditLog } from '../store/collections.js'

const MAX_DETAILS_KEYS = 10

export function maskIp(ip) {
  if (typeof ip !== 'string' || ip === '') return null
  if (ip.includes('.')) {
    const parts = ip.split('.')
    if (parts.length === 4) return `${parts[0]}.${parts[1]}.x.x`
  }
  if (ip.includes(':')) return `${ip.split(':').slice(0, 2).join(':')}::x`
  return null
}

function sanitizeDetails(details) {
  if (!details || typeof details !== 'object') return undefined
  const out = {}
  for (const [key, value] of Object.entries(details)) {
    if (Object.keys(out).length >= MAX_DETAILS_KEYS) break
    if (typeof value === 'string') out[key] = value.slice(0, 200)
    else if (typeof value === 'number' || typeof value === 'boolean' || value === null) out[key] = value
    else if (Array.isArray(value)) out[key] = value.slice(0, 10).map((item) => String(item).slice(0, 100))
  }
  return out
}

/**
 * Append an audit entry. Fire-and-forget: auditing must never break an admin action.
 * Use recordAuditAwait() in tests where determinism matters.
 */
export function recordAudit(entry) {
  try {
    const doc = {
      at: new Date(),
      actorId: entry.actorId || null,
      actorRole: entry.actorRole || null,
      actorLabel: entry.actorLabel || null,
      action: entry.action,
      target: entry.target || null,
      result: entry.result || 'allowed',
      requestId: entry.requestId || null,
      ipPrefix: maskIp(entry.ip),
      details: sanitizeDetails(entry.details),
    }
    AuditLog.create(doc).catch(() => {})
    return doc
  } catch {
    return null
  }
}

export async function recordAuditAwait(entry) {
  const doc = {
    at: new Date(),
    actorId: entry.actorId || null,
    actorRole: entry.actorRole || null,
    actorLabel: entry.actorLabel || null,
    action: entry.action,
    target: entry.target || null,
    result: entry.result || 'allowed',
    requestId: entry.requestId || null,
    ipPrefix: maskIp(entry.ip),
    details: sanitizeDetails(entry.details),
  }
  await AuditLog.create(doc)
  return doc
}

const QUERY_CAP = 500

export async function queryAudit({ from, to, action, result, actorId, limit } = {}) {
  const filter = {}
  if (action) filter.action = action
  if (result) filter.result = result
  if (actorId) filter.actorId = actorId
  if (from || to) {
    filter.at = {}
    if (from) filter.at.$gte = new Date(from)
    if (to) filter.at.$lte = new Date(to)
  }
  const docs = await AuditLog.find(filter)
    .sort({ at: -1 })
    .limit(Math.min(Number.parseInt(limit, 10) || QUERY_CAP, QUERY_CAP))
    .lean()
  return docs.map((doc) => ({
    id: doc._id?.toString(),
    at: doc.at,
    actorId: doc.actorId,
    actorRole: doc.actorRole,
    actorLabel: doc.actorLabel,
    action: doc.action,
    target: doc.target,
    result: doc.result,
    ipPrefix: doc.ipPrefix,
    details: doc.details,
  }))
}

export async function auditSummary({ from, to } = {}) {
  const filter = {}
  if (from || to) {
    filter.at = {}
    if (from) filter.at.$gte = new Date(from)
    if (to) filter.at.$lte = new Date(to)
  }
  const docs = await AuditLog.find(filter).sort({ at: -1 }).limit(5000).lean()
  const byAction = {}
  const byActor = {}
  const byResult = {}
  for (const doc of docs) {
    byAction[doc.action] = (byAction[doc.action] || 0) + 1
    const actor = doc.actorLabel || doc.actorId || 'unknown'
    byActor[actor] = (byActor[actor] || 0) + 1
    byResult[doc.result] = (byResult[doc.result] || 0) + 1
  }
  return {
    total: docs.length,
    byAction,
    byActor,
    byResult,
    latestAt: docs[0]?.at || null,
    retention: 'audit entries are append-only; no update or delete endpoint exists',
  }
}

/**
 * Records every state-changing admin request (POST/PUT/PATCH/DELETE) that passes
 * through the admin router. Read-only GETs are not audited to keep the log useful.
 */
export function auditMutations(req, res, next) {
  res.on('finish', () => {
    try {
      if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return
      recordAudit({
        actorId: req.admin?.id,
        actorRole: req.admin?.role,
        actorLabel: req.admin?.email,
        action: `admin.${req.method} ${req.baseUrl}${req.path}`,
        target: req.baseUrl + req.path,
        result: res.statusCode < 400 ? 'allowed' : res.statusCode === 403 ? 'denied' : 'failed',
        requestId: req.get('x-request-id') || undefined,
        ip: req.ip,
        details: { status: res.statusCode },
      })
    } catch {
      /* auditing must never break the request */
    }
  })
  next()
}
