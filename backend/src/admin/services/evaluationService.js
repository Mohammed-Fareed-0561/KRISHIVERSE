import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { EVAL_RESULTS_DIR, fileExists } from '../paths.js'
import { rankMetrics, summarizeLatency, tally, percent } from '../metrics/math.js'

export const EVALUATION_LABEL = 'EVALUATION DATASET — NOT LIVE FARMER ACCURACY'
export const LOSS_UNAVAILABLE = 'Not available — no training-loss telemetry configured.'

const DATASETS = ['retrieval', 'safety', 'provenance', 'chatbot', 'multilingual', 'grounding', 'cropdoctor', 'joint-rag']

function read(name) {
  const path = join(EVAL_RESULTS_DIR, `${name}.json`)
  if (!fileExists(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}

function unavailable(name, reason) {
  return { available: false, name, reason, metrics: {}, facets: {}, failures: [] }
}

function base(report, name) {
  return {
    available: true,
    name,
    generatedAt: report.generatedAt || null,
    origin: report.origin || 'unknown origin',
    label: EVALUATION_LABEL,
  }
}

function buildRetrieval(report) {
  const rows = Array.isArray(report.rows) ? report.rows : []
  const ranks = rows.map((row) => row.rank)
  const metrics = rankMetrics(ranks)
  const latencies = rows.map((row) => row.ms).filter((v) => Number.isFinite(v))
  const failures = rows
    .filter((row) => !row.recallAt5)
    .slice(0, 10)
    .map((row) => ({ id: row.id, language: row.language, topic: row.topic, rank: row.rank, latencyMs: row.ms }))

  return {
    ...base(report, 'retrieval'),
    datasetSize: rows.length,
    metrics: {
      ...metrics,
      latency: summarizeLatency(latencies),
      reported: report.overall || null,
    },
    facets: {
      languages: [...new Set(rows.map((row) => row.language))],
      topics: [...new Set(rows.map((row) => row.topic))],
      byLanguage: report.byLanguage || {},
      byTopic: report.byTopic || {},
    },
    uncoveredTopics: report.uncoveredTopics || [],
    rows: rows.map((row) => ({
      id: row.id, language: row.language, topic: row.topic, rank: row.rank,
      ms: row.ms, recallAt1: row.recallAt1, recallAt3: row.recallAt3, recallAt5: row.recallAt5,
    })),
    failures,
    limitations: [
      report.origin,
      'Ranks come from a screening run over curated records; see the report origin field before quoting any number.',
    ],
  }
}

function buildSafety(report) {
  const checks = Array.isArray(report.checks) ? report.checks : []
  return {
    ...base(report, 'safety'),
    datasetSize: report.total ?? checks.length,
    metrics: {
      assertionsPassed: report.passed ?? null,
      assertionsFailed: report.failed ?? null,
      passRate: report.passRate ?? percent(report.passed, report.total),
      falsePositiveRate: null,
      falseNegativeRate: null,
      blockedShareOfAssertions: null,
    },
    facets: { categories: tally(checks.map((check) => check.category || 'invariant')) },
    failures: checks.filter((check) => !check.pass).slice(0, 10),
    unavailableMetrics: [
      { metric: 'false-positive rate', reason: 'No expert-labelled safety dataset exists, so false positives are not measurable.' },
      { metric: 'false-negative rate', reason: 'No expert-labelled safety dataset exists, so false negatives are not measurable.' },
    ],
    limitations: [report.origin, report.limitation].filter(Boolean),
  }
}

function buildProvenance(report) {
  const checks = Array.isArray(report.checks) ? report.checks : []
  return {
    ...base(report, 'provenance'),
    datasetSize: report.total ?? checks.length,
    metrics: {
      assertionsPassed: report.passed ?? null,
      assertionsFailed: report.failed ?? null,
      passRate: report.passRate ?? percent(report.passed, report.total),
      recordsWithFullProvenance: report.recordsWithFullProvenance ?? null,
      provenanceCoveragePct: report.provenanceCoveragePct ?? null,
    },
    facets: { categories: tally(checks.map((check) => check.category || 'invariant')) },
    failures: checks.filter((check) => !check.pass).slice(0, 10),
    limitations: [report.origin, report.limitation].filter(Boolean),
  }
}

function buildChatbot(report) {
  const rows = Array.isArray(report.rows) ? report.rows : []
  const latencies = rows.map((row) => row.ms).filter((v) => Number.isFinite(v))
  const failures = (Array.isArray(report.failures) ? report.failures : []).slice(0, 10)

  return {
    ...base(report, 'chatbot'),
    datasetSize: report.cases ?? rows.length,
    metrics: {
      accuracy: report.accuracy ?? null,
      scored: report.scored ?? null,
      passed: report.passed ?? null,
      latency: summarizeLatency(latencies),
      reportedLatency: report.latencyMs || null,
    },
    facets: {
      languages: Object.keys(report.byLanguage || {}),
      byLanguage: report.byLanguage || {},
      types: tally(rows.map((row) => row.type)),
    },
    failures,
    limitations: [report.origin, report.note].filter(Boolean),
  }
}

function buildMultilingual(report) {
  const perLanguage = report.perLanguage || {}
  const rows = Object.entries(perLanguage).map(([language, data]) => ({ language, ...data }))
  return {
    ...base(report, 'multilingual'),
    datasetSize: rows.reduce((sum, row) => sum + (row.n || 0), 0),
    metrics: {
      languages: rows.length,
      intentAccuracy: average(rows.map((row) => row.intentAcc)),
      cropAccuracy: average(rows.map((row) => row.cropAcc)),
      retrievalAccuracy: average(rows.map((row) => row.retrievalAcc)),
      latency: summarizeLatency(rows.map((row) => row.avgMs)),
    },
    facets: { languages: rows.map((row) => row.language), byLanguage: perLanguage },
    failures: [],
    limitations: [report.origin, report.note].filter(Boolean),
  }
}

function buildGrounding(report) {
  const rows = Array.isArray(report.rows) ? report.rows : []
  return {
    ...base(report, 'grounding'),
    datasetSize: report.queries ?? rows.length,
    metrics: {
      grounded: report.grounded ?? null,
      scored: report.scored ?? null,
      groundedShare: percent(report.grounded, report.scored),
    },
    facets: { types: tally(rows.map((row) => row.type)) },
    failures: rows.filter((row) => !row.grounded).slice(0, 10),
    unavailableMetrics: [
      { metric: 'calibration (ECE)', reason: 'No probability outputs are recorded by this substring-based trace, so calibration is not measurable.' },
    ],
    limitations: [report.origin, report.limitation].filter(Boolean),
  }
}

function buildCropDoctor(report) {
  const rows = Array.isArray(report.rows) ? report.rows : []
  const textRows = rows.filter((row) => typeof row.ms === 'number')
  const recorded = rows.find((row) => row.id === 'recorded-onnx-120')
  const abstention = rows.find((row) => row.id === 'abstention-rate')
  const latencies = textRows.map((row) => row.ms)

  const top1Rows = textRows.filter((row) => 'top1Ok' in row)
  const top1Correct = top1Rows.filter((row) => row.top1Ok).length
  const top3Rows = textRows.filter((row) => 'top3Ok' in row)
  const top3Correct = top3Rows.filter((row) => row.top3Ok).length

  const metrics = {
    textTop1Accuracy: top1Rows.length ? percent(top1Correct, top1Rows.length) : null,
    textTop3Accuracy: top3Rows.length ? percent(top3Correct, top3Rows.length) : null,
    onnxTop1Accuracy: recorded?.top1 != null ? Math.round(recorded.top1 * 1000) / 10 : null,
    onnxCorrect: recorded?.correct ?? null,
    onnxTotal: recorded?.total ?? null,
    onnxWilson95: recorded?.wilson_ci_95 || null,
    abstentionRate: abstention?.probes ? percent(abstention.abstained, abstention.probes) : null,
    latency: summarizeLatency(latencies),
  }

  let perClass = null
  let confusion = null
  if (recorded?.confusion) {
    const matrix = {}
    const support = {}
    for (const [key, count] of Object.entries(recorded.confusion)) {
      const [actual, predicted] = key.split('→')
      if (!matrix[actual]) matrix[actual] = {}
      matrix[actual][predicted] = count
      support[actual] = (support[actual] || 0) + count
    }
    const labels = Object.keys(matrix)
    const predictedTotals = {}
    for (const label of labels) {
      for (const other of Object.keys(matrix[label] || {})) {
        predictedTotals[other] = (predictedTotals[other] || 0) + matrix[label][other]
      }
    }
    let correct = 0
    for (const label of labels) correct += matrix[label]?.[label] || 0
    const total = Object.values(recorded.confusion).reduce((sum, value) => sum + value, 0)
    confusion = { labels, matrix, support, predictedTotals, accuracy: percent(correct, total) }
    perClass = {}
    for (const label of labels) {
      const tp = matrix[label]?.[label] || 0
      const fn = (support[label] || 0) - tp
      const fp = (predictedTotals[label] || 0) - tp
      perClass[label] = {
        precision: percent(tp, tp + fp),
        recall: percent(tp, tp + fn),
        support: support[label],
      }
      perClass[label].f1 = perClass[label].precision !== null && perClass[label].recall !== null
        && perClass[label].precision + perClass[label].recall > 0
        ? Math.round((2 * perClass[label].precision * perClass[label].recall)
          / (perClass[label].precision + perClass[label].recall) * 10) / 10
        : null
    }
  }

  return {
    ...base(report, 'cropdoctor'),
    datasetSize: recorded?.total ?? textRows.length,
    metrics: { ...metrics, perClass, confusion },
    facets: { rowKinds: tally(rows.map((row) => row.id.replace(/-.*/, ''))) },
    failures: textRows.filter((row) => row.error || row.top3Ok === false).slice(0, 10),
    unavailableMetrics: [
      { metric: 'calibration (ECE)', reason: 'ONNX run records top-k labels only; no probability calibration trace is stored.' },
    ],
    limitations: [report.origin, ...(report.notes || [])].filter(Boolean),
  }
}

function buildJointRag(report) {
  const rows = Array.isArray(report.rows) ? report.rows : []
  return {
    ...base(report, 'joint-rag'),
    datasetSize: report.cases ?? rows.length,
    metrics: {
      aRecallAt5: report.aRecallAt5 ?? null,
      bEntityMention: report.bEntityMention ?? null,
      categories: report.categories || {},
      bReachable: report.bReachable ?? null,
      latency: { aAvg: report.latencyMs?.aAvg ?? null, bAvg: report.latencyMs?.bAvg ?? null },
    },
    facets: { categories: Object.keys(report.categories || {}) },
    failures: [],
    limitations: [
      report.origin,
      report.bReachable === false
        ? 'Variant B service was unreachable during this run — treat B numbers as unavailable, not as a baseline.'
        : null,
    ].filter(Boolean),
  }
}

function average(values) {
  const clean = values.filter((v) => Number.isFinite(v))
  if (clean.length === 0) return null
  return Math.round((clean.reduce((sum, v) => sum + v, 0) / clean.length) * 1000) / 1000
}

const BUILDERS = {
  retrieval: buildRetrieval,
  safety: buildSafety,
  provenance: buildProvenance,
  chatbot: buildChatbot,
  multilingual: buildMultilingual,
  grounding: buildGrounding,
  cropdoctor: buildCropDoctor,
  'joint-rag': buildJointRag,
}

/**
 * Evaluation dashboard payload. Every number here comes from eval/results/*.json
 * and is always returned under the evaluation label — never as production accuracy.
 */
export function evaluationDashboard() {
  const datasets = {}
  for (const name of DATASETS) {
    const report = read(name)
    if (!report) {
      datasets[name] = unavailable(
        name,
        `No eval/results/${name}.json found — run the ${name} evaluation suite to populate this panel.`,
      )
      continue
    }
    try {
      datasets[name] = BUILDERS[name](report)
    } catch (error) {
      datasets[name] = unavailable(name, `Failed to parse eval/results/${name}.json: ${error?.message || error}`)
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    label: EVALUATION_LABEL,
    datasets,
    unavailablePanels: [
      { name: 'training-loss', reason: LOSS_UNAVAILABLE },
      {
        name: 'production-accuracy',
        reason: 'Production traffic is unlabelled. Ground-truth labels do not exist for live farmer questions, so no production accuracy figure is reported.',
      },
    ],
    methodology: 'Every panel renders its dataset origin string verbatim; read it before quoting a number.',
  }
}

/** Single-dataset view used by the dashboard filter tabs. */
export function evaluationDataset(name) {
  const all = evaluationDashboard()
  return all.datasets[name] || unavailable(name, `Unknown dataset: ${name}`)
}
