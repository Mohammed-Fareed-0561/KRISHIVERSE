import request from 'supertest'
import { expect } from 'chai'
import { setupTestApp, teardownTestApp } from './helpers/db.js'
import { countSyncRecords } from '../src/services/syncStore.js'

describe('Sync API', () => {
  let app

  before(async () => {
    app = await setupTestApp()
  })

  after(async () => {
    await teardownTestApp()
  })

  describe('POST /api/v1/advisory/sync', () => {
    it('rejects an empty batch with 400', async () => {
      const res = await request(app)
        .post('/api/v1/advisory/sync')
        .send({ batch: [] })

      expect(res.status).to.equal(400)
      expect(res.body.code).to.equal('VALIDATION_ERROR')
    })

    it('stores an upsert batch and reports counts', async () => {
      const before = countSyncRecords()
      const res = await request(app)
        .post('/api/v1/advisory/sync')
        .send({
          batch: [
            {
              id: 'sync-1',
              storeName: 'diseaseDiagnoses',
              operation: 'upsert',
              revision: 2,
              payload: { id: 'diag-1', cropType: 'tomato', diagnosis: 'Late Blight', savedAt: Date.now() },
            },
            {
              id: 'sync-2',
              storeName: 'diseaseDiagnoses',
              operation: 'delete',
              payload: { id: 'diag-2' },
            },
          ],
        })

      expect(res.status).to.equal(200)
      expect(res.body.status).to.equal('ok')
      expect(res.body.upserted).to.equal(1)
      expect(res.body.deleted).to.equal(1)
      expect(countSyncRecords()).to.equal(before + 1)
    })

    it('is idempotent on re-sync (upsert does not duplicate)', async () => {
      const before = countSyncRecords()
      const entry = {
        id: 'sync-3',
        storeName: 'diseaseDiagnoses',
        operation: 'upsert',
        revision: 3,
        payload: { id: 'diag-3', diagnosis: 'Early Blight', savedAt: Date.now() },
      }

      const first = await request(app).post('/api/v1/advisory/sync').send({ batch: [entry] })
      const second = await request(app).post('/api/v1/advisory/sync').send({ batch: [entry] })

      expect(first.body.upserted).to.equal(1)
      expect(second.body.upserted).to.equal(1)
      expect(countSyncRecords()).to.equal(before + 1)
    })
  })
})