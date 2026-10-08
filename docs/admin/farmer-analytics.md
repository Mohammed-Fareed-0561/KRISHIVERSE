# Farmer Adoption Analytics (Admin)

Read-only admin panel for pilot adoption: registrations, verification, login
health, and the onboarding funnel. Part of the admin observability set
(`docs/admin/observability-architecture.md`); it reuses the admin router, RBAC,
rate limiting, and `ProdBadge`/`Panel` UI primitives — no new framework.

## Endpoint

`GET /api/admin/farmers?from&to&hours` — mounted on the admin router behind
`requireAdmin('admin:read')`.

- Route: `backend/src/routes/admin/farmers.routes.js`
- Service: `backend/src/admin/services/farmerService.js` (`farmerAnalytics`)
- Window: `resolveWindow()` from `panelsService.js` (same `from/to/hours`
  semantics as every other admin panel).
- Active-farmer window: 168 h (7 days), fixed and echoed in the payload.

## Response shape (aggregates only)

```jsonc
{
  "label": "FARMER ADOPTION — AGGREGATES ONLY (NO PII)",
  "window": { "from": null, "to": null, "activeWindowHours": 168 },
  "snapshot":  { "registered", "verified", "verifiedPct", "active", "activePct",
                 "accountsExcluded": "admin, superadmin" },
  "activity":  { "registeredInWindow", "logins", "failedLogins",
                 "loginSuccessRatePct", "signupRatePct" },
  "funnel":    { "started", "completed", "abandoned", "completionPct",
                 "abandonmentPct", "notStarted", "byStep": [{ "step", "count" }] },
  "distributions": { "language": [...], "district": [...], "crop": [...] },
  "note": "No pilot farmer accounts exist yet. …"   // only when registered === 0
}
```

Definitions:

- **registered** — `User.countDocuments({ role ∈ farmer roles })`; admin and
  superadmin accounts are excluded, and the panel says so (`accountsExcluded`).
- **verified / active** — `emailVerifiedAt` set / `lastLoginAt` within the
  168 h window.
- **logins / failedLogins** — tallied from the auth audit trail
  (`auth.login`, result `allowed` / `failed`), not from raw telemetry, so the
  success rate is exact for the window.
- **funnel** — from `User.onboarding`: `started` = `startedAt` present,
  `completed` = `completedAt` present, `abandoned` = `abandonedAt` present,
  `byStep` = count of farmers currently parked at each step, `notStarted` =
  registered − started.
- **distributions** — language, district, and crop tallies across farmer
  profiles (top-N by count, `unset` bucket included).

## Frontend

`KRISHIVERSE/src/admin/sections/FarmersSection.jsx`, registered in
`AdminApp.jsx` under the **Analysis** group (`nav: { to: "farmers", label:
"Farmers", group: "Analysis" }`, lazy route `/admin/farmers`) — 16 nav
sections total now.

Layout: one `Panel` with `ProdBadge` telemetry badges —

- `Metric` row: registered, email verified, active (7d), new in window,
  logins, failed logins (warn tone), login success rate.
- Funnel `Metric` row: started / completed / abandoned / completion rate.
- `CountBars`: onboarding by-step drop-off, language split, district split,
  crop split.
- Subtitle states the guarantee verbatim: *“Aggregates only — no names,
  emails, or identifiers.”* and shows the active window.
- Empty state renders the service `note` (why the panel is blank before the
  pilot starts); loading/error use the standard `LoadingNote`/`ErrorNote`
  (`useAdminData` never throws).

## PII rule

The endpoint returns counts and distributions only. There is no code path that
returns a name, email, phone number, village, or any identifier — asserted by
`backend/tests/admin.farmers.test.js` → "never returns names or email
addresses", which registers real farmers and greps the response for their
addresses. Telemetry feeding this panel follows the same allowlist as the rest
of the admin stack (`docs/admin/telemetry-schema.md`).

## Tests

`backend/tests/admin.farmers.test.js` (6):

1. requires an admin-scope identity
2. aggregates registration, verification, activity, and the onboarding funnel
3. computes login success rates from the auth audit trail
4. never returns names or email addresses
5. explains the empty state before the pilot starts
6. honours the time window for signups and logins
