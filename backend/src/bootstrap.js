import 'express-async-errors'           // patches Express so async throws hit errorHandler
import express      from 'express'
import cors         from 'cors'
import helmet       from 'helmet'
import compression  from 'compression'
import rateLimit    from 'express-rate-limit'
import mongoose     from 'mongoose'
import * as Sentry  from '@sentry/node'
import { MongoMemoryServer } from 'mongodb-memory-server'

import { createLogger }  from './utils/logger.js'
import { errorHandler }  from './middleware/errorHandler.js'
import { routes }        from './routes/index.js'
import { adminRouter }   from './routes/admin/index.js'
import { requestTelemetry } from './admin/middleware/requestTelemetry.js'
import { provisionAdmin }   from './admin/provisionAdmin.js'
 
const log = createLogger('bootstrap')
 
const PORT         = Number.parseInt(process.env.PORT         || '3001', 10)
const API_VERSION  = process.env.API_VERSION  || 'v1'

// Allowed origins — prefer ALLOWED_ORIGINS (comma-separated), fall back to FRONTEND_URL
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
 
// ─── Sentry (optional — only activates if DSN is set) ────────────────────────
if (process.env.SENTRY_DSN) {
  Sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV })
  log.info({ msg: 'Sentry initialised' })
}
 
// ─── Database ─────────────────────────────────────────────────────────────────
export async function connectDb() {
  const uri = process.env.MONGODB_URI?.trim()
  const env = process.env.NODE_ENV || 'development'
 
  if (uri) {
    try {
      await mongoose.connect(uri)
      log.info({ msg: 'MongoDB connected', mode: 'external' })
      return { mode: 'external' }
    } catch (error) {
      if (env !== 'development') {
        throw error
      }
      log.warn({
        msg: 'External MongoDB unavailable, falling back to in-memory DB',
        error: error?.message || String(error),
      })
    }
  }
 
  if (env !== 'development') {
    throw new Error('MONGODB_URI is required in production')
  }
 
  const mem    = await MongoMemoryServer.create()
  const memUri = mem.getUri()
  await mongoose.connect(memUri)
  log.info({ msg: 'MongoDB connected', mode: 'in-memory (dev only)' })
  return { mode: 'memory', mem }
}
 
// ─── App factory ─────────────────────────────────────────────────────────────
export function buildApp() {
  const app = express()

  // Security & performance
  app.use(helmet())
  app.use(compression())
  app.use(express.json({ limit: '2mb' }))

  // CORS — only allow the configured frontend origins
  app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }))

  // Rate limiting on all API routes (skipped in tests to keep them fast/stable)
  if (process.env.NODE_ENV !== 'test') {
    app.use(
      `/api/${API_VERSION}`,
      rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false }),
    )
  }

  // Passive, fire-and-forget observer for farmer-facing API traffic.
  // It never awaits anything and can never change a farmer response.
  app.use(`/api/${API_VERSION}`, requestTelemetry())

  // Routes
  app.use(`/api/${API_VERSION}`, routes)

  // Admin observability surface — separate mount, separate limiter, own error
  // handler. A failing dashboard endpoint cannot fail a farmer request.
  app.use('/api/admin', adminRouter)

  // Error handler must be last
  app.use(errorHandler)

  return app
}

// ─── Entry point ──────────────────────────────────────────────────────────────
async function main() {
  await connectDb()
  await provisionAdmin()

  const app = buildApp()

  app.listen(PORT, () => {
    log.info({
      msg:     '🌱 KrishiVerse backend running',
      port:    PORT,
      apiBase: `/api/${API_VERSION}`,
      env:     process.env.NODE_ENV || 'development',
    })
  })
}

export { main }
