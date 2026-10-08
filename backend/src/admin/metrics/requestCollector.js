/**
 * In-memory rolling observation window for farmer-facing API traffic.
 * Lives entirely in process memory: no persistence, no network, no awaits,
 * and it can never influence the request it observes.
 */

const RING_SIZE = 5000

let ring = []
let counters = null

function freshCounters() {
  return {
    total: 0,
    success: 0,
    clientErrors: 0,
    serverErrors: 0,
    byStatusClass: {},
    byFeature: {},
    connectivity: { online: 0, offline: 0, unknown: 0 },
    since: new Date().toISOString(),
  }
}

counters = freshCounters()

function normalizeRoute(route) {
  if (typeof route !== 'string' || route === '') return 'unknown'
  const clean = route.split('?')[0]
  const parts = clean.split('/').filter(Boolean)
  return `/${parts.slice(0, 3).join('/')}`
}

function classify(status) {
  if (status >= 500) return 'serverErrors'
  if (status >= 400) return 'clientErrors'
  return 'success'
}

export function observeRequest({ route, method, status, ms, feature, connectivity }) {
  try {
    const normalized = normalizeRoute(route)
    const safeMs = Number.isFinite(ms) ? Math.max(0, ms) : 0
    const safeStatus = Number.isFinite(status) ? status : 0
    const klass = classify(safeStatus)

    counters.total += 1
    counters[klass] += 1
    counters.byStatusClass[String(Math.floor(safeStatus / 100) * 100 || 0)] =
      (counters.byStatusClass[String(Math.floor(safeStatus / 100) * 100 || 0)] || 0) + 1

    const featureKey = feature || 'other'
    if (!counters.byFeature[featureKey]) counters.byFeature[featureKey] = { total: 0, errors: 0 }
    counters.byFeature[featureKey].total += 1
    if (safeStatus >= 500) counters.byFeature[featureKey].errors += 1

    const conn = connectivity || 'unknown'
    if (counters.connectivity[conn] === undefined) counters.connectivity[conn] = 0
    counters.connectivity[conn] += 1

    ring.push({ route: normalized, method, status: safeStatus, ms: safeMs, at: Date.now() })
    if (ring.length > RING_SIZE) ring = ring.slice(ring.length - RING_SIZE)
  } catch {
    /* observation must never break the observed request */
  }
}

export function snapshot() {
  try {
    const latencies = ring.map((entry) => entry.ms)
    const recent = ring.slice(-500)
    const recentErrors = recent.filter((entry) => entry.status >= 500).length
    const byRoute = {}
    for (const entry of ring) {
      if (!byRoute[entry.route]) byRoute[entry.route] = { total: 0, errors: 0, latencies: [] }
      byRoute[entry.route].total += 1
      if (entry.status >= 500) byRoute[entry.route].errors += 1
      byRoute[entry.route].latencies.push(entry.ms)
    }
    const routes = Object.entries(byRoute)
      .map(([route, data]) => ({ route, ...data, latencies: undefined }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 20)

    return {
      window:      { size: ring.length, capacity: RING_SIZE, since: counters.since },
      totals:      { ...counters },
      latency:     latencySummary(latencies),
      recent:      { window: recent.length, serverErrors: recentErrors },
      routes,
    }
  } catch {
    return { window: { size: 0 }, totals: freshCounters(), latency: latencySummary([]), routes: [] }
  }
}

function latencySummary(values) {
  const clean = values.filter((v) => Number.isFinite(v))
  if (clean.length === 0) return { count: 0, avg: null, p50: null, p95: null, p99: null, max: null }
  const sorted = [...clean].sort((a, b) => a - b)
  const at = (p) => {
    const rank = (p / 100) * (sorted.length - 1)
    const low = Math.floor(rank)
    const high = Math.ceil(rank)
    return low === high ? sorted[low] : sorted[low] + (sorted[high] - sorted[low]) * (rank - low)
  }
  const round = (v) => Math.round(v * 10) / 10
  return {
    count: clean.length,
    avg:   round(clean.reduce((sum, v) => sum + v, 0) / clean.length),
    p50:   round(at(50)),
    p95:   round(at(95)),
    p99:   round(at(99)),
    max:   round(sorted[sorted.length - 1]),
  }
}

export function resetRequestCollector() {
  ring = []
  counters = freshCounters()
}
