import mongoose from 'mongoose'

const { Schema, model, models } = mongoose

const telemetryEventSchema = new Schema({
  eventId:     { type: String, required: true, unique: true },
  schemaVersion: { type: Number, required: true },
  eventType:   { type: String, required: true, index: true },
  occurredAt:  { type: Date, required: true, index: true },
  receivedAt:  { type: Date, required: true, default: Date.now },
  sessionId:   { type: String, required: true, index: true },
  requestId:   { type: String },
  feature:     { type: String, index: true },
  intent:      { type: String },
  language:    { type: String },
  outcome:     { type: String, index: true },
  latencyMs:   { type: Number },
  errorCode:   { type: String },
  connectivity: { type: String },
  source:      { type: Object },
  retrieval:   { type: Object },
  model:       { type: Object },
  safety:      { type: Object },
  experiment:  { type: Object },
  metadata:    { type: Object },
}, { minimize: false })

telemetryEventSchema.index({ eventType: 1, occurredAt: -1 })
telemetryEventSchema.index({ feature: 1, occurredAt: -1 })

const telemetryHealthSchema = new Schema({
  key:              { type: String, default: 'telemetry', unique: true },
  totalAccepted:    { type: Number, default: 0 },
  totalRejected:    { type: Number, default: 0 },
  totalDuplicates:  { type: Number, default: 0 },
  rejectedByReason: { type: Object, default: {} },
  lastEventAt:      { type: Date },
  lastRejectedAt:   { type: Date },
  updatedAt:        { type: Date, default: Date.now },
})

const auditLogSchema = new Schema({
  at:        { type: Date, required: true, default: Date.now, index: true },
  actorId:   { type: String, index: true },
  actorRole: { type: String },
  actorLabel:{ type: String },
  action:    { type: String, required: true, index: true },
  target:    { type: String },
  result:    { type: String, enum: ['allowed', 'denied', 'failed'], required: true },
  requestId: { type: String },
  ipPrefix:  { type: String },
  details:   { type: Object },
})

const adminErrorSchema = new Schema({
  at:        { type: Date, required: true, default: Date.now, index: true },
  severity:  { type: String, enum: ['info', 'warning', 'error', 'critical'], default: 'error' },
  code:      { type: String, index: true },
  scope:     { type: String, enum: ['admin', 'farmer-api', 'telemetry', 'frontend'], required: true },
  route:     { type: String },
  method:    { type: String },
  message:   { type: String },
  requestId: { type: String },
  context:   { type: Object },
})

const incidentSchema = new Schema({
  incidentId:  { type: String, required: true, unique: true },
  title:       { type: String, required: true },
  severity:    { type: String, enum: ['sev1', 'sev2', 'sev3'], required: true },
  status:      { type: String, enum: ['open', 'mitigated', 'resolved'], default: 'open', index: true },
  openedAt:    { type: Date, required: true, default: Date.now },
  closedAt:    { type: Date },
  commander:   { type: String },
  summary:     { type: String },
  impact:      { type: String },
  timeline:    { type: [{ at: Date, note: String, actor: String }], default: [] },
  relatedErrorCode: { type: String },
})

const registryEntrySchema = new Schema({
  kind:      { type: String, enum: ['dataset', 'model', 'kbChange', 'configChange', 'release', 'dependency', 'safetyReview'], required: true, index: true },
  key:       { type: String, required: true, index: true },
  name:      { type: String },
  version:   { type: String },
  status:    { type: String, default: 'active' },
  origin:    { type: String },
  verified:  { type: Boolean },
  meta:      { type: Object },
  updatedAt: { type: Date, default: Date.now },
}, { minimize: false })

registryEntrySchema.index({ kind: 1, key: 1 }, { unique: true })

const backupMetaSchema = new Schema({
  backupId:   { type: String, required: true, unique: true },
  createdAt:  { type: Date, required: true, default: Date.now, index: true },
  createdBy:  { type: String },
  status:     { type: String, enum: ['complete', 'failed'], default: 'complete' },
  dir:        { type: String },
  assets:     { type: [{ path: String, sha256: String, bytes: Number }], default: [] },
  gitCommit:  { type: String },
  kbVersion:  { type: String },
  restores:   { type: [{ at: Date, actor: String, targetDir: String, ok: Boolean, note: String }], default: [] },
})

export const TelemetryEvent = models.TelemetryEvent || model('TelemetryEvent', telemetryEventSchema)
export const TelemetryHealth = models.TelemetryHealth || model('TelemetryHealth', telemetryHealthSchema)
export const AuditLog        = models.AuditLog        || model('AuditLog', auditLogSchema)
export const AdminError      = models.AdminError      || model('AdminError', adminErrorSchema)
export const Incident        = models.Incident        || model('Incident', incidentSchema)
export const RegistryEntry   = models.RegistryEntry   || model('RegistryEntry', registryEntrySchema)
export const BackupMeta      = models.BackupMeta      || model('BackupMeta', backupMetaSchema)
