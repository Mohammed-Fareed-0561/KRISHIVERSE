import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import axios from 'axios'
import { REPO_ROOT, FRONTEND_DIR, BACKEND_DIR, KB_MANIFEST_PATH, fileExists, fileStat } from '../paths.js'

function git(args) {
  try {
    return execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 })
      .trim()
  } catch {
    return null
  }
}

function readJson(path) {
  try {
    if (!fileExists(path)) return null
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}

export function gitInfo() {
  const commit = git(['rev-parse', 'HEAD'])
  if (!commit) return { available: false, reason: 'git metadata unavailable in this environment' }
  return {
    available: true,
    commit,
    shortCommit: commit.slice(0, 7),
    branch: git(['rev-parse', '--abbrev-ref', 'HEAD']) || 'unknown',
    dirty: Boolean(git(['status', '--porcelain'])),
    lastCommitAt: git(['log', '-1', '--format=%cI']) || null,
    lastCommitSubject: git(['log', '-1', '--format=%s']) || null,
    author: git(['log', '-1', '--format=%an']) || null,
  }
}

export function changeHistory({ limit = 20, paths = [] } = {}) {
  const args = ['log', `-n`, String(Math.min(limit, 100)), '--date=iso-strict', '--format=%H%x1f%h%x1f%cI%x1f%an%x1f%s']
  if (paths.length) args.push('--', ...paths)
  const raw = git(args)
  if (raw === null) return { available: false, reason: 'git metadata unavailable', entries: [] }
  const entries = raw === '' ? [] : raw.split('\n').map((line) => {
    const [commit, shortCommit, at, author, subject] = line.split('\x1f')
    return { commit, shortCommit, at, author, subject }
  })
  return { available: true, entries }
}

export function kbChangeHistory({ limit = 20 } = {}) {
  return changeHistory({
    limit,
    paths: [
      'KRISHIVERSE/src/data/kb/v2/manifest.json',
      'KRISHIVERSE/src/data/seed',
      'KRISHIVERSE/scripts/kb-ingest.mjs',
      'KRISHIVERSE/scripts/migrate-kb.mjs',
    ],
  })
}

export function configChangeHistory({ limit = 20 } = {}) {
  return changeHistory({
    limit,
    paths: [
      'KRISHIVERSE/.pilot-config.json',
      'backend/.env.example',
      'KRISHIVERSE/vite.config.js',
      'backend/package.json',
      'KRISHIVERSE/package.json',
    ],
  })
}

export function buildInfo() {
  const frontendPkg = readJson(join(FRONTEND_DIR, 'package.json'))
  const backendPkg = readJson(join(BACKEND_DIR, 'package.json'))
  const distIndex = join(FRONTEND_DIR, 'dist', 'index.html')
  return {
    frontend: { version: frontendPkg?.version || null, name: frontendPkg?.name || null },
    backend: { version: backendPkg?.version || null, name: backendPkg?.name || null },
    apiVersion: process.env.API_VERSION || 'v1',
    dist: fileStat(distIndex),
    node: process.version,
    environment: process.env.NODE_ENV || 'development',
  }
}

export function kbVersion() {
  const manifest = readJson(KB_MANIFEST_PATH)
  if (!manifest) return { available: false, reason: 'KB manifest not found' }
  return {
    available: true,
    version: manifest.version ?? null,
    generatedAt: manifest.generatedAt ?? null,
    inputChecksum: manifest.inputChecksum ?? null,
    recordCount: manifest.recordCount ?? null,
    report: manifest.report || null,
  }
}

let ragProbeCache = { at: 0, value: null }

/** Non-blocking, cached, failure-tolerant probe of an optional sidecar. */
async function probe(name, url, timeoutMs = 1500) {
  const cacheTtl = 60 * 1000
  if (ragProbeCache.value && Date.now() - ragProbeCache.at < cacheTtl) {
    const cached = ragProbeCache.value[name]
    if (cached) return cached
  }
  if (!ragProbeCache.value) ragProbeCache.value = {}
  let value
  try {
    const started = Date.now()
    const res = await axios.get(url, { timeout: timeoutMs, validateStatus: () => true })
    value = {
      name,
      url,
      reachable: res.status >= 200 && res.status < 500,
      status: res.status,
      latencyMs: Date.now() - started,
    }
  } catch (error) {
    value = { name, url, reachable: false, error: error?.code || 'unreachable' }
  }
  ragProbeCache.value[name] = value
  ragProbeCache.at = Date.now()
  return value
}

export async function dependencyMap() {
  const ragUrl = (process.env.RAG_SERVICE_URL || '').trim()
  const deps = [
    { name: 'mongodb', kind: 'database', required: true, configured: true },
    { name: 'groq', kind: 'llm-provider', required: false, configured: Boolean(process.env.GROQ_API_KEY) },
    { name: 'gemini', kind: 'llm-provider', required: false, configured: Boolean(process.env.GEMINI_API_KEY) },
    { name: 'openweather', kind: 'weather-provider', required: false, configured: Boolean(process.env.OPENWEATHER_API_KEY) },
    {
      name: 'laya',
      kind: 'decision-service',
      required: false,
      configured: (process.env.LAYA_ENABLED || 'true') === 'true',
      mode: process.env.LAYA_MODEL_URL ? 'sidecar' : 'builtin',
    },
    {
      name: 'rag-service',
      kind: 'retrieval-service',
      required: false,
      configured: Boolean(ragUrl),
      mode: ragUrl ? 'http' : 'in-process',
    },
  ]

  if (ragUrl) {
    const probeResult = await probe('rag-service', `${ragUrl.replace(/\/$/, '')}/health`)
    const entry = deps.find((dep) => dep.name === 'rag-service')
    entry.reachable = probeResult.reachable
    entry.probedAt = new Date().toISOString()
    entry.probeNote = probeResult.reachable ? undefined : 'sidecar unreachable — offline in-process retrieval is used instead'
  }

  return { generatedAt: new Date().toISOString(), dependencies: deps }
}

export function resetProbeCache() {
  ragProbeCache = { at: 0, value: null }
}
