import { loadWindow, aggregateEvents } from './telemetryService.js'
import { snapshot } from '../metrics/requestCollector.js'
import { kbState, kbSourceScan } from './kbService.js'
import { evaluationDashboard, EVALUATION_LABEL } from './evaluationService.js'
import { RegistryEntry } from '../store/collections.js'
import { percent, summarizeLatency, tally } from '../metrics/math.js'

const PRODUCTION_LABEL = 'PRODUCTION TELEMETRY'
const DEFAULT_WINDOW_HOURS = 24

export function resolveWindow(query = {}) {
  const hours = Number.parseInt(query.hours, 10)
  const to = query.to ? new Date(query.to) : new Date()
  const from = query.from
    ? new Date(query.from)
    : new Date(to.getTime() - (Number.isFinite(hours) && hours > 0 ? hours : DEFAULT_WINDOW_HOURS) * 3600 * 1000)
  return { from: from.toISOString(), to: to.toISOString() }
}

async function collect(window) {
  const docs = await loadWindow(window)
  return { docs, agg: aggregateEvents(docs), api: safeApiSnapshot() }
}

function safeApiSnapshot() {
  try {
    return snapshot()
  } catch {
    return null
  }
}

function emptyNote(what) {
  return `No production ${what} has been recorded in this window. This panel stays empty until real pilot traffic arrives — it is never filled with evaluation numbers.`
}

const UNLABELLED_REASON =
  'Production traffic is unlabelled: ground-truth labels do not exist for live farmer questions, so production accuracy cannot be computed. Evaluation numbers come from the labelled/screened datasets on the Evaluation tab.'

/** Section 2 — chatbot. */
export async function chatbotPanel(window) {
  const { docs, agg, api } = await collect(window)
  const chatbotDocs = docs.filter((doc) => doc.feature === 'chatbot' || doc.eventType?.startsWith('chatbot.'))
  const chatbotAgg = aggregateEvents(chatbotDocs)
  const intents = tally(chatbotDocs.map((doc) => doc.intent).filter(Boolean))
  const apiFeature = api
    ? {
      requests: api.totals.byFeature?.chatbot?.total || 0,
      errors: api.totals.byFeature?.chatbot?.errors || 0,
    }
    : null

  return {
    label: PRODUCTION_LABEL,
    window,
    production: {
      empty: chatbotDocs.length === 0,
      note: chatbotDocs.length === 0 ? emptyNote('chatbot telemetry') : undefined,
      requests: chatbotDocs.length,
      byOutcome: chatbotAgg.byOutcome,
      byEventType: chatbotAgg.byEventType,
      byLanguage: chatbotAgg.byLanguage,
      byConnectivity: chatbotAgg.byConnectivity,
      intents,
      latency: chatbotAgg.latency,
      errorCodes: chatbotAgg.errorCodes,
      apiWindow: apiFeature,
      offlineSharePct: shareOf(chatbotAgg.byConnectivity, 'offline'),
    },
    notCaptured: [
      { metric: 'production accuracy', reason: UNLABELLED_REASON },
      { metric: 'end-to-end client latency (WebLLM on device)', reason: 'Offline inference runs in the browser and is not reported to the backend in this release.' },
      { metric: 'low-confidence / no-answer share', reason: 'Confidence is computed client-side; client telemetry instrumentation is a follow-up (see docs/admin/observability-architecture.md).' },
    ],
  }
}

/** Section 3 — RAG / knowledge. */
export async function ragPanel(window) {
  const { docs, agg, api } = await collect(window)
  const retrievalDocs = docs.filter((doc) => doc.eventType?.startsWith('retrieval.'))
  const retrievalAgg = aggregateEvents(retrievalDocs)
  const kb = kbState()

  return {
    label: PRODUCTION_LABEL,
    window,
    production: {
      empty: retrievalDocs.length === 0,
      note: retrievalDocs.length === 0 ? emptyNote('retrieval telemetry') : undefined,
      queries: retrievalDocs.length,
      byOutcome: retrievalAgg.byOutcome,
      latency: retrievalAgg.latency,
      kbVersionsInUse: retrievalAgg.retrieval.kbVersions,
      resultCount: retrievalAgg.retrieval.resultCounts,
      errorCodes: retrievalAgg.errorCodes,
      apiWindow: api ? { requests: api.totals.byFeature?.advice?.total || 0, errors: api.totals.byFeature?.advice?.errors || 0 } : null,
    },
    kbBuildState: kb,
    notCaptured: [
      { metric: 'production retrieval success rate', reason: 'Retrieval outcomes are computed in the browser; only explicit client telemetry events would report them.' },
      { metric: 'production accuracy / answer quality', reason: UNLABELLED_REASON },
    ],
  }
}

