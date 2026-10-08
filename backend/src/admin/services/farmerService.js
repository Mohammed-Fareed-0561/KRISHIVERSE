import { User } from '../../models/User.js'
import { AuditLog } from '../store/collections.js'
import { percent, tally } from '../metrics/math.js'

/**
 * Section 12 — farmer adoption & onboarding analytics.
 *
 * Aggregates only: this panel never returns names, emails, or any other
 * identifier, so it is safe for `admin:read` viewers. Admin/superadmin accounts
 * are excluded — the panel measures pilot farmers, not staff.
 */

const ACTIVE_WINDOW_HOURS = 168 // 7 days
const FARMER_ROLES  = ['farmer', 'viewer', 'auditor']
const TOP_DISTRICTS = 10
const TOP_CROPS     = 15

function inRange(range) {
  if (!range || (range.$gte === undefined && range.$lte === undefined)) return {}
  return { createdAt: range }
}

function rangeFrom(from, to) {
  const range = {}
  if (from) range.$gte = new Date(from)
  if (to)   range.$lte = new Date(to)
  return range
}

export async function farmerAnalytics({ from, to } = {}) {
  const now         = new Date()
  const activeSince = new Date(now.getTime() - ACTIVE_WINDOW_HOURS * 60 * 60 * 1000)
  const created     = rangeFrom(from, to)
  const at          = rangeFrom(from, to)
  const farmerMatch = { role: { $in: FARMER_ROLES } }

  const [
    registered,
    verified,
    active,
    windowSignups,
    loginRows,
    stepRows,
    startedCount,
    completedCount,
    abandonedCount,
    languageRows,
    districtRows,
    cropRows,
  ] = await Promise.all([
    User.countDocuments(farmerMatch),
    User.countDocuments({ ...farmerMatch, emailVerifiedAt: { $exists: true, $ne: null } }),
    User.countDocuments({ ...farmerMatch, lastLoginAt: { $gte: activeSince } }),
    User.countDocuments({ ...farmerMatch, ...inRange(created) }),
    AuditLog.aggregate([
      { $match: { action: 'auth.login', ...(Object.keys(at).length ? { at } : {}) } },
      { $group: { _id: '$result', count: { $sum: 1 } } },
    ]),
    User.aggregate([
      { $match: farmerMatch },
      { $group: { _id: '$onboarding.step', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    User.countDocuments({ ...farmerMatch, 'onboarding.startedAt': { $exists: true, $ne: null } }),
    User.countDocuments({ ...farmerMatch, 'onboarding.completedAt': { $exists: true, $ne: null } }),
    User.countDocuments({ ...farmerMatch, 'onboarding.abandonedAt': { $exists: true, $ne: null } }),
    User.aggregate([
      { $match: farmerMatch },
      { $group: { _id: '$language', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    User.aggregate([
      { $match: farmerMatch },
      { $group: { _id: '$location.district', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: TOP_DISTRICTS },
    ]),
    User.aggregate([
      { $match: farmerMatch },
      { $unwind: '$crops' },
      { $group: { _id: '$crops', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: TOP_CROPS },
    ]),
  ])

  const byResult = Object.fromEntries(loginRows.map((row) => [row._id, row.count]))
  const logins   = byResult.allowed || 0
  const failed   = byResult.failed || 0

  const note = registered === 0
    ? 'No pilot farmer accounts exist yet. This panel fills as farmers register, verify, and complete onboarding.'
    : undefined

  return {
    label:  'FARMER ADOPTION — AGGREGATES ONLY (NO PII)',
    window: { from: from || null, to: to || null, activeWindowHours: ACTIVE_WINDOW_HOURS },
    snapshot: {
      registered,
      verified,
      verifiedPct:      percent(verified, registered),
      active,
      activePct:        percent(active, registered),
      accountsExcluded: 'admin, superadmin',
    },
    activity: {
      registeredInWindow: windowSignups,
      logins,
      failedLogins: failed,
      loginSuccessRatePct: percent(logins, logins + failed),
      signupRatePct:       percent(windowSignups, registered),
    },
    funnel: {
      started:           startedCount,
      completed: completedCount,
      abandoned: abandonedCount,
      completionPct:     percent(completedCount, startedCount),
      abandonmentPct:    percent(abandonedCount, startedCount),
      notStarted:        Math.max(registered - startedCount, 0),
      byStep: stepRows.map((row) => ({ step: row._id ?? 0, count: row.count })),
    },
    distributions: {
      language: tally(languageRows.map((row) => row._id || 'unset')),
      district: districtRows.map((row) => ({ key: row._id || 'unset', count: row.count })),
      crop:     cropRows.map((row) => ({ key: row._id, count: row.count })),
    },
    note,
  }
}
