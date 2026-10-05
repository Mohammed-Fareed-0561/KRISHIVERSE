import { verifyToken } from '../services/jwt.js'
 
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const [, token] = header.split(' ')
 
  if (!token) {
    const err = new Error('Missing Authorization token')
    err.status = 401
    return next(err)
  }
 
  try {
    req.user = verifyToken(token)
    return next()
  } catch {
    const err = new Error('Invalid or expired token')
    err.status = 401
    return next(err)
  }
}