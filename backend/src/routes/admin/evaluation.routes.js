import { Router } from 'express'
import { evaluationDashboard, evaluationDataset } from '../../admin/services/evaluationService.js'

export const evaluationRoutes = Router()

evaluationRoutes.get('/', (_req, res) => {
  res.json(evaluationDashboard())
})

evaluationRoutes.get('/:dataset', (req, res) => {
  const dataset = evaluationDataset(req.params.dataset)
  if (!dataset.available && dataset.reason?.startsWith('Unknown dataset')) {
    return res.status(404).json({ status: 'error', code: 'unknown_dataset', message: dataset.reason })
  }
  return res.json(dataset)
})