/** Section 4 — safety. */
export async function safetyPanel(window) {
  const { docs, agg } = await collect(window)
  const safetyDocs = docs.filter((doc) => doc.eventType?.startsWith('safety.'))
  const safetyAgg = aggregateEvents(safetyDocs)
  const blocked = safetyDocs.filter((doc) => doc.eventType === 'safety.block')
  const dosageEvents = safetyAgg.safety.dosage
  const dosageTotal = dosageEvents.verified + dosageEvents.unverified
  const reviews = await loadReviews(blocked.map((doc) => doc.eventId))

  return {
    label: PRODUCTION_LABEL,
    window,
    production: {
      empty: safetyDocs.length === 0,
      note: safetyDocs.length === 0 ? emptyNote('safety telemetry') : undefined,
      events: safetyDocs.length,
      blocked: blocked.length,
      warned: safetyAgg.safety.validatorOutcomes.warning || safetyAgg.safety.validatorOutcomes.high_risk || 0,
      allowed: safetyAgg.safety.validatorOutcomes.safe || 0,
      validatorOutcomes: safetyAgg.safety.validatorOutcomes,
      rulesFired: safetyAgg.safety.rulesFired,
      dosage: {
        ...dosageEvents,
        verifiedSharePct: percent(dosageEvents.verified, dosageTotal),
      },
      blockedSample: blocked.slice(0, 20).map((doc) => ({
        eventId: doc.eventId,
        at: doc.occurredAt,
        intent: doc.intent,
        language: doc.language,
        rules: doc.safety?.rulesFired || [],
        reviewed: Boolean(reviews[doc.eventId]),
      })),
      reviewQueue: {
        total: blocked.length,
        reviewed: Object.keys(reviews).length,
        open: Math.max(0, blocked.length - Object.keys(reviews).length),
        byVerdict: tally(Object.values(reviews).map((review) => review.meta?.verdict)),
      },
    },
    notCaptured: [
      { metric: 'false-positive rate on production traffic', reason: 'Requires an operator verdict per blocked event — use the review queue above; unreviewed traffic is not counted either way.' },
      { metric: 'false-negative rate', reason: 'No expert re-labelling of accepted production answers exists, so false negatives are not measurable.' },
    ],
  }
}

async function loadReviews(eventIds) {
  if (eventIds.length === 0) return {}
  try {
    const docs = await RegistryEntry.find({ kind: 'safetyReview', key: { $in: eventIds } }).lean()
    return Object.fromEntries(docs.map((doc) => [doc.key, doc]))
  } catch {
    return {}
  }
}

/** Operator verdict on a blocked/warned event (section 15 review queue). */
export async function reviewSafetyEvent({ eventId, verdict, note, actor }) {
  if (!eventId) throw new Error('eventId is required')
  if (!['correct', 'false-positive', 'false-negative', 'needs-escalation'].includes(verdict)) {
    throw new Error('verdict must be correct | false-positive | false-negative | needs-escalation')
  }
  const doc = await RegistryEntry.findOneAndUpdate(
    { kind: 'safetyReview', key: eventId },
    {
      kind: 'safetyReview',
      key: eventId,
      name: `safety review ${eventId}`,
      status: verdict,
      meta: { verdict, note: String(note || '').slice(0, 300), actor: actor?.email || actor?.id || null },
      updatedAt: new Date(),
    },
    { upsert: true, new: true },
  )
  return { eventId, verdict: doc.meta.verdict, at: doc.updatedAt }
}

