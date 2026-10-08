import { Router }                                    from 'express'
import { User }                                      from '../models/User.js'
import { signToken }                                 from '../services/jwt.js'
import { requireAuth }                               from '../middleware/auth.js'
import { validate, registerSchema, loginSchema,
  verifyRequestSchema, verifyConfirmSchema,
  forgotPasswordSchema, resetPasswordSchema }        from '../validators/schemas.js'
import { recordAudit }                               from '../admin/services/auditService.js'
import { emitAuthEvent }                             from '../services/authEvents.js'
import { beginAuthAttempt, enforceSendCooldown,
  clearAuthFailures }                               from '../middleware/authRateLimit.js'
import { sha256, generateCode, generateToken, constantTimeEqual,
  verificationTtlMs, verificationMaxAttempt, verificationCooldownMs,
  resetTtlMs, resetCooldownMs }                      from '../services/credentials.js'
import { deliver, canExposeSecret }                  from '../services/delivery.js'
import { serializeUser }                             from '../services/userSerializer.js'

export const authRouter = Router()

function httpError(status, code, message) {
  const err = new Error(message)
  err.status = status
  err.code   = code
  return err
}

function signFor(user) {
  return signToken({ id: user._id, email: user.email, role: user.role })
}

/**
 * Issue (or re-issue) an email verification code for a user.
 * Only a SHA-256 digest is persisted; the raw code leaves the process through
 * the delivery adapter (dev response body, or a future provider).
 * @returns {Promise<{ mode: string, code: string|null }>}
 */
async function issueVerificationCode(user) {
  const code = generateCode()
  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        'verification.codeHash':   sha256(code),
        'verification.expiresAt':  new Date(Date.now() + verificationTtlMs()),
        'verification.attempts':   0,
        'verification.lastSentAt': new Date(),
      },
    },
  )
  const { mode } = deliver({ channel: 'email', kind: 'verification', to: user.email })
  return { mode, code: canExposeSecret() ? code : null }
}

// POST /auth/register — account creation. The role is never accepted from the
// body (server-side default only), so a client cannot self-promote.
authRouter.post('/register', validate(registerSchema), async (req, res) => {
  const { name, email, password, language, location } = req.body
  const guard = beginAuthAttempt(req, 'signup', email)

  const existing = await User.findOne({ email })
  if (existing) {
    guard.fail()
    emitAuthEvent({ eventType: 'auth.signup_failure', outcome: 'error', req, language, errorCode: 'EMAIL_TAKEN' })
    recordAudit({ action: 'auth.register', target: email, result: 'failed', ip: req.ip, details: { reason: 'duplicate_email' } })
    throw httpError(409, 'EMAIL_TAKEN', 'Email already registered')
  }

  let user
  try {
    user = await User.create({ name, email, password, language, location })
  } catch (error) {
    guard.fail()
    if (error?.code === 11000) {
      emitAuthEvent({ eventType: 'auth.signup_failure', outcome: 'error', req, language, errorCode: 'EMAIL_TAKEN' })
      recordAudit({ action: 'auth.register', target: email, result: 'failed', ip: req.ip, details: { reason: 'duplicate_email' } })
      throw httpError(409, 'EMAIL_TAKEN', 'Email already registered')
    }
    throw error
  }

  guard.succeed()
  const issued  = await issueVerificationCode(user)
  const token   = signFor(user)

  emitAuthEvent({ eventType: 'auth.signup_success', outcome: 'success', req, language })
  recordAudit({ action: 'auth.register', target: email, result: 'allowed', actorId: user._id, actorRole: user.role, ip: req.ip })

  res.status(201).json({
    status:        'ok',
    token,
    user:          serializeUser(user),
    emailVerified: false,
    delivery:      issued.mode,
    // Non-production affordance only; never present when NODE_ENV=production.
    ...(issued.code ? { devCode: issued.code } : {}),
  })
})

// POST /auth/login — constant generic failure for unknown email vs bad password.
authRouter.post('/login', validate(loginSchema), async (req, res) => {
  const { email, password } = req.body
  const guard = beginAuthAttempt(req, 'login', email)

  const user = await User.findOne({ email }).select('+password')
  if (!user || !(await user.comparePassword(password))) {
    guard.fail()
    emitAuthEvent({
      eventType: 'auth.login_failure', outcome: 'error', req,
      errorCode: 'INVALID_CREDENTIALS',
      metadata:  { reason: user ? 'bad_password' : 'unknown_email' },
    })
    recordAudit({
      action: 'auth.login', target: email, result: 'failed', ip: req.ip,
      details: { reason: user ? 'bad_password' : 'unknown_email' },
    })
    throw httpError(401, 'INVALID_CREDENTIALS', 'Invalid email or password')
  }

  guard.succeed()
  const now = new Date()
  await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: now } })
  user.lastLoginAt = now

  emitAuthEvent({ eventType: 'auth.login_success', outcome: 'success', req, language: user.language })
  recordAudit({ action: 'auth.login', target: email, result: 'allowed', actorId: user._id, actorRole: user.role, ip: req.ip })

  res.json({ status: 'ok', token: signFor(user), user: serializeUser(user) })
})

// GET /auth/me — current identity (includes onboarding + profile context).
authRouter.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id)
  if (!user) throw httpError(404, 'USER_NOT_FOUND', 'User not found')
  res.json({ status: 'ok', user: serializeUser(user) })
})

