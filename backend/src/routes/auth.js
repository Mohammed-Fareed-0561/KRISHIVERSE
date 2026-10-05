import { Router }                              from 'express'
import { User }                                from '../models/User.js'
import { signToken }                           from '../services/jwt.js'
import { requireAuth }                         from '../middleware/auth.js'
import { validate, registerSchema, loginSchema } from '../validators/schemas.js'
 
export const authRouter = Router()
 
// POST /auth/register
authRouter.post('/register', validate(registerSchema), async (req, res) => {
  const { name, email, password, language, location } = req.body
 
  const existing = await User.findOne({ email })
  if (existing) {
    const err = new Error('Email already registered')
    err.status = 409
    throw err
  }
 
  const user  = await User.create({ name, email, password, language, location })
  const token = signToken({ id: user._id, email: user.email, role: user.role })
 
  res.status(201).json({
    status: 'ok',
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role, language: user.language },
  })
})
 
// POST /auth/login
authRouter.post('/login', validate(loginSchema), async (req, res) => {
  const { email, password } = req.body
 
  const user = await User.findOne({ email }).select('+password')
  if (!user || !(await user.comparePassword(password))) {
    const err = new Error('Invalid email or password')
    err.status = 401
    throw err
  }
 
  const token = signToken({ id: user._id, email: user.email, role: user.role })
 
  res.json({
    status: 'ok',
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role, language: user.language },
  })
})
 
// GET /auth/me  (requires token)
authRouter.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id)
  if (!user) {
    const err = new Error('User not found')
    err.status = 404
    throw err
  }
  res.json({
    status: 'ok',
    user: { id: user._id, name: user.name, email: user.email, role: user.role, language: user.language, location: user.location },
  })
})
 