/** Section 5 — Crop Doctor. */
export async function cropDoctorPanel(window) {
  const { docs, agg } = await collect(window)
  const diagnosisDocs = docs.filter((doc) => doc.feature === 'cropdoctor' || doc.eventType === 'cropdoctor.diagnose')
  const evalSet = evaluationDashboard().datasets.cropdoctor

  return {
    label: PRODUCTION_LABEL,
    window,
    production: {
      empty: diagnosisDocs.length === 0,
      note: diagnosisDocs.length === 0 ? emptyNote('crop-doctor telemetry') : undefined,
      diagnoses: diagnosisDocs.length,
      byOutcome: tally(diagnosisDocs.map((doc) => doc.outcome)),
      latency: summarizeLatency(diagnosisDocs.map((doc) => doc.latencyMs)),
      abstentions: diagnosisDocs.filter((doc) => doc.outcome === 'fallback' || doc.outcome === 'offline').length,
      errorCodes: tally(diagnosisDocs.map((doc) => doc.errorCode).filter(Boolean)),
    },
    evaluation: {
      label: EVALUATION_LABEL,
      available: evalSet.available,
      metrics: evalSet.available ? evalSet.metrics : null,
      origin: evalSet.available ? evalSet.origin : null,
      reason: evalSet.available ? undefined : evalSet.reason,
      limitations: evalSet.available ? evalSet.limitations : [],
    },
    notCaptured: [
      { metric: 'production top-1 / top-3 accuracy', reason: 'Diagnosis labels do not exist for field images; the evaluation panel above is a labelled-set result and is not live accuracy.' },
    ],
    windowStats: agg.total,
  }
}

/** Section 6 — model quality & performance. */
export async function modelPanel(window) {
  const { docs, agg } = await collect(window)
  const modelDocs = docs.filter((doc) => doc.eventType?.startsWith('model.'))
  const evalSets = evaluationDashboard().datasets

  return {
    label: PRODUCTION_LABEL,
    window,
    production: {
      empty: modelDocs.length === 0,
      note: modelDocs.length === 0 ? emptyNote('model telemetry') : undefined,
      invocations: modelDocs.filter((doc) => doc.eventType === 'model.invoke').length,
      fallbacks: modelDocs.filter((doc) => doc.eventType === 'model.fallback').length,
      fallbackSharePct: percent(
        modelDocs.filter((doc) => doc.eventType === 'model.fallback').length,
        modelDocs.length,
      ),
      byName: agg.models,
      byOutcome: agg.byOutcome,
      latency: agg.latency,
      errorCodes: agg.errorCodes,
    },
    evaluation: {
      label: EVALUATION_LABEL,
      chatbot: evalSets.chatbot.available
        ? { origin: evalSets.chatbot.origin, accuracy: evalSets.chatbot.metrics.accuracy, n: evalSets.chatbot.datasetSize }
        : { reason: evalSets.chatbot.reason },
      multilingual: evalSets.multilingual.available
        ? { origin: evalSets.multilingual.origin, metrics: evalSets.multilingual.metrics }
        : { reason: evalSets.multilingual.reason },
    },
    notCaptured: [
      { metric: 'token-level calibration / perplexity', reason: 'No training or serving telemetry of that kind exists for this system.' },
      { metric: 'farmer-visible answer quality on production traffic', reason: UNLABELLED_REASON },
    ],
  }
}

/** Section 7 — language coverage. */
export async function languagePanel(window) {
  const { docs, agg } = await collect(window)
  const evalSets = evaluationDashboard().datasets

  const evalLanguages = {}
  for (const name of ['chatbot', 'multilingual', 'retrieval']) {
    const set = evalSets[name]
    if (set?.available) evalLanguages[name] = set.facets.languages || []
  }

  return {
    label: PRODUCTION_LABEL,
    window,
    production: {
      empty: docs.length === 0,
      note: docs.length === 0 ? emptyNote('language-tagged telemetry') : undefined,
      byLanguage: agg.byLanguage,
      sharePct: Object.fromEntries(
        Object.entries(agg.byLanguage).map(([language, count]) => [language, percent(count, docs.length)]),
      ),
      taggedEvents: docs.filter((doc) => doc.language).length,
    },
    evaluation: { label: EVALUATION_LABEL, coverage: evalLanguages },
    notCaptured: [
      { metric: 'language share of offline (browser-only) traffic', reason: 'Offline sessions are not reported to the backend in this release.' },
      { metric: 'per-language production accuracy', reason: UNLABELLED_REASON },
    ],
  }
}