// POST /auth/logout — the JWT itself is stateless and stays valid until expiry;
// the client discards it and the server records the intent for audit/telemetry.
authRouter.post('/logout', requireAuth, async (req, res) => {
  recordAudit({
    action: 'auth.logout', target: req.user.email, result: 'allowed',
    actorId: req.user.id, actorRole: req.user.role, ip: req.ip,
  })
  emitAuthEvent({ eventType: 'auth.logout', outcome: 'success', req })
  res.json({ status: 'ok', message: 'Signed out' })
})

// POST /auth/verify/request — enumeration-safe: always 200, no account detail.
authRouter.post('/verify/request', validate(verifyRequestSchema), async (req, res) => {
  const { email } = req.body
  const markSent  = enforceSendCooldown(req, 'verify', email, verificationCooldownMs())
  const user      = await User.findOne({ email }).select('+verification')

  let delivery = 'dev-response'
  let devCode  = null
  if (user && !user.emailVerifiedAt) {
    const issued = await issueVerificationCode(user)
    delivery     = issued.mode
    devCode      = issued.code
  }
  markSent()

  res.json({ status: 'ok', delivery, ...(devCode ? { devCode } : {}) })
})

// POST /auth/verify/confirm — attempts are counted before the lookup so an
// unknown address is throttled exactly like a real one.
authRouter.post('/verify/confirm', validate(verifyConfirmSchema), async (req, res) => {
  const { email, code } = req.body
  const guard = beginAuthAttempt(req, 'verify', email)
  const user  = await User.findOne({ email }).select('+verification')

  const reject = async () => {
    guard.fail()
    if (user?.verification?.codeHash) {
      await User.updateOne({ _id: user._id }, { $inc: { 'verification.attempts': 1 } }).catch(() => {})
    }
    emitAuthEvent({ eventType: 'auth.verification_failure', outcome: 'error', req, errorCode: 'INVALID_CODE' })
    recordAudit({ action: 'auth.verify', target: email, result: 'failed', ip: req.ip })
    throw httpError(400, 'INVALID_CODE', 'Invalid or expired code')
  }

  const record = user?.verification
  if (!user || !record?.codeHash) await reject()
  if (!record.expiresAt || record.expiresAt.getTime() < Date.now()) await reject()
  if ((record.attempts ?? 0) >= verificationMaxAttempt()) await reject()
  if (!constantTimeEqual(sha256(code), record.codeHash)) await reject()

  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        emailVerifiedAt:          new Date(),
        'verification.codeHash':  null,
        'verification.expiresAt': null,
        'verification.attempts':  0,
      },
    },
  )
  guard.succeed()

  emitAuthEvent({ eventType: 'auth.verification_success', outcome: 'success', req, language: user.language })
  recordAudit({ action: 'auth.verify', target: email, result: 'allowed', actorId: user._id, ip: req.ip })

  res.json({ status: 'ok', emailVerified: true })
})

// POST /auth/password/forgot — always 200 so the endpoint cannot be used to
// test which addresses are registered.
authRouter.post('/password/forgot', validate(forgotPasswordSchema), async (req, res) => {
  const { email } = req.body
  const markSent  = enforceSendCooldown(req, 'reset', email, resetCooldownMs())
  const user      = await User.findOne({ email }).select('+passwordReset')

  let delivery = 'dev-response'
  let devToken = null
  if (user) {
    const token = generateToken()
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          'passwordReset.tokenHash':  sha256(token),
          'passwordReset.expiresAt':  new Date(Date.now() + resetTtlMs()),
          'passwordReset.usedAt':     null,
          'passwordReset.lastSentAt': new Date(),
        },
      },
    )
    const result = deliver({ channel: 'email', kind: 'password_reset', to: user.email })
    delivery     = result.mode
    devToken     = canExposeSecret() ? token : null
  }
  markSent()

  recordAudit({ action: 'auth.reset_request', target: email, result: 'allowed', ip: req.ip })
  res.json({ status: 'ok', delivery, ...(devToken ? { devToken } : {}) })
})

// POST /auth/password/reset — one-time, expiring, hashed token.
authRouter.post('/password/reset', validate(resetPasswordSchema), async (req, res) => {
  const { token, password } = req.body
  const guard = beginAuthAttempt(req, 'reset')

  const user   = await User.findOne({ 'passwordReset.tokenHash': sha256(token) }).select('+passwordReset')
  const record = user?.passwordReset

  if (!user || !record || record.usedAt || !record.expiresAt || record.expiresAt.getTime() < Date.now()
      || !constantTimeEqual(sha256(token), record.tokenHash)) {
    guard.fail()
    recordAudit({ action: 'auth.reset_password', target: 'unknown', result: 'failed', ip: req.ip, details: { reason: 'invalid_token' } })
    throw httpError(400, 'INVALID_TOKEN', 'Invalid or expired reset link')
  }

  user.password = password
  user.passwordReset = {
    tokenHash:  null,
    expiresAt:  null,
    usedAt:     new Date(),
    lastSentAt: record.lastSentAt || null,
  }
  await user.save()

  guard.succeed()
  clearAuthFailures('login', user.email)

  emitAuthEvent({ eventType: 'auth.reset_success', outcome: 'success', req, language: user.language })
  recordAudit({ action: 'auth.reset_password', target: user.email, result: 'allowed', actorId: user._id, ip: req.ip })

  res.json({ status: 'ok', message: 'Password updated. You can now sign in.' })
})
