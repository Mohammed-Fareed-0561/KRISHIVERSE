import { validateEvent, validateBatch } from '../schema/eventSchema.js'
import { TelemetryEvent, TelemetryHealth } from '../store/collections.js'
import { summarizeLatency, tally } from '../metrics/math.js'

export class ServiceError extends Error {
  constructor(message, status = 500, code = 'service_error') {
    super(message)
    this.status = status
    this.code = code
  }
}

function isDuplicate(error) {
  return error?.code === 11000 || /duplicate key/i.test(error?.message || '')
}

/** Single atomic health-document update. Never throws. */
async function bumpHealth({ accepted = 0, duplicates = 0, rejected = 0, reason = null }) {
  if (accepted + duplicates + rejected === 0 && !reason) return
  const inc = {}
  if (accepted) inc.totalAccepted = accepted
  if (duplicates) inc.totalDuplicates = duplicates
  if (rejected) inc.totalRejected = rejected
  if (reason) inc[`rejectedByReason.${reason}`] = Math.max(1, rejected)

  const set = { updatedAt: new Date() }
  if (accepted) set.lastEventAt = new Date()
  if (rejected) set.lastRejectedAt = new Date()

  try {
    await TelemetryHealth.findOneAndUpdate(
      { key: 'telemetry' },
      { $set: set, ...(Object.keys(inc).length ? { $inc: inc } : {}) },
      { upsert: true },
    )
  } catch {
    /* health accounting must never break ingestion */
  }
}

/** Validate + persist a single event. Returns { status, eventId?, errors? }. */
export async function ingest(raw) {
  const result = validateEvent(raw)
  if (!result.ok) {
    await bumpHealth({ rejected: 1, reason: result.errors[0] })
    return { status: 'rejected', errors: result.errors }
  }
  try {
    await TelemetryEvent.create({ ...result.value, receivedAt: new Date() })
    await bumpHealth({ accepted: 1 })
    return { status: 'accepted', eventId: result.value.eventId }
  } catch (error) {
    if (isDuplicate(error)) {
      await bumpHealth({ duplicates: 1 })
      return { status: 'duplicate', eventId: result.value.eventId }
    }
    await bumpHealth({ rejected: 1, reason: 'persist_failed' })
    throw new ServiceError('telemetry persistence unavailable', 503, 'telemetry_unavailable')
  }
}

/** Validate + persist a batch. Bad events are dropped individually, never silently. */
export async function ingestBatch(raw) {
  const { events, rejected } = validateBatch(raw)
  if (rejected.length) await bumpHealth({ rejected: rejected.length, reason: rejected[0].errors[0] })
  if (events.length === 0) {
    return { status: rejected.length ? 'rejected' : 'empty', accepted: 0, duplicates: 0, rejected }
  }

  try {
    const inserted = await TelemetryEvent.insertMany(
      events.map((event) => ({ ...event, receivedAt: new Date() })),
      { ordered: false },
    )
    await bumpHealth({ accepted: inserted.length })
    return { status: 'accepted', accepted: inserted.length, duplicates: 0, rejected }
  } catch (error) {
    if (isDuplicate(error)) {
      const inserted  = error.insertedDocs?.length ?? 0
      const duplicates = Number.isFinite(error.writeErrors?.length) ? error.writeErrors.length : events.length - inserted
      await bumpHealth({ accepted: inserted, duplicates })
      return { status: inserted ? 'partial' : 'duplicate', accepted: inserted, duplicates, rejected }
    }
    throw new ServiceError('telemetry persistence unavailable', 503, 'telemetry_unavailable')
  }
}

export async function getHealth() {
  try {
    const doc = await TelemetryHealth.findOne({ key: 'telemetry' }).lean()
    const health = doc || { totalAccepted: 0, totalRejected: 0, totalDuplicates: 0, rejectedByReason: {} }
    const lastEventAt = health.lastEventAt || null
    const totalIn = (health.totalAccepted || 0) + (health.totalRejected || 0)
    const rejectionRatePct = totalIn > 0 ? Math.round((health.totalRejected / totalIn) * 10000) / 100 : null

    let status = 'idle'
    if (health.totalAccepted > 0) status = rejectionRatePct !== null && rejectionRatePct > 50 ? 'degraded' : 'healthy'
    if (health.totalRejected > 0 && health.totalAccepted === 0) status = 'degraded'

    return {
      status,
      totalAccepted: health.totalAccepted || 0,
      totalRejected: health.totalRejected || 0,
      totalDuplicates: health.totalDuplicates || 0,
      rejectionRatePct,
      rejectedByReason: health.rejectedByReason || {},
      lastEventAt,
      lastRejectedAt: health.lastRejectedAt || null,
      hasEverReceivedEvents: Boolean(lastEventAt),
      stale: lastEventAt ? Date.now() - new Date(lastEventAt).getTime() > 24 * 3600 * 1000 : true,
      note: health.totalAccepted === 0
        ? 'No production telemetry has been ingested yet. Panels show an empty state until pilot traffic arrives.'
        : undefined,
    }
  } catch {
    throw new ServiceError('telemetry health unavailable', 503, 'telemetry_unavailable')
  }
}

const QUERY_CAP = 200

