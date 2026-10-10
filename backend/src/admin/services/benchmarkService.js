import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { MOBILE_AI_RESULTS_DIR, fileExists } from '../paths.js'

export const BENCHMARK_LABEL = 'BENCHMARK EVALUATION — ISOLATED HARNESS, NOT PRODUCTION TELEMETRY'
const DATA_CLASS = 'benchmark-evaluation'

/** name → file in eval/mobile-ai/results/ (see KRISHIVERSE/eval/mobile-ai). */
const RESULTS = {
  chatbot: 'chatbot-arms.json',
  rag: 'rag-benchmark.json',
  conditionalrag: 'rag-conditional.json',
  decision: 'decision-benchmark.json',
  grounding: 'grounding-guard.json',
  safety: 'safety-results.json',
  ablation: 'ablation-results.json',
  cropdoctor: 'cropdoctor-benchmark.json',
  imagequality: 'image-quality.json',
  offline: 'offline-benchmark.json',
  mobile: 'mobile-resources.json',
  utility: 'mobile-utility-score.json',
  latency: 'latency-results.json',
  memory: 'memory-results.json',
  models: 'model-results.json',
}

/**
 * Derived single-source views (spec §53 tabs): Needle and Laya never own a result
 * file — their arms live inside chatbot/decision/rag results, so the view picks the
 * exact arm ids out of the measured files instead of inventing a second source.
 */
const VIEWS = {
  needle: {
    title: 'Needle 3 (Cactus) arms H–M — experimental, skipped in this environment',
    subsets: [
      { file: 'arm-results.json', ids: ['H-nlp-needle', 'I-h-kb', 'J-i-rag', 'K-h-kb-decision', 'L-k-rag', 'M-l-laya'] },
      { file: 'decision-benchmark.json', ids: ['needle-clarify'] },
      { file: 'rag-benchmark.json', ids: ['needle-embeddings'] },
    ],
  },
  laya: {
    title: 'Laya arms — fallback measured, live arm skipped (KV_BENCH_API)',
    subsets: [
      { file: 'arm-results.json', ids: ['G-f-laya', 'G-laya-live'] },
      { file: 'decision-benchmark.json', ids: ['laya-live', 'needle+laya'] },
    ],
  },
}

/** Top-level report blocks worth surfacing beyond arms/dataset/limitations. */
const EXTRA_KEYS = [
  'taskBreakdown', 'safetyHardFailures', 'safetyAdvisoryFindings', 'safetyCrosscheck',
  'safetyInvariant', 'rowAggregates', 'cropStrategy', 'determinism', 'index',
  'latencyMs', 'failures', 'rows', 'offlineMatrix', 'scenarios', 'ablationTable',
  'baseline', 'checks', 'criticalSafetyFailure', 'parity', 'savings',
  'productionComparison', 'modelCatalog', 'weights', 'measuredWeight',
  'unmeasuredDimensions', 'before', 'architectures', 'readingNote', 'datasetRegistry',
  'derivedFrom',
]

function readJson(file) {
  const path = join(MOBILE_AI_RESULTS_DIR, file)
  if (!fileExists(path)) return { error: `No eval/mobile-ai/results/${file} found — run \`npm run eval:mobile-ai\` in KRISHIVERSE/ to populate this panel.` }
  try {
    return { json: JSON.parse(readFileSync(path, 'utf8')) }
  } catch (error) {
    return { error: `Failed to parse eval/mobile-ai/results/${file}: ${error?.message || error}` }
  }
}

function unavailable(name, reason) {
  return { available: false, name, reason, label: BENCHMARK_LABEL }
}

function summarize(name, json, defaultOrigin) {
  if (json.dataClass !== DATA_CLASS) {
    return unavailable(name, `Refusing to display ${name}: dataClass is "${json.dataClass}", expected "${DATA_CLASS}".`)
  }
  const extras = {}
  for (const key of EXTRA_KEYS) if (json[key] !== undefined) extras[key] = json[key]
  return {
    available: true,
    name,
    label: BENCHMARK_LABEL,
    title: json.title || name,
    dataClass: json.dataClass,
    generatedAt: json.runMeta?.date || null,
    gitCommit: json.runMeta?.gitCommit || null,
    seed: typeof json.runMeta?.seed === 'number' ? json.runMeta.seed : null,
    benchmarkId: json.runMeta?.benchmarkId || null,
    origin: json.dataset?.origin || defaultOrigin || 'unknown origin',
    dataset: json.dataset || {},
    arms: Array.isArray(json.arms) ? json.arms : [],
    limitations: Array.isArray(json.limitations) ? json.limitations : [],
    ...extras,
  }
}

