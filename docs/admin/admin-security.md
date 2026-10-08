# Admin Security

## Authentication

- The admin console reuses the existing identity system — no parallel user
  store. Login: `POST /api/admin/auth/login` (proxied to the same JWT issuance
  as `POST /api/v1/auth/login` via `backend/src/services/jwt.js`,
  `JWT_SECRET` / `JWT_EXPIRES_IN`).
- User roles (extended enum in `backend/src/models/User.js`):
  `farmer`, `viewer`, `auditor`, `admin`, `superadmin`.
  Registration endpoints always strip any submitted role and default to `farmer`
  — privilege escalation via signup is not possible.
- **Farmer accounts cannot log into the admin console**: the client
  (`KRISHIVERSE/src/admin/adminApi.js`) rejects non-admin roles with a
  `403 forbidden` shaped error, and the server `requireAdmin` middleware
  re-checks every request.
- Tokens are stored separately: admin JWT in `sessionStorage` key
  `kv_admin_token`, farmer JWT in `kv_token`. `POST /api/admin/auth/logout`
  clears the admin session client-side.

### First-run provisioning

`backend/src/admin/provisionAdmin.js` runs at boot:

```
ADMIN_EMAIL=...      # required to provision
ADMIN_PASSWORD=...   # required (bcrypt-hashed; never logged)
ADMIN_ROLE=superadmin|admin|auditor|viewer   # default: admin
ADMIN_NAME=...       # optional display name
```

If the account exists it is left untouched (role is not silently changed).
Secrets are never written to logs; provisioning failures log the *reason*,
not the value.

## Authorization (RBAC)

Permission → roles table in `backend/src/admin/middleware/rbac.js`:

| Permission | superadmin | admin | auditor | viewer |
|---|---|---|---|---|
| `admin:read` (all panels) | ✔ | ✔ | ✔ | ✔ |
| `admin:telemetry` (event queries) | ✔ | ✔ | ✔ | ✔ |
| `admin:audit` | ✔ | ✔ | ✔ | – |
| `admin:incidents` (open/patch incidents) | ✔ | ✔ | ✔ | – |
| `admin:ops` (registry writes) | ✔ | ✔ | – | – |
| `admin:backup` (create/verify/restore) | ✔ | ✔ | – | – |
| `admin:config` (config history views) | ✔ | ✔ | – | – |
| `admin:rollback` | ✔ | – | – | – |

`GET /api/admin/auth/me` returns the caller's permission list so the UI hides
actions the role cannot perform (defence in depth — the server still enforces).

## Route protection model

Order inside `backend/src/routes/admin/index.js`:

1. request log capture (redacted)
2. `auditMutations` — records every mutating admin call and every RBAC denial
3. `/auth/*` and `POST /telemetry/*` (public but rate-limited)
4. `requireAdmin('admin:read')` — **everything else** requires a valid admin JWT
5. shared read limiter (`adminLimiter`, 300 requests/15 min per scope, skipped
   under `NODE_ENV=test`)
6. monitoring / evaluation / ops routers
7. admin 404 → `adminErrorHandler` (AdminError records, JSON errors with request id)

The whole API also sits behind global `helmet()`, CORS restricted to
`ALLOWED_ORIGINS`, and a global 300 req/15 min limiter (see `bootstrap.js`).

## Restore / rollback protection (most dangerous operation)

`POST /api/admin/backups/:backupId/restore` requires **all** of:

1. JSON body `confirm: true`
2. role `superadmin` (`admin:rollback`)
3. `ADMIN_ALLOW_RESTORE=true` environment flag — when unset, restores only run
   as a **drill** writing inside `backend/backups/`; writing anywhere else is
   refused with an explanatory error.

Backups are **secret-free**: snapshots exclude env files/keys by construction
(see `backupService.js`); `sha256` checksums are verified by
`GET /backups/:id/verify`.

## Audit trail

- Append-only MongoDB `auditlogs` — there is **no update or delete endpoint**
  for audit records (asserted by tests).
- Recorded: actor (id/email/role), action, resource, outcome, masked IP,
  timestamp. IPs are masked at write time (`maskIp`: IPv4 → `a.b.x.x`,
  IPv6 → first two groups `::x`) so raw IPs never enter the store.
- Access denials (RBAC failures, 403/404 on admin routes) are audited too.

## Data-handling rules

- Telemetry schema has **no content fields** (see `telemetry-schema.md`);
  intent/labels are regex-restricted so free text cannot be smuggled in.
- Dashboard log stream and error centre are redacted before storage
  (`triageService.captureLog`); raw farmer messages are never captured.
- Panel query parameters are validated (e.g. intent pattern
  `^[a-z0-9][a-z0-9_.-]{0,63}$`, bounded limits) — no injection into queries.
- The admin browser client sends `credentials: 'omit'` for telemetry flushes.

## Failure isolation as a security property

A compromised or broken admin panel cannot become a farmer-availability incident:
admin routes are a separate router, telemetry is fire-and-forget, and the
frontend admin shell is code-split behind an error boundary. Disabling the whole
admin API has zero effect on `/api/v1`.
