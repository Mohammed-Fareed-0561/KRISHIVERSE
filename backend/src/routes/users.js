import { Router } from 'express'
import Joi from 'joi'
import { requireAuth } from '../middleware/auth.js'
import { User } from '../models/User.js'
import { serializeUser } from '../services/userSerializer.js'
import { emitAuthEvent } from '../services/authEvents.js'
import { recordAudit } from '../admin/services/auditService.js'

export const usersRouter = Router()

const MAX_SYNC_BATCH = 10

const profileSchema = Joi.object({
  name:            Joi.string().trim().min(2).max(60).optional(),
  language:        Joi.string().valid('ta', 'en', 'hi', 'tanglish').optional(),
  location:        Joi.object({
    district: Joi.string().max(60),
    state:    Joi.string().default('Tamil Nadu'),
  }).optional(),
  village:         Joi.string().trim().max(80).allow('').optional(),
  crops:           Joi.array().items(Joi.string().trim().max(60)).max(12).optional(),
  farmSize:        Joi.object({
    value: Joi.number().min(0).max(100000),
    unit:  Joi.string().valid('acre', 'hectare').default('acre'),
  }).optional(),
  irrigation:      Joi.string().valid('well', 'borewell', 'canal', 'drip', 'sprinkler', 'rainfed', 'other').optional(),
  experienceYears: Joi.number().integer().min(0).max(80).optional(),
  notifications:   Joi.object({
    sms:  Joi.boolean(),
    push: Joi.boolean(),
  }).optional(),
  unitPrefs:       Joi.object({
    area:        Joi.string().valid('acre', 'hectare'),
    temperature: Joi.string().valid('c', 'f'),
  }).optional(),
})

const onboardingProgressSchema = Joi.object({
  step:   Joi.number().integer().min(0).max(6).required(),
  status: Joi.string().valid('in_progress', 'completed', 'abandoned').optional(),
})

const onboardingSchema = Joi.object({
  step:    Joi.number().integer().min(0).max(6).required(),
  status:  Joi.string().valid('in_progress', 'completed', 'abandoned').optional(),
  profile: profileSchema.optional(),
})

const syncSchema = Joi.object({
  batch: Joi.array().items(Joi.object({
    baseRevision: Joi.number().integer().min(0).optional(),
    profile:      profileSchema.required(),
    onboarding:   onboardingProgressSchema.optional(),
  })).min(1).max(MAX_SYNC_BATCH).required(),
})

function parse(schema, payload) {
  const { error, value } = schema.validate(payload, { abortEarly: false, stripUnknown: true })
  if (error) {
    const err = new Error(error.details.map((d) => d.message).join('; '))
    err.status = 400
    err.code   = 'VALIDATION_ERROR'
    throw err
  }
  return value
}

async function loadUser(id) {
  const user = await User.findById(id)
  if (!user) {
    const err = new Error('User not found')
    err.status = 404
    err.code   = 'USER_NOT_FOUND'
    throw err
  }
  return user
}

/**
 * Apply wizard progress to a user document (in memory — caller saves).
 * Progress is monotonic per write: a lower step never rolls a finished farmer
 * backwards, and `status` drives the abandonment / completion timestamps.
 * @returns {boolean} true when this call is the one that completed onboarding
 */
function applyOnboardingUpdate(user, { step, status } = {}) {
  const now     = new Date()
  const wasDone = Boolean(user.get('onboarding.completedAt'))

  user.set('onboarding.step', step)
  if (step > 0 && !user.get('onboarding.startedAt')) user.set('onboarding.startedAt', now)
  user.set('onboarding.abandonedAt', status === 'abandoned' ? now : null)
  if (status === 'completed' || step >= 6) {
    if (!wasDone) user.set('onboarding.completedAt', now)
  } else {
    user.set('onboarding.completedAt', null)
  }
  return !wasDone && Boolean(user.get('onboarding.completedAt'))
}