/** Build a needle/laya view by picking arm ids out of their source result files. */
function buildView(name, spec) {
  const arms = []
  const files = []
  const limitations = new Set()
  let sample = null
  for (const subset of spec.subsets) {
    const { json, error } = readJson(subset.file)
    if (error) return unavailable(name, error)
    files.push(subset.file)
    if (!sample) sample = json
    for (const limitation of json.limitations || []) limitations.add(limitation)
    for (const id of subset.ids) {
      const arm = json.arms?.find((candidate) => candidate.id === id)
      if (arm) arms.push({ ...arm, sourceFile: subset.file })
    }
  }
  if (!arms.length) return unavailable(name, `No ${name} arms found — run \`npm run eval:mobile-ai\`.`)
  return {
    ...summarize(name, { ...sample, arms, limitations: [...limitations] }),
    title: spec.title,
    subsetOf: files,
    note: 'Derived view: arms copied verbatim from the listed result files — no second measurement.',
  }
}

/**
 * Dataset registry: every dataset path + sha256 recorded in runMeta.datasetHashes
 * across all result files, with the panels that consumed it. Hashes are copied
 * verbatim — never recomputed here.
 */
function buildDatasetRegistry() {
  const byPath = new Map()
  let checked = 0
  for (const [name, file] of Object.entries(RESULTS)) {
    const { json, error } = readJson(file)
    if (error || !json) continue
    checked += 1
    for (const [path, sha256] of Object.entries(json.runMeta?.datasetHashes || {})) {
      const entry = byPath.get(path) || { path, sha256, origins: new Set(), usedBy: [] }
      entry.usedBy.push(name)
      entry.origins.add(json.dataset?.origin || 'unknown origin')
      byPath.set(path, entry)
    }
  }
  if (!checked) return unavailable('datasets', 'No eval/mobile-ai/results/*.json found — run `npm run eval:mobile-ai` in KRISHIVERSE/ to populate this panel.')
  const datasetRegistry = [...byPath.values()].map((entry) => ({
    path: entry.path,
    sha256: entry.sha256,
    origin: [...entry.origins].join('; '),
    usedBy: entry.usedBy,
  }))
  return {
    available: true,
    name: 'datasets',
    label: BENCHMARK_LABEL,
    title: 'Dataset registry — sha256 of every dataset file consumed by the benchmark run',
    dataClass: DATA_CLASS,
    generatedAt: null,
    gitCommit: null,
    seed: null,
    benchmarkId: 'derived-view (runMeta.datasetHashes)',
    origin: 'derived from all result files (hashes copied verbatim)',
    dataset: {},
    arms: [],
    limitations: [
      'Derived view: hashes are copied from each result file\'s runMeta.datasetHashes — a mismatch between files is itself a finding.',
      'Screening sets are synthetic; no farmer data is hashed or stored here.',
    ],
    datasetRegistry,
    note: 'Derived view — no second measurement; empty arms table by design.',
  }
}

function buildResults() {
  const results = {}
  for (const [name, file] of Object.entries(RESULTS)) {
    const { json, error } = readJson(file)
    results[name] = error ? unavailable(name, error) : summarize(name, json, name === 'utility' ? 'derived score over measured dimensions (§41)' : undefined)
  }
  for (const [name, spec] of Object.entries(VIEWS)) results[name] = buildView(name, spec)
  results.datasets = buildDatasetRegistry()
  return results
}

/**
 * Benchmark dashboard payload. Every number comes verbatim from
 * KRISHIVERSE/eval/mobile-ai/results/*.json produced by the isolated
 * benchmark harness — never from production traffic.
 */
export function benchmarkDashboard() {
  const results = buildResults()

  const comparison = readJson('comparison.json')
  const matrix = readJson('decision-matrix.json')

  return {
    generatedAt: new Date().toISOString(),
    label: BENCHMARK_LABEL,
    results,
    comparison: comparison.json || null,
    decisionMatrix: matrix.json || null,
    unavailablePanels: [
      { name: 'comparison', reason: comparison.error || null },
      { name: 'decision-matrix', reason: matrix.error || null },
    ].filter((panel) => panel.reason),
    methodology: 'Report-only benchmark harness under KRISHIVERSE/eval/mobile-ai — screening pass rates are not farmer-facing accuracy; device metrics are desktop reference unless a device arm says otherwise.',
  }
}

/** Single benchmark view used by the dashboard tabs (file results + derived views). */
export function benchmarkResult(name) {
  if (VIEWS[name] || name === 'datasets') {
    return buildResults()[name]
  }
  const file = RESULTS[name]
  if (!file) return unavailable(name, `Unknown benchmark: ${name}`)
  const { json, error } = readJson(file)
  return error ? unavailable(name, error) : summarize(name, json, name === 'utility' ? 'derived score over measured dimensions (§41)' : undefined)
}

export const BENCHMARK_NAMES = Object.freeze([
  ...Object.keys(RESULTS),
  ...Object.keys(VIEWS),
  'datasets',
])
