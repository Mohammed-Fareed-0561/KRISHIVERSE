import mongoose from 'mongoose'
import { getHealth } from './telemetryService.js'
import { snapshot } from '../metrics/requestCollector.js'
import { dependencyMap, kbVersion, gitInfo, buildInfo } from './versionService.js'
import { readinessScorecard } from './readinessService.js'

const DB_STATES = {
  0: { label: 'disconnected', ok: false },
  1: { label: 'connected', ok: true },
  2: { label: 'connecting', ok: false },
  3: { label: 'disconnecting', ok: false },
}

/**
 * Section 1 — system health. Every block is independent: if one subsystem
 * fails to report, the others still render and the failure is surfaced.
 */
export async function systemHealth() {
  const blocks = {}

  blocks.uptime = {
    status: 'ok',
    seconds: Math.round(process.uptime()),
    since: new Date(Date.now() - process.uptime() * 1000).toISOString(),
  }

  blocks.process = {
    status: 'ok',
    node: process.version,
    pid: process.pid,
    memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    environment: process.env.NODE_ENV || 'development',
  }

  try {
    blocks.api = { status: 'ok', ...snapshot() }
  } catch (error) {
    blocks.api = { status: 'unavailable', reason: error?.message || 'collector failed' }
  }

  const dbState = DB_STATES[mongoose.connection.readyState] || { label: 'unknown', ok: false }
  blocks.database = {
    status: dbState.ok ? 'ok' : 'degraded',
    label: dbState.label,
    name: mongoose.connection.name || null,
    note: dbState.ok ? undefined : 'Telemetry and audit writes are failing while the database is down.',
  }

  try {
    blocks.telemetry = await getHealth()
    blocks.telemetry.status = blocks.telemetry.status === 'healthy' ? 'ok' : blocks.telemetry.status
  } catch (error) {
    blocks.telemetry = { status: 'unavailable', reason: error?.message || 'telemetry health failed' }
  }

  try {
    blocks.dependencies = { status: 'ok', ...(await dependencyMap()) }
  } catch (error) {
    blocks.dependencies = { status: 'unavailable', reason: error?.message || 'dependency map failed' }
  }

  try {
    blocks.versions = { status: 'ok', git: gitInfo(), build: buildInfo(), kb: kbVersion() }
  } catch (error) {
    blocks.versions = { status: 'unavailable', reason: error?.message || 'version probe failed' }
  }

  try {
    const card = await readinessScorecard()
    blocks.readiness = {
      status: card.status,
      scorePct: card.scorePct,
      failing: card.failingChecks.map((item) => item.name),
      warnings: card.warningChecks.map((item) => item.name),
    }
  } catch (error) {
    blocks.readiness = { status: 'unavailable', reason: error?.message || 'scorecard failed' }
  }

  const statuses = Object.values(blocks).map((block) => block.status)
  const status = statuses.includes('degraded') || statuses.includes('unavailable')
    ? 'degraded'
    : 'healthy'

  return {
    generatedAt: new Date().toISOString(),
    status,
    blocks,
    monitoringPipeline: {
      collector: 'in-process rolling window (5 000 observations, resets on restart)',
      persistence: dbState.ok ? 'mongodb telemetry events' : 'failing — mongodb disconnected',
      ingestion: blocks.telemetry.status,
      sampling: process.env.TELEMETRY_SAMPLE_RATE || '0.25 (failures always kept)',
      isolation: 'Telemetry is fire-and-forget; a monitoring failure never changes a farmer response.',
    },
  }
}
