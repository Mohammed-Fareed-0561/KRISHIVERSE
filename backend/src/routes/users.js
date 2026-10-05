import { Router } from 'express'
import Joi from 'joi'
import { requireAuth } from '../middleware/auth.js'
import { User } from '../models/User.js'

export const usersRouter = Router()

const profileSchema = Joi.object({
  name:     Joi.string().trim().min(2).max(60).optional(),
  language: Joi.string().valid('ta', 'en', 'hi').optional(),
  location: Joi.object({
    district: Joi.string().max(60),
    state:    Joi.string().default('Tamil Nadu'),
  }).optional(),
})

function serialize(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    language: user.language,
    location: user.location,
  }
}

// GET /users/profile
usersRouter.get('/profile', requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id)
  if (!user) {
    const err = new Error('User not found')
    err.status = 404
    err.code = 'USER_NOT_FOUND'
    throw err
  }
  res.json({ status: 'ok', user: serialize(user) })
})

// PUT /users/profile
usersRouter.put('/profile', requireAuth, async (req, res) => {
  const { error, value } = profileSchema.validate(req.body, { abortEarly: false, stripUnknown: true })
  if (error) {
    const err = new Error(error.details.map((d) => d.message).join('; '))
    err.status = 400
    err.code = 'VALIDATION_ERROR'
    throw err
  }

  const user = await User.findByIdAndUpdate(req.user.id, { $set: value }, { new: true })
  if (!user) {
    const err = new Error('User not found')
    err.status = 404
    err.code = 'USER_NOT_FOUND'
    throw err
  }
  res.json({ status: 'ok', user: serialize(user) })
})