import { User } from '../models/User.js'
import { createLogger } from '../utils/logger.js'

const log = createLogger('admin:provision')

const ADMIN_ROLES = ['superadmin', 'admin', 'auditor', 'viewer']

/**
 * Provision the first admin identity from environment configuration.
 * Secrets are read from the environment and never logged. Runs at startup so it
 * also works when development uses an in-memory database (no external CLI needed).
 */
export async function provisionAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim()
  const password = process.env.ADMIN_PASSWORD
  if (!email || !password) {
    return { provisioned: false, reason: 'ADMIN_EMAIL / ADMIN_PASSWORD not set' }
  }

  const role = ADMIN_ROLES.includes(process.env.ADMIN_ROLE) ? process.env.ADMIN_ROLE : 'superadmin'

  try {
    const existing = await User.findOne({ email }).select('+password')
    if (existing) {
      if (existing.role !== role) {
        existing.role = role
        await existing.save()
        log.info({ msg: 'Admin role updated', email, role })
        return { provisioned: true, updated: true, role }
      }
      return { provisioned: false, reason: 'admin already exists', role: existing.role }
    }

    await User.create({
      name: process.env.ADMIN_NAME || 'KrishiVerse Admin',
      email,
      password,
      role,
      language: process.env.ADMIN_LANGUAGE || 'en',
    })
    log.info({ msg: 'Admin provisioned', email, role })
    return { provisioned: true, role }
  } catch (error) {
    log.warn({ msg: 'Admin provisioning failed', error: error?.message || String(error) })
    return { provisioned: false, reason: error?.message || 'provisioning failed' }
  }
}
