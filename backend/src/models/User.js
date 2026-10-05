import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true, trim: true },
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role:     { type: String, enum: ['farmer', 'admin'], default: 'farmer' },
    language: { type: String, enum: ['ta', 'en', 'hi'], default: 'ta' },
    location: {
      district: { type: String },
      state:    { type: String, default: 'Tamil Nadu' },
    },
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