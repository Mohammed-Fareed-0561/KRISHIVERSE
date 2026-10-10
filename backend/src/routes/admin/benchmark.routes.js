import { Router } from 'express'
import { benchmarkDashboard, benchmarkResult, BENCHMARK_NAMES } from '../../admin/services/benchmarkService.js'

export const benchmarkRoutes = Router()

benchmarkRoutes.get('/', (_req, res) => {
  res.json(benchmarkDashboard())
})

benchmarkRoutes.get('/:name', (req, res) => {
  const result = benchmarkResult(req.params.name)
  if (!result.available && !BENCHMARK_NAMES.includes(req.params.name)) {
    return res.status(404).json({ status: 'error', code: 'unknown_benchmark', message: result.reason })
  }
  return res.json(result)
})