/** Read-only, capped, content-free event query for triage. */
export async function queryEvents({ eventType, feature, outcome, from, to, limit } = {}) {
  const filter = {}
  if (eventType) filter.eventType = eventType
  if (feature) filter.feature = feature
  if (outcome) filter.outcome = outcome
  if (from || to) {
    filter.occurredAt = {}
    if (from) filter.occurredAt.$gte = new Date(from)
    if (to) filter.occurredAt.$lte = new Date(to)
  }
  try {
    const docs = await TelemetryEvent.find(filter)
      .sort({ occurredAt: -1 })
      .limit(Math.min(Number.parseInt(limit, 10) || QUERY_CAP, QUERY_CAP))
      .lean()
    return docs.map((doc) => ({
      eventId: doc.eventId,
      eventType: doc.eventType,
      occurredAt: doc.occurredAt,
      feature: doc.feature,
      outcome: doc.outcome,
      language: doc.language,
      latencyMs: doc.latencyMs,
      errorCode: doc.errorCode,
      intent: doc.intent,
      sessionId: doc.sessionId,
      safety: doc.safety,
      model: doc.model,
      retrieval: doc.retrieval,
      source: doc.source,
      metadata: doc.metadata,
    }))
  } catch {
    throw new ServiceError('event query unavailable', 503, 'telemetry_unavailable')
  }
}

const SCAN_CAP = 5000

/** Load a time window of events for in-process aggregation. */
export async function loadWindow({ from, to, eventType, limit = SCAN_CAP } = {}) {
  const filter = { occurredAt: {} }
  if (eventType) filter.eventType = eventType
  filter.occurredAt.$gte = new Date(from || Date.now() - 24 * 3600 * 1000)
  filter.occurredAt.$lte = new Date(to || Date.now())
  try {
    return await TelemetryEvent.find(filter).sort({ occurredAt: -1 }).limit(limit).lean()
  } catch {
    throw new ServiceError('telemetry window unavailable', 503, 'telemetry_unavailable')
  }
}

/** Fold raw event documents into the shapes the dashboard panels consume. */
export function aggregateEvents(docs) {
  const latencies = docs.map((doc) => doc.latencyMs).filter((v) => Number.isFinite(v))
  const modelGroups = {}
  const retrievalLatencies = []
  const kbVersions = {}

  for (const doc of docs) {
    if (doc.model?.name) {
      const name = doc.model.name
      if (!modelGroups[name]) modelGroups[name] = { name, count: 0, latencies: [], providers: new Set() }
      modelGroups[name].count += 1
      if (Number.isFinite(doc.model.latencyMs)) modelGroups[name].latencies.push(doc.model.latencyMs)
      if (doc.model.provider) modelGroups[name].providers.add(doc.model.provider)
    }
    if (Number.isFinite(doc.retrieval?.latencyMs)) retrievalLatencies.push(doc.retrieval.latencyMs)
    if (doc.retrieval?.kbVersion) kbVersions[doc.retrieval.kbVersion] = (kbVersions[doc.retrieval.kbVersion] || 0) + 1
  }

  const safetyEvents = docs.filter((doc) => doc.eventType?.startsWith('safety.'))
  const validatorOutcomes = {}
  const dosage = { verified: 0, unverified: 0, notApplicable: 0 }
  const rulesFired = []
  for (const doc of safetyEvents) {
    const outcome = doc.safety?.validatorOutcome || 'unknown'
    validatorOutcomes[outcome] = (validatorOutcomes[outcome] || 0) + 1
    if (doc.safety?.dosageVerified === true) dosage.verified += 1
    else if (doc.safety?.dosageVerified === false) dosage.unverified += 1
    else dosage.notApplicable += 1
    if (Array.isArray(doc.safety?.rulesFired)) rulesFired.push(...doc.safety.rulesFired)
  }

  return {
    total: docs.length,
    window: {
      from: docs.length ? docs[docs.length - 1].occurredAt : null,
      to: docs.length ? docs[0].occurredAt : null,
      scanned: docs.length,
      capped: docs.length >= SCAN_CAP,
    },
    byEventType: tally(docs.map((doc) => doc.eventType)),
    byOutcome: tally(docs.map((doc) => doc.outcome)),
    byFeature: tally(docs.map((doc) => doc.feature)),
    byLanguage: tally(docs.map((doc) => doc.language)),
    byConnectivity: tally(docs.map((doc) => doc.connectivity || 'unknown')),
    errorCodes: tally(docs.map((doc) => doc.errorCode).filter(Boolean)),
    latency: summarizeLatency(latencies),
    models: Object.values(modelGroups)
      .map((group) => ({
        name: group.name,
        count: group.count,
        providers: [...group.providers],
        latency: summarizeLatency(group.latencies),
      }))
      .sort((a, b) => b.count - a.count),
    retrieval: {
      latency: summarizeLatency(retrievalLatencies),
      kbVersions: tally(Object.entries(kbVersions).flatMap(([key, count]) => Array(count).fill(key))),
      resultCounts: summarizeLatency(
        docs.map((doc) => doc.retrieval?.resultCount).filter((v) => Number.isFinite(v)),
      ),
      totalQueries: docs.filter((doc) => doc.eventType?.startsWith('retrieval.')).length,
    },
    safety: {
      events: safetyEvents.length,
      validatorOutcomes,
      dosage,
      rulesFired: tally(rulesFired),
    },
  }
}
