# Admin Observability — Architecture

Section reference: Admin Monitoring & Analytics specification sections 1–36.
The admin dashboard is an **operations surface**. It observes the system; it
never participates in serving farmers.

## Hard isolation guarantees

1. **No farmer-path dependency.** Farmer routes never import admin code. The
   telemetry middleware (`backend/src/admin/middleware/requestTelemetry.js`) is
   mounted on `/api/v1` but only *observes*: it wraps `res.json`, measures
   latency/status, and enqueues a sampled record into an in-memory collector.
   Every operation is wrapped so that a failure inside telemetry cannot reject,
   delay, or alter a farmer response (proven by `backend/tests/admin.isolation.test.js`).
2. **Async, fire-and-forget.** Database writes for telemetry are kicked off
   without `await` in the request path. If MongoDB is down, farmer traffic is
   unaffected; only the admin health panel degrades.
3. **Frontend code-split.** The dashboard lives in `KRISHIVERSE/src/admin/` and
   is mounted at `/admin/*` behind React `lazy()` + an error boundary
   (`AdminBoundary`). The production build emits separate `AdminApp-*.js` /
   `AdminBoundary-*.js` chunks; the main `index-*.js` bundle contains no admin
   code (only the lazy chunk URL). A dashboard crash shows a contained fallback
   — farmer pages are a different route tree and keep working.
4. **Separate tokens.** Admin JWT lives in `sessionStorage` under
   `kv_admin_token`; the farmer token (`kv_token`) is untouched. Logging into
   the admin console with a `farmer` account is rejected client-side (`adminLogin`)
   and server-side (RBAC).
5. **Tested boundary.** `KRISHIVERSE/src/admin/__tests__/isolation.test.js`
   scans the source tree and fails if any farmer file imports `src/admin`,
   `adminApi`, the session context, or the telemetry client.

## Data flow

```
Farmer request ──▶ /api/v1/* ──▶ existing route handler ──▶ response
                     │
                     └─▶ requestTelemetry (sampled, non-blocking)
                            └─▶ requestCollector (ring, 5 000 obs) + counters
                                   │
Admin browser ─▶ /api/admin/* ─────┴──▶ panelsService / readinessService /
   │                                    evaluationService / ops services
   └─▶ src/admin/AdminApp.jsx (polling useAdminData, 30–60 s intervals)
```

Client-side events (opt-in) go through
`KRISHIVERSE/src/services/telemetry/telemetryClient.js` → batched
`POST /api/admin/telemetry/batch`. Farmer runtime code does **not** import this
client today; it is the extension point for future instrumentation.

## Component map

### Backend (`backend/src/admin/`)

| Layer | Files | Role |
|---|---|---|
| Schema | `schema/eventSchema.js` | Telemetry schema v1 validation (32 event types, strict field allowlist, never throws) |
| Metrics | `metrics/math.js`, `metrics/requestCollector.js` | Percentiles, confusion matrix, rank metrics; in-memory ring + counters |
| Services | `services/*.js` (telemetry, panels, evaluation, readiness, version, backup, registry, audit, triage, health, kb, farmer) | Panel builders; every builder tolerates missing data and returns explicit `unavailable` reasons |
| Middleware | `middleware/requestTelemetry.js`, `rbac.js`, `adminRateLimit.js`, `adminError.js` | Passive observation, permission gates, per-request rate limiting (skipped under `NODE_ENV=test`), AdminError capture |
| Routes | `routes/admin/*.routes.js`, plus `backend/src/routes/admin/farmers.routes.js` | Mounted at `/api/admin` from `backend/src/bootstrap.js` (farmers panel behind `requireAdmin('admin:read')`) |
| Provisioning | `provisionAdmin.js` | Creates the first admin from `ADMIN_EMAIL`/`ADMIN_PASSWORD`/`ADMIN_ROLE` at boot; secrets never logged |
| Models | `store/collections.js` | Mongoose models: TelemetryEvent, TelemetryHealth, AuditLog, AdminError, Incident, RegistryEntry, BackupMeta |

Mounting order in `bootstrap.js` (the only farmer-side file touched, additively):

```js
app.use('/api/v1', requestTelemetry())   // observer only
app.use('/api/admin', adminRouter)       // fully separate router
provisionAdmin()                          // startup provisioning
```

### Frontend (`KRISHIVERSE/src/admin/`)

- `AdminApp.jsx` — login gate, session context, nav (3 groups, 16 sections),
  lazy nested routes, admin session telemetry capture.
- `adminApi.js` — axios instance with admin base URL, farmer-role rejection,
  `can()` permission helper.
- `useAdminData.js` — polling hook that never throws (errors surface as UI state).
- `components/ui.jsx`, `components/charts.jsx` — shared panels/badges and
  recharts wrappers.
- `sections/*.jsx` — one file per dashboard section (see `metrics-catalog.md`).

## Failure containment model

| Failure | Farmer impact | Admin impact |
|---|---|---|
| Telemetry DB write fails | none (fire-and-forget) | health panel shows degraded pipeline |
| Admin router throws | none (separate mount) | AdminError captured, admin error handler renders 5xx JSON |
| Dashboard section crashes | none (route tree separate) | `AdminBoundary` fallback with reload action |
| Eval results missing | none | dataset tab shows `unavailable` + how to populate it |
| MongoDB down | only telemetry writes affected | monitoring endpoints return explicit unavailable states |

## What is deliberately NOT done

- No bulk event ingestion; batch capped at 50 events, rate-limited.
- No raw farmer text, message bodies, or PII in any telemetry or panel.
- No modifications to `ResponseValidator`, `aiRouter`, RAG ranking, Crop Doctor
  logic, Laya behaviour, or pilot UI (verified via empty `git diff` on those paths).
- No production rollback executed during development.
- No frontend inference-path instrumentation yet — production client latency and
  client-side error rates are reported as *not captured* until that lands.
