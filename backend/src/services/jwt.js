import jwt from 'jsonwebtoken'
 
const SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? (() => { throw new Error('JWT_SECRET is required in production') })() : 'dev_secret_change_me')
// Accept seconds as a plain number OR a string like "7d" (jsonwebtoken/ms supports both)
const RAW_EXPIRY = process.env.JWT_EXPIRES_IN || '86400'
const EXPIRY    = /^\d+$/.test(RAW_EXPIRY) ? Number.parseInt(RAW_EXPIRY, 10) : RAW_EXPIRY
 
/**
 * Sign a JWT for the given payload.
 * @param {object} payload  — e.g. { id, email, role }
 * @returns {string} signed token
 */
export function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRY })
}
 
/**
 * Verify and decode a JWT.
 * Throws if invalid or expired.
 * @param {string} token
 * @returns {object} decoded payload
 */
export function verifyToken(token) {
  return jwt.verify(token, SECRET)
}
 