import { Router }        from 'express'
import { authRouter }     from './auth.js'
import { usersRouter }    from './users.js'
import { weatherRouter }  from './weather.js'
import { advisoryRouter } from './advisory.js'
import { cropsRouter }    from './crops.js'
import { decisionRouter } from './decision.js'

export const routes = Router()

// Health check — no auth needed, used by frontend to detect online status
routes.get('/health', (_req, res) => {
  res.json({
    status:    'ok',
    service:   'KrishiVerse API',
    timestamp: new Date().toISOString(),
    env:       process.env.NODE_ENV || 'development',
    capabilities: {
      groqEnabled: Boolean(process.env.GROQ_API_KEY),
      geminiEnabled: Boolean(process.env.GEMINI_API_KEY),
      layaEnabled: (process.env.LAYA_ENABLED || 'true') === 'true',
    },
    syncStore: 'sqlite',
  })
})

routes.use('/auth',     authRouter)
routes.use('/users',    usersRouter)
routes.use('/weather',  weatherRouter)
routes.use('/advisory', advisoryRouter)
routes.use('/crops',    cropsRouter)
routes.use('/decision', decisionRouter)
 
// 404 fallback for unknown API routes
routes.use((req, res) => {
  res.status(404).json({ status: 'error', message: `Route ${req.method} ${req.path} not found` })
})
 