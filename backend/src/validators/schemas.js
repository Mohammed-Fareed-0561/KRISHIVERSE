import Joi from 'joi'
 
// ─── Reusable helper ──────────────────────────────────────────────────────────
export function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true })
    if (error) {
      const err = new Error(error.details.map(d => d.message).join('; '))
      err.status = 400
      err.code   = 'VALIDATION_ERROR'
      return next(err)
    }
    req.body = value
    next()
  }
}
 
// ─── Auth schemas ─────────────────────────────────────────────────────────────
export const registerSchema = Joi.object({
  name:     Joi.string().trim().min(2).max(60).required(),
  email:    Joi.string().email().lowercase().required(),
  password: Joi.string().min(6).max(100).required(),
  language: Joi.string().valid('ta', 'en', 'hi').default('ta'),
  location: Joi.object({
    district: Joi.string().max(60),
    state:    Joi.string().default('Tamil Nadu'),
  }).optional(),
})
 
export const loginSchema = Joi.object({
  email:    Joi.string().email().lowercase().required(),
  password: Joi.string().required(),
})
 
// ─── Advisory schemas ─────────────────────────────────────────────────────────
export const askSchema = Joi.object({
  question: Joi.string().trim().min(3).max(1000).required(),
  language: Joi.string().valid('ta', 'en', 'hi').default('en'),
  context:  Joi.object({
    district: Joi.string().optional(),
    crop:     Joi.string().optional(),
  }).optional(),
})
 
export const diagnoseSchema = Joi.object({
  symptoms: Joi.string().trim().min(5).max(1000).required(),
  cropType: Joi.string().max(60).optional(),
  language: Joi.string().valid('ta', 'en', 'hi').default('en'),
})
 
// ─── Decision (Laya) schema ───────────────────────────────────────────────────
// Allowed tasks are intentionally closed: arbitrary model tasks are rejected.
export const decisionSchema = Joi.object({
  task: Joi.string().valid('intent_classification', 'clarification', 'candidate_selection').required(),
  state: Joi.object({
    query: Joi.string().max(2000).allow(''),
    text: Joi.string().max(2000).allow(''),
  }).unknown(true).default({}),
  candidates: Joi.array().max(50).default([]),
  evidence: Joi.array().max(50).default([]),
})

// ─── Crop recommendation schema ───────────────────────────────────────────────
export const recommendSchema = Joi.object({
  N:           Joi.number().min(0).max(500).required(),
  P:           Joi.number().min(0).max(500).required(),
  K:           Joi.number().min(0).max(500).required(),
  temperature: Joi.number().min(0).max(60).required(),
  humidity:    Joi.number().min(0).max(100).required(),
  ph:          Joi.number().min(0).max(14).required(),
  rainfall:    Joi.number().min(0).max(5000).required(),
  soilType:    Joi.string().valid('clay', 'loam', 'sandy', 'black', 'red').optional(),
})
 