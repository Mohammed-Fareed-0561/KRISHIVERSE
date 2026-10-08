import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const MAX_CROPS        = 12
const MAX_CROP_LABEL   = 60

// Secret-bearing subdocuments: never selected unless a route explicitly asks
// for `+verification` / `+passwordReset`, so they can never leak via a plain
// query or a careless serialization.
const verificationSchema = new mongoose.Schema(
  {
    codeHash:   { type: String },
    expiresAt:  { type: Date },
    attempts:   { type: Number, default: 0 },
    lastSentAt: { type: Date },
  },
  { _id: false },
)

const passwordResetSchema = new mongoose.Schema(
  {
    tokenHash:  { type: String },
    expiresAt:  { type: Date },
    usedAt:     { type: Date },
    lastSentAt: { type: Date },
  },
  { _id: false },
)

const userSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true, trim: true },
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role:     { type: String, enum: ['farmer', 'viewer', 'auditor', 'admin', 'superadmin'], default: 'farmer' },
    language: { type: String, enum: ['ta', 'en', 'hi', 'tanglish'], default: 'ta' },
    location: {
      district: { type: String },
      state:    { type: String, default: 'Tamil Nadu' },
    },

    // ── Account verification ────────────────────────────────────────────────
    // Verification never blocks login: a pilot farmer must always be able to
    // sign in and use the offline-first app while delivery is being wired up.
    emailVerifiedAt: { type: Date, default: null },
    verification:    { type: verificationSchema, select: false, default: undefined },

    // ── Password reset ──────────────────────────────────────────────────────
    passwordReset: { type: passwordResetSchema, select: false, default: undefined },

    lastLoginAt: { type: Date, default: null },

    // ── Pilot profile (context only — never AI evidence) ────────────────────
    village: { type: String, trim: true },
    crops: {
      type: [String],
      default: [],
      validate: {
        validator: (list) => Array.isArray(list) && list.length <= MAX_CROPS
          && list.every((crop) => typeof crop === 'string' && crop.length <= MAX_CROP_LABEL),
        message: `crops must be at most ${MAX_CROPS} entries of <= ${MAX_CROP_LABEL} characters`,
      },
    },
    farmSize: {
      value: { type: Number, min: 0 },
      unit:  { type: String, enum: ['acre', 'hectare'], default: 'acre' },
    },
    irrigation: {
      type: String,
      enum: ['well', 'borewell', 'canal', 'drip', 'sprinkler', 'rainfed', 'other'],
    },
    experienceYears: { type: Number, min: 0, max: 80 },
    notifications: {
      sms:  { type: Boolean, default: true },
      push: { type: Boolean, default: true },
    },
    unitPrefs: {
      area:        { type: String, enum: ['acre', 'hectare'], default: 'acre' },
      temperature: { type: String, enum: ['c', 'f'], default: 'c' },
    },

    // ── Onboarding progress ─────────────────────────────────────────────────
    onboarding: {
      step:        { type: Number, min: 0, max: 6, default: 0 },
      startedAt:   { type: Date, default: null },
      completedAt: { type: Date, default: null },
      abandonedAt: { type: Date, default: null },
    },

    // Monotonic revision used by the offline profile outbox (server-wins-if-newer).
    profileRevision: { type: Number, default: 1, min: 1 },
  },
  { timestamps: true },
)

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 12)
  next()
})

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password)
}

export const User = mongoose.model('User', userSchema)
