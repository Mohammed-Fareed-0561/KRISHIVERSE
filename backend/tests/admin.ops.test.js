import request from 'supertest'
import { expect } from 'chai'
import { existsSync, readFileSync, mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { setupTestApp, teardownTestApp, clearDatabase } from './helpers/db.js'
import { User } from '../src/models/User.js'
import { signToken } from '../src/services/jwt.js'
import { BACKUP_DIR, REPO_ROOT } from '../src/admin/paths.js'

async function tokenFor(role) {
  const user = await User.create({ name: role, email: `${role}@example.com`, password: 'secret123', role })
  return signToken({ id: user._id, email: user.email, role })
}

describe('Admin operations (backup, restore, audit, registries)', () => {
  let app
  let superadmin
  let admin
  let viewer

  before(async () => { app = await setupTestApp() })
  after(async () => { await teardownTestApp() })
  beforeEach(async () => {
    await clearDatabase()
    superadmin = await tokenFor('superadmin')
    admin = await tokenFor('admin')
    viewer = await tokenFor('viewer')
  })

  const get = (path, token) => request(app).get(path).set('Authorization', `Bearer ${token}`)
  const post = (path, token, body = {}) => request(app).post(path).set('Authorization', `Bearer ${token}`).send(body)

  it('section 12: creates a backup of secret-free critical assets', async () => {
    const res = await post('/api/admin/backups', admin)
    expect(res.status).to.equal(201)
    expect(res.body.backup.assetCount).to.be.greaterThan(0)
    expect(res.body.backup.status).to.equal('complete')

    const paths = res.body.backup.assets.map((asset) => asset.path)
    expect(paths.some((path) => path.includes('manifest.json'))).to.equal(true)
    expect(paths.join(' ')).to.not.contain('.env"')
    for (const asset of res.body.backup.assets) {
      expect(asset.sha256).to.match(/^[a-f0-9]{64}$/)
      const onDisk = join(BACKUP_DIR, res.body.backup.backupId, 'assets', asset.path.split('/').join('\\'))
      expect(existsSync(onDisk), asset.path).to.equal(true)
    }

    const list = await get('/api/admin/backups', viewer)
    expect(list.body.backups).to.have.length(1)
    expect(list.body.backups[0].backupId).to.equal(res.body.backup.backupId)
  })

  it('section 12: verifies a backup against the current files', async () => {
    const created = await post('/api/admin/backups', admin)
    const backupId = created.body.backup.backupId

    const clean = await get(`/api/admin/backups/${backupId}/verify`, admin)
    expect(clean.status).to.equal(200)
    expect(clean.body.report.changed, 'no drift right after backup').to.equal(0)

    const missing = await get('/api/admin/backups/bk_missing/verify', admin)
    expect(missing.status).to.equal(404)
  })

  it('section 12: refuses a restore without explicit confirmation', async () => {
    const created = await post('/api/admin/backups', admin)
    const backupId = created.body.backup.backupId

    const noConfirm = await post(`/api/admin/backups/${backupId}/restore`, superadmin, {})
    expect(noConfirm.status).to.equal(400)
    expect(noConfirm.body.code).to.equal('confirm_required')
  })

  it('section 12: performs a real restore drill into a scratch directory', async () => {
    const created = await post('/api/admin/backups', admin)
    const backupId = created.body.backup.backupId

    const drill = await post(`/api/admin/backups/${backupId}/restore`, superadmin, { confirm: true })
    expect(drill.status).to.equal(200)
    expect(drill.body.drill.ok).to.equal(true)
    expect(drill.body.drill.restored).to.equal(drill.body.drill.total)
    expect(drill.body.drill.targetDir).to.contain(BACKUP_DIR)

    for (const item of drill.body.drill.results) {
      expect(item.status, item.path).to.equal('restored')
    }

    const restoredFile = join(drill.body.drill.targetDir, 'assets', 'KRISHIVERSE', 'package.json')
    expect(existsSync(restoredFile)).to.equal(true)
    const original = JSON.parse(readFileSync(join(REPO_ROOT, 'KRISHIVERSE', 'package.json'), 'utf8'))
    const restored = JSON.parse(readFileSync(restoredFile, 'utf8'))
    expect(restored.name).to.equal(original.name)

    const list = await get('/api/admin/backups', viewer)
    expect(list.body.backups[0].restores).to.have.length(1)
    expect(list.body.backups[0].restores[0].ok).to.equal(true)
  })

  it('section 12: blocks restores outside the backup area without explicit authorization', async () => {
    const created = await post('/api/admin/backups', admin)
    const backupId = created.body.backup.backupId
    const outside = mkdtempSync(join(tmpdir(), 'kv-restore-'))

    const res = await post(`/api/admin/backups/${backupId}/restore`, superadmin, { confirm: true, targetDir: outside })
    expect(res.status).to.equal(403)
    expect(res.body.code).to.equal('restore_not_authorized')
  })

  it('section 14: audit entries are append-only and include denials', async () => {
    await post('/api/admin/backups', admin)
    await get('/api/admin/audit', viewer).expect(403)

    const entries = await get('/api/admin/audit', superadmin)
    expect(entries.status).to.equal(200)
    const actions = entries.body.entries.map((entry) => entry.action)
    expect(actions).to.include('backup.create')
    expect(actions).to.include('admin.access')

    const summary = await get('/api/admin/audit/summary', superadmin)
    expect(summary.body.summary.byResult.allowed).to.be.greaterThan(0)
    expect(summary.body.summary.byResult.denied).to.be.greaterThan(0)
    expect(summary.body.summary.retention).to.contain('append-only')

    expect(entries.body.entries[0]).to.not.have.property('password')
    for (const entry of entries.body.entries) {
      expect(entry).to.not.have.property('ip')
      if (entry.ipPrefix) expect(entry.ipPrefix).to.match(/x\.x$|::x$/)
    }
  })

  it('section 15: dataset registry lists evaluation datasets with labels', async () => {
    const res = await get('/api/admin/registry/datasets', viewer)
    expect(res.status).to.equal(200)
    const names = res.body.datasets.map((dataset) => dataset.name)
    expect(names).to.include('retrieval')
    expect(names).to.include('knowledge-base')
    expect(names).to.include('expert-labelled-field-dataset')
    const retrieval = res.body.datasets.find((dataset) => dataset.name === 'retrieval')
    if (retrieval.available) expect(retrieval.label).to.contain('NOT LIVE FARMER ACCURACY')
  })

  it('section 15: model and dependency registries respond', async () => {
    const models = await get('/api/admin/registry/models', viewer)
    expect(models.status).to.equal(200)
    expect(models.body.providers.length).to.be.greaterThan(0)
    expect(models.body.providers.map((provider) => provider.name)).to.include('groq')

    const deps = await get('/api/admin/registry/dependencies', viewer)
    expect(deps.status).to.equal(200)
    expect(deps.body.dependencies.map((dep) => dep.name)).to.include('mongodb')
  })

  it('section 15: operator registry entries are audited', async () => {
    const res = await post('/api/admin/registry', admin, {
      kind: 'dataset', key: 'field-pilot-2026', name: 'Field pilot photos', origin: 'operator registered',
    })
    expect(res.status).to.equal(201)

    const datasets = await get('/api/admin/registry/datasets', viewer)
    expect(datasets.body.datasets.map((dataset) => dataset.name)).to.include('field-pilot-2026')

    const audit = await get('/api/admin/audit', superadmin)
    expect(audit.body.entries.map((entry) => entry.action)).to.include('registry.upsert')

    const badKind = await post('/api/admin/registry', admin, { kind: 'weapon', key: 'x' })
    expect(badKind.status).to.equal(500)
  })

  it('section 13/16: version, change history, and config history endpoints', async () => {
    const versions = await get('/api/admin/versions', viewer)
    expect(versions.status).to.equal(200)
    expect(versions.body.build).to.have.property('backend')
    expect(versions.body.git).to.have.property('available')
    expect(versions.body).to.have.property('policy')

    const changes = await get('/api/admin/versions/changes?limit=5', viewer)
    expect(changes.status).to.equal(200)
    expect(Array.isArray(changes.body.entries)).to.equal(true)

    const kbChanges = await get('/api/admin/versions/kb-changes', viewer)
    expect(kbChanges.status).to.equal(200)
    expect(kbChanges.body.current).to.have.property('available')

    const config = await get('/api/admin/versions/config-history', viewer)
    expect(config.status).to.equal(200)
    expect(config.body.note).to.contain('never snapshotted')
  })

  it('section 17: incident lifecycle', async () => {
    const created = await post('/api/admin/incidents', admin, {
      title: 'Telemetry ingestion spike', severity: 'sev2', summary: 'rejection rate above threshold',
    })
    expect(created.status).to.equal(201)
    expect(created.body.incident.incidentId).to.match(/^INC-\d{4}$/)

    const patched = await request(app)
      .patch(`/api/admin/incidents/${created.body.incident.incidentId}`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ status: 'resolved', note: 'bad client build rolled forward' })
    expect(patched.status).to.equal(200)
    expect(patched.body.incident.status).to.equal('resolved')
    expect(patched.body.incident.closedAt).to.not.equal(null)
    expect(patched.body.incident.timeline).to.have.length(2)

    const list = await get('/api/admin/incidents', viewer)
    expect(list.body.summary.resolved || list.body.incidents[0].status).to.equal('resolved')

    const badSeverity = await post('/api/admin/incidents', admin, { title: 'x', severity: 'sev9' })
    expect(badSeverity.status).to.equal(400)
  })

  it('viewer cannot create backups or incidents', async () => {
    expect((await post('/api/admin/backups', viewer)).status).to.equal(403)
    expect((await post('/api/admin/incidents', viewer, { title: 'x', severity: 'sev3' })).status).to.equal(403)
  })
})
