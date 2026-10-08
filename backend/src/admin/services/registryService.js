import { EVAL_RESULTS_DIR, fileExists } from '../paths.js'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { RegistryEntry } from '../store/collections.js'
import { kbState } from './kbService.js'
import { evaluationDashboard } from './evaluationService.js'
import { dependencyMap, changeHistory, kbChangeHistory, configChangeHistory, gitInfo, buildInfo } from './versionService.js'
import { loadWindow, aggregateEvents } from './telemetryService.js'
import { resolveWindow } from './panelsService.js'

const EVAL_DATASETS = ['retrieval', 'safety', 'provenance', 'chatbot', 'multilingual', 'grounding', 'cropdoctor', 'joint-rag']

function readReport(name) {
  const path = join(EVAL_RESULTS_DIR, `${name}.json`)
  if (!fileExists(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}

async function storedEntries(kind) {
  try {
    return await RegistryEntry.find({ kind }).sort({ updatedAt: -1 }).limit(100).lean()
  } catch {
    return []
  }
}

export async function upsertEntry({ kind, key, name, version, status, origin, verified, meta, actor }) {
  if (!['dataset', 'model', 'kbChange', 'configChange', 'release', 'dependency'].includes(kind)) {
    throw new Error(`unsupported registry kind: ${kind}`)
  }
  if (!key) throw new Error('key is required')
  const doc = await RegistryEntry.findOneAndUpdate(
    { kind, key },
    {
      kind,
      key,
      name: name || key,
      version,
      status: status || 'active',
      origin,
      verified,
      meta,
      updatedAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  )
  return { kind: doc.kind, key: doc.key, status: doc.status, updatedAt: doc.updatedAt, actor: actor?.email || null }
}

/** Section 15 — dataset registry. */
export async function datasetsRegistry() {
  const evalSets = evaluationDashboard().datasets
  const kb = kbState()

  const datasets = EVAL_DATASETS.map((name) => {
    const set = evalSets[name]
    return {
      name,
      kind: 'evaluation',
      available: set.available,
      size: set.datasetSize ?? null,
      generatedAt: set.generatedAt ?? null,
      origin: set.origin ?? null,
      path: `eval/results/${name}.json`,
      label: set.available ? set.label : undefined,
      reason: set.available ? undefined : set.reason,
    }
  })

  if (kb.available) {
    datasets.push({
      name: 'knowledge-base',
      kind: 'knowledge-base',
      available: true,
      size: kb.counts.total,
      generatedAt: kb.generatedAt,
      origin: `KB manifest v${kb.version} (${kb.counts.curated} curated, ${kb.counts.quarantined} quarantined)`,
      path: 'KRISHIVERSE/src/data/kb/v2/manifest.json',
    })
  }

  datasets.push({
    name: 'expert-labelled-field-dataset',
    kind: 'ground-truth',
    available: false,
    size: 0,
    origin: 'Missing — no expert-labelled field data exists; this is the documented blocker for production accuracy and crop-doctor field validation.',
    path: null,
  })

  const operatorEntries = await storedEntries('dataset')
  for (const entry of operatorEntries) {
    datasets.push({
      name: entry.key,
      kind: 'operator-registered',
      available: entry.status !== 'retired',
      size: entry.meta?.size ?? null,
      generatedAt: entry.updatedAt,
      origin: entry.origin || entry.name,
      path: entry.meta?.path || null,
      status: entry.status,
    })
  }

  return { generatedAt: new Date().toISOString(), datasets }
}

/** Section 15 — model registry. */
export async function modelsRegistry() {
  const window = resolveWindow({ hours: 168 })
  let telemetryModels = []
  try {
    const docs = await loadWindow(window)
    telemetryModels = aggregateEvents(docs).models
  } catch {
    telemetryModels = []
  }

  const providers = [
    { name: 'groq', configured: Boolean(process.env.GROQ_API_KEY), scope: 'server-side LLM' },
    { name: 'gemini', configured: Boolean(process.env.GEMINI_API_KEY), scope: 'server-side LLM' },
    { name: 'web-llm (browser)', configured: true, scope: 'offline in-browser inference — observed only when client telemetry is enabled' },
    { name: 'onnxruntime-web (crop doctor)', configured: true, scope: 'in-browser image classifier' },
    { name: 'laya', configured: (process.env.LAYA_ENABLED || 'true') === 'true', scope: `decision service (${process.env.LAYA_MODEL_URL ? 'sidecar' : 'builtin'})` },
  ]

  const stored = await storedEntries('model')

  return {
    generatedAt: new Date().toISOString(),
    providers,
    observedInTelemetry: telemetryModels,
    operatorEntries: stored.map((entry) => ({
      key: entry.key, name: entry.name, version: entry.version, status: entry.status, meta: entry.meta, updatedAt: entry.updatedAt,
    })),
    note: 'Providers list what is configured; observedInTelemetry lists models that actually served production events in the window.',
  }
}

/** Section 15 — dependency map. */
export async function dependencyRegistry() {
  return dependencyMap()
}

/** Section 16 — configuration change history. */
export async function configHistory({ limit = 20 } = {}) {
  const git = configChangeHistory({ limit })
  const stored = await storedEntries('configChange')
  return {
    generatedAt: new Date().toISOString(),
    git,
    operatorEntries: stored.map((entry) => ({ key: entry.key, name: entry.name, status: entry.status, meta: entry.meta, updatedAt: entry.updatedAt })),
    trackedPaths: [
      'KRISHIVERSE/.pilot-config.json', 'backend/.env.example', 'KRISHIVERSE/vite.config.js',
      'backend/package.json', 'KRISHIVERSE/package.json',
    ],
    note: 'Secrets live in .env (git-ignored) and are never snapshotted; only .env.example changes are tracked.',
  }
}

/** Section 13 — KB change history. */
export async function kbChangeLog({ limit = 20 } = {}) {
  const git = kbChangeHistory({ limit })
  const kb = kbState()
  const stored = await storedEntries('kbChange')
  return {
    generatedAt: new Date().toISOString(),
    current: kb,
    git,
    operatorEntries: stored.map((entry) => ({ key: entry.key, name: entry.name, status: entry.status, meta: entry.meta, updatedAt: entry.updatedAt })),
  }
}

/** Section 13 — releases / version governance. */
export async function releases() {
  const git = gitInfo()
  const build = buildInfo()
  const stored = await storedEntries('release')
  return {
    generatedAt: new Date().toISOString(),
    git,
    build,
    operatorEntries: stored.map((entry) => ({ key: entry.key, name: entry.name, version: entry.version, status: entry.status, updatedAt: entry.updatedAt })),
    policy: 'Production rollbacks require a tagged release plus an explicit backup id; see docs/admin/runbook.md.',
  }
}
