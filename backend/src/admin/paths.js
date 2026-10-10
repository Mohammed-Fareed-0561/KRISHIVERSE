import { existsSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

export const REPO_ROOT       = process.env.REPO_ROOT ? resolve(process.env.REPO_ROOT) : resolve(here, '..', '..', '..')
export const FRONTEND_DIR    = process.env.FRONTEND_DIR ? resolve(process.env.FRONTEND_DIR) : resolve(REPO_ROOT, 'KRISHIVERSE')
export const BACKEND_DIR     = resolve(REPO_ROOT, 'backend')
export const EVAL_RESULTS_DIR = process.env.EVAL_RESULTS_DIR ? resolve(process.env.EVAL_RESULTS_DIR) : resolve(FRONTEND_DIR, 'eval', 'results')
export const MOBILE_AI_RESULTS_DIR = process.env.MOBILE_AI_RESULTS_DIR ? resolve(process.env.MOBILE_AI_RESULTS_DIR) : resolve(FRONTEND_DIR, 'eval', 'mobile-ai', 'results')
export const KB_MANIFEST_PATH = process.env.KB_MANIFEST_PATH ? resolve(process.env.KB_MANIFEST_PATH) : resolve(FRONTEND_DIR, 'src', 'data', 'kb', 'v2', 'manifest.json')
export const PILOT_CONFIG_PATH = process.env.PILOT_CONFIG_PATH ? resolve(process.env.PILOT_CONFIG_PATH) : resolve(FRONTEND_DIR, '.pilot-config.json')
export const BACKUP_DIR      = process.env.ADMIN_BACKUP_DIR ? resolve(process.env.ADMIN_BACKUP_DIR) : resolve(BACKEND_DIR, 'backups')

/** Critical, secret-free assets that get snapshotted by the backup service. */
export const CRITICAL_ASSETS = [
  'KRISHIVERSE/src/data/kb/v2/manifest.json',
  'KRISHIVERSE/.pilot-config.json',
  'KRISHIVERSE/package.json',
  'backend/package.json',
  'backend/.env.example',
  'eval/results/retrieval.json',
  'eval/results/safety.json',
  'eval/results/chatbot.json',
  'eval/results/grounding.json',
  'eval/results/multilingual.json',
  'eval/results/cropdoctor.json',
  'eval/results/joint-rag.json',
].map((relative) => ({
  relative,
  absolute: relative.startsWith('eval/')
    ? resolve(FRONTEND_DIR, relative)
    : resolve(REPO_ROOT, relative),
}))

export function fileExists(path) {
  try {
    return existsSync(path)
  } catch {
    return false
  }
}

/** Resolve a CRITICAL_ASSETS-relative path to its absolute source location. */
export function resolveAsset(relative) {
  return relative.startsWith('eval/')
    ? resolve(FRONTEND_DIR, relative)
    : resolve(REPO_ROOT, relative)
}

export function fileStat(path) {
  try {
    if (!existsSync(path)) return null
    const stat = statSync(path)
    return { bytes: stat.size, modifiedAt: stat.mtime.toISOString() }
  } catch {
    return null
  }
}
