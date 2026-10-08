/**
 * Pure metric math shared by the admin dashboard and its tests.
 * No I/O, no Express, no Mongoose — safe to import anywhere.
 */

function round(value, digits = 4) {
  if (value === null || value === undefined || !Number.isFinite(value)) return null
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

/** Percentile of an unsorted numeric array. Returns null for empty input. */
export function percentile(values, p) {
  const sorted = [...values].filter((v) => Number.isFinite(v)).sort((a, b) => a - b)
  if (sorted.length === 0) return null
  if (sorted.length === 1) return sorted[0]
  const rank = (p / 100) * (sorted.length - 1)
  const low  = Math.floor(rank)
  const high = Math.ceil(rank)
  if (low === high) return sorted[low]
  return sorted[low] + (sorted[high] - sorted[low]) * (rank - low)
}

/** Latency summary used by every panel that shows p50/p95/p99. */
export function summarizeLatency(values) {
  const clean = (values || []).filter((v) => Number.isFinite(v) && v >= 0)
  if (clean.length === 0) {
    return { count: 0, avg: null, p50: null, p95: null, p99: null, max: null }
  }
  const total = clean.reduce((sum, v) => sum + v, 0)
  return {
    count: clean.length,
    avg:   round(total / clean.length, 1),
    p50:   round(percentile(clean, 50), 1),
    p95:   round(percentile(clean, 95), 1),
    p99:   round(percentile(clean, 99), 1),
    max:   round(Math.max(...clean), 1),
  }
}

/** Safe ratio: returns null instead of Infinity/NaN when the denominator is 0. */
export function ratio(numerator, denominator) {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return null
  return round(numerator / denominator)
}

/** Percentage for display, null-safe. */
export function percent(numerator, denominator) {
  const r = ratio(numerator, denominator)
  return r === null ? null : round(r * 100, 1)
}

/**
 * Confusion matrix from [{ actual, predicted }] rows.
 * Returns { labels, matrix, support, predictedTotals, accuracy }.
 */
export function confusionMatrix(rows) {
  const labels = [...new Set(rows.flatMap((r) => [r.actual, r.predicted]))]
    .filter(Boolean)
    .sort()
  const matrix = {}
  const support = {}
  const predictedTotals = {}
  let correct = 0

  for (const label of labels) {
    matrix[label] = {}
    support[label] = 0
    predictedTotals[label] = 0
    for (const other of labels) matrix[label][other] = 0
  }

  for (const row of rows) {
    const { actual, predicted } = row
    if (!actual || !predicted) continue
    if (!matrix[actual]) matrix[actual] = {}
    if (matrix[actual][predicted] === undefined) {
      matrix[actual][predicted] = 0
      for (const label of labels) {
        if (matrix[label] && matrix[label][predicted] === undefined) matrix[label][predicted] = 0
      }
      if (!matrix[predicted]) matrix[predicted] = {}
      for (const label of labels) {
        if (matrix[predicted][label] === undefined) matrix[predicted][label] = 0
      }
      if (!labels.includes(predicted)) labels.push(predicted)
      if (!labels.includes(actual)) labels.push(actual)
      support[predicted] = support[predicted] ?? 0
      predictedTotals[predicted] = predictedTotals[predicted] ?? 0
    }
    matrix[actual][predicted] += 1
    support[actual] = (support[actual] || 0) + 1
    predictedTotals[predicted] = (predictedTotals[predicted] || 0) + 1
    if (actual === predicted) correct += 1
  }

  labels.sort()
  return {
    labels,
    matrix,
    support,
    predictedTotals,
    accuracy: ratio(correct, rows.length),
  }
}

/**
 * Precision / recall / F1 per class plus macro + weighted averages.
 * Accepts the object returned by confusionMatrix().
 */
export function classificationMetrics({ matrix, labels, support, accuracy }) {
  const perClass = {}
  let macroP = 0
  let macroR = 0
  let macroF = 0
  let weightedF = 0
  let totalSupport = 0

  for (const label of labels) {
    const tp = matrix[label]?.[label] || 0
    const fp = labels.reduce((sum, other) => sum + (matrix[other]?.[label] || 0), 0) - tp
    const fn = (support[label] || 0) - tp
    const precision = ratio(tp, tp + fp)
    const recall    = ratio(tp, tp + fn)
    const f1        = precision !== null && recall !== null && precision + recall > 0
      ? round((2 * precision * recall) / (precision + recall))
      : null

    perClass[label] = { precision, recall, f1, support: support[label] || 0, tp, fp, fn }

    if (precision !== null) { macroP += precision; macroR += recall ?? 0; macroF += f1 ?? 0 }
    const s = support[label] || 0
    if (f1 !== null) weightedF += f1 * s
    totalSupport += s
  }

  const classCount = labels.length || 1
  return {
    accuracy,
    perClass,
    macro: {
      precision: labels.length ? round(macroP / classCount) : null,
      recall:    labels.length ? round(macroR / classCount) : null,
      f1:        labels.length ? round(macroF / classCount) : null,
    },
    weighted: { f1: totalSupport ? round(weightedF / totalSupport) : null },
  }
}

/**
 * Recall@K over rows of { expected, retrieved } where expected is a string id or
 * array of ids and retrieved is a ranked array of ids.
 */
export function recallAtK(rows, k) {
  if (!Array.isArray(rows) || rows.length === 0) return { n: 0, hits: 0, recallAtK: null }
  const expectedOf = (row) => (Array.isArray(row.expected) ? row.expected : [row.expected])
  let hits = 0
  let scored = 0
  for (const row of rows) {
    const expected = expectedOf(row).filter(Boolean)
    const retrieved = Array.isArray(row.retrieved) ? row.retrieved.slice(0, k) : []
    if (expected.length === 0 || retrieved.length === 0) continue
    scored += 1
    if (expected.some((id) => retrieved.includes(id))) hits += 1
  }
  return { n: rows.length, hits, recallAtK: ratio(hits, scored) }
}

/** Mean reciprocal rank of the first relevant record. */
export function mrr(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return { n: 0, mrr: null }
  const expectedOf = (row) => (Array.isArray(row.expected) ? row.expected : [row.expected])
  let total = 0
  let scored = 0
  for (const row of rows) {
    const expected = expectedOf(row).filter(Boolean)
    const retrieved = Array.isArray(row.retrieved) ? row.retrieved : []
    if (expected.length === 0 || retrieved.length === 0) continue
    scored += 1
    const index = retrieved.findIndex((id) => expected.includes(id))
    if (index >= 0) total += 1 / (index + 1)
  }
  return { n: rows.length, mrr: scored ? round(total / scored) : null }
}

/**
 * Recall@K and MRR derived from per-query ranks (1 = best).
 * A null / non-positive rank counts as a miss at every K.
 */
export function rankMetrics(ranks) {
  const clean = (ranks || []).filter((v) => Number.isFinite(v))
  if (clean.length === 0) return { n: 0, recallAt1: null, recallAt3: null, recallAt5: null, mrr: null }
  const hits = (k) => clean.filter((rank) => rank > 0 && rank <= k).length
  const reciprocal = clean.map((rank) => (rank > 0 ? 1 / rank : 0))
  return {
    n: clean.length,
    recallAt1: ratio(hits(1), clean.length),
    recallAt3: ratio(hits(3), clean.length),
    recallAt5: ratio(hits(5), clean.length),
    mrr: round(reciprocal.reduce((sum, v) => sum + v, 0) / clean.length),
  }
}

/** Count values in an array of strings, returning a sorted { value: count } map. */
export function tally(values) {
  const counts = {}
  for (const value of values || []) {
    if (value === undefined || value === null) continue
    counts[value] = (counts[value] || 0) + 1
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1]))
}