/** Completion is a milestone: telemetry for the dashboard, audit for the trail. */
function emitOnboardingCompleted(user, req, source) {
  emitAuthEvent({
    eventType: 'onboarding.completed',
    feature:   'onboarding',
    outcome:   'success',
    req,
    language:  user.language,
    metadata:  { source },
  })
  recordAudit({
    action: 'onboarding.complete', target: user.email, result: 'allowed',
    actorId: user._id, actorRole: user.role, ip: req.ip,
  })
}

// GET /users/profile
usersRouter.get('/profile', requireAuth, async (req, res) => {
  const user = await loadUser(req.user.id)
  res.json({ status: 'ok', user: serializeUser(user) })
})

// PUT /users/profile — normal online write. Unknown fields are stripped, so
// role / email / verification state can never be set from the client.
usersRouter.put('/profile', requireAuth, async (req, res) => {
  const value = parse(profileSchema, req.body)
  const user  = await loadUser(req.user.id)

  user.set(value)
  user.profileRevision = (user.profileRevision || 1) + 1
  await user.save()

  res.json({ status: 'ok', user: serializeUser(user) })
})

/**
 * POST /users/profile/sync — offline-first profile outbox.
 *
 * Deterministic conflict rule: server-wins-if-newer.
 *   baseRevision >= server revision → the client edits a current copy → apply.
 *   baseRevision <  server revision → the server already moved on → keep the
 *     server copy and report `conflict` (the client re-syncs from the server).
 * Nothing is ever blindly overwritten, and the loser of a race is always the
 * stale writer, never the fresher data.
 */
usersRouter.post('/profile/sync', requireAuth, async (req, res) => {
  const { batch } = parse(syncSchema, req.body)
  const user      = await loadUser(req.user.id)
  const results   = []
  let justCompleted = false
  let onboardingTouched = false

  for (const entry of batch) {
    const base = entry.baseRevision ?? 0
    if (base < (user.profileRevision || 1)) {
      results.push({ status: 'conflict', serverRevision: user.profileRevision })
      continue
    }
    user.set(entry.profile)
    user.profileRevision = (user.profileRevision || 1) + 1

    // Offline onboarding progress rides the same outbox. Progress is
    // monotonic: a stale step can never undo a later one.
    if (entry.onboarding && entry.onboarding.step >= (user.get('onboarding.step') || 0)) {
      if (applyOnboardingUpdate(user, entry.onboarding)) justCompleted = true
      onboardingTouched = true
    }
    results.push({ status: 'applied', serverRevision: user.profileRevision })
  }

  if (results.some((r) => r.status === 'applied')) await user.save()

  if (onboardingTouched) {
    emitAuthEvent({
      eventType: 'onboarding.step_completed',
      feature:   'onboarding',
      outcome:   'success',
      req,
      language:  user.language,
      metadata:  { step: user.get('onboarding.step'), source: 'sync' },
    })
  }
  if (justCompleted) emitOnboardingCompleted(user, req, 'sync')

  res.json({ status: 'ok', results, user: serializeUser(user) })
})

/**
 * PUT /users/onboarding — wizard progress plus (optionally) the profile fields
 * collected by the current step, saved in one atomic write.
 */
usersRouter.put('/onboarding', requireAuth, async (req, res) => {
  const value = parse(onboardingSchema, req.body)
  const user  = await loadUser(req.user.id)

  if (value.profile) {
    user.set(value.profile)
    user.profileRevision = (user.profileRevision || 1) + 1
  }
  const justCompleted = applyOnboardingUpdate(user, value)

  await user.save()

  emitAuthEvent({
    eventType: 'onboarding.step_completed',
    feature:   'onboarding',
    outcome:   'success',
    req,
    language:  user.language,
    metadata:  { step: value.step },
  })
  if (justCompleted) emitOnboardingCompleted(user, req, 'wizard')

  res.json({ status: 'ok', user: serializeUser(user) })
})