/** Section 8 — data coverage. */
export async function coveragePanel(window) {
  const { docs, agg } = await collect(window)
  const kb = kbState()
  const evalSets = evaluationDashboard().datasets
  const retrievalFacets = evalSets.retrieval.available ? evalSets.retrieval.facets : null

  return {
    label: PRODUCTION_LABEL,
    window,
    kbState: kb,
    coverage: kb.available
      ? {
        cropLinkedPct: kb.shares.cropLinkedPct,
        provenancePct: kb.shares.provenancePct,
        verifiedPct: kb.shares.verifiedPct,
        quarantined: kb.counts.quarantined,
        quarantinePct: kb.shares.quarantinedPct,
        orphanTreatments: kb.counts.orphanTreatments,
        unresolvedEdges: kb.counts.unresolvedEdges,
        dosageRecords: kb.counts.withDosage,
        conflictCount: kb.counts.conflictCount,
      }
      : null,
    production: {
      empty: docs.length === 0,
      note: docs.length === 0 ? emptyNote('coverage telemetry') : undefined,
      eventsByFeature: agg.byFeature,
      kbVersionsInUse: agg.retrieval.kbVersions,
    },
    evaluation: {
      label: EVALUATION_LABEL,
      retrievalTopics: retrievalFacets?.topics || [],
      retrievalLanguages: retrievalFacets?.languages || [],
      uncoveredTopics: evalSets.retrieval.available ? evalSets.retrieval.uncoveredTopics : [],
      note: evalSets.retrieval.available ? evalSets.retrieval.origin : evalSets.retrieval.reason,
    },
  }
}

/** Section 9 — sources. */
export async function sourcePanel() {
  const scan = kbSourceScan()
  const kb = kbState()
  return {
    label: 'KB BUILD STATE (from on-disk records)',
    generatedAt: scan.generatedAt,
    sources: scan,
    provenanceSummary: kb.available
      ? {
        withSourceUrl: kb.counts.withSourceUrl,
        verified: kb.counts.verified,
        citationAvailabilityPct: kb.shares.provenancePct,
        verifiedPct: kb.shares.verifiedPct,
      }
      : null,
    note: scan.note,
  }
}

/** Section 11 — failure analysis (aggregated view). */
export async function failurePanel(window) {
  const { docs, agg, api } = await collect(window)
  const errorDocs = docs.filter((doc) => doc.outcome === 'error' || doc.outcome === 'timeout' || doc.eventType === 'error.unhandled')
  const routeErrors = (api?.routes || []).filter((route) => route.errors > 0)

  return {
    label: PRODUCTION_LABEL,
    window,
    production: {
      empty: docs.length === 0,
      note: docs.length === 0 ? emptyNote('failure telemetry') : undefined,
      failedEvents: errorDocs.length,
      failureSharePct: percent(errorDocs.length, docs.length),
      byEventType: tally(errorDocs.map((doc) => doc.eventType)),
      errorCodes: agg.errorCodes,
      worstRoutes: routeErrors,
      api: api
        ? { serverErrors: api.totals.serverErrors, clientErrors: api.totals.clientErrors, latency: api.latency }
        : null,
    },
    topFailures: errorDocs.slice(0, 20).map((doc) => ({
      eventId: doc.eventId,
      at: doc.occurredAt,
      eventType: doc.eventType,
      feature: doc.feature,
      outcome: doc.outcome,
      errorCode: doc.errorCode,
      intent: doc.intent,
      language: doc.language,
    })),
  }
}

function shareOf(map, key) {
  const total = Object.values(map || {}).reduce((sum, value) => sum + value, 0)
  if (!total || !map?.[key]) return null
  return Math.round((map[key] / total) * 1000) / 10
}
