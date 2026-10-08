# Farmer Authentication Architecture

Scope: sections 1–14 of the pilot authentication/onboarding spec — welcome,
signup, login, email verification, password reset, session handling, profile,
offline onboarding, and the telemetry that records all of it. Nothing here
touches the AI pipeline (see `docs/auth/security.md` § isolation rule).

## Hard guarantees

1. **One auth system.** Email + password with a stateless Bearer JWT. The old
   phone/OTP helpers (which accepted the literal `"123456"`) were removed from
   `KRISHIVERSE/src/services/api/authService.js`; verification now goes through
   the real `POST /auth/verify/*` endpoints.
2. **Role is server-side only.** `POST /auth/register` never reads a client
   `role` (or any verification flag) — default `farmer`, set in
   `backend/src/routes/auth.js`. Tested:
   `backend/tests/authSecurity.test.js` → "ignores a client-supplied role and
   any verification flags" asserts the request body carries no `role` key.
3. **Verification never blocks login.** `/auth/login` does not require
   `emailVerifiedAt`; the verify routes are public. Tested: "never blocks login
   while the address is unverified".
4. **Secrets are hashed, expiring, one-time.** Codes/reset tokens are stored as
   SHA-256 with TTL + attempt caps (`backend/src/services/credentials.js`,
   `User.verification` / `User.passwordReset` subdocs in
   `backend/src/models/User.js`). Tested: "stores only a hash of the
   verification code", "rejects an expired code", "rejects reuse".
5. **No SMTP/SMS SDK exists.** Every channel goes through the delivery adapter
   `backend/src/services/delivery.js` with three modes:
   `dev-response` (non-production, secret may be returned as `devCode` /
   `devToken` for QA), `unconfigured` (production: secret never returned, never
   logged, only a provider-less warning with `recipient: 'redacted'`), and
   `provider` (reserved slot — adding SMTP later touches only this file).
6. **Enumeration-safe responses.** Unknown addresses answer exactly like known
   ones on verify-request, verify-confirm, forgot-password and login (one
   generic message). Send cooldowns are shared across both cases.
   Tested in `authSecurity.test.js` (5 enumeration/cooldown tests).
7. **Rate limiting before user lookup.**
   `backend/src/middleware/authRateLimit.js` — in-memory per-IP **and**
   per-email budget (`AUTH_FAIL_MAX`=5 / `AUTH_FAIL_WINDOW_MS`=900000, env read
   per request), `beginAuthAttempt()` called before the user is loaded, so a
   locked account stays locked "even with correct credentials" and one host
   cannot spray passwords across accounts. `resetAuthAttempts()` is wired into
   `backend/tests/helpers/db.js` `clearDatabase()`.
8. **Session lives in `localStorage` only on the farmer side.**
   `kv_token` / `kv_user` (`authService.js`); the admin keeps its own
   `sessionStorage` keys and never shares this client. `authStore` holds
   `{ user, token, ready }` and exposes `patchUser` for offline edits.
9. **Profile sync is server-wins-if-newer.** `POST /users/profile/sync`
   applies an entry only when `baseRevision >= profileRevision` (monotonic
   counter); otherwise the entry is returned as `status: 'conflict'` with the
   server copy. A missing `baseRevision` is treated as `0`, so a stale client
   can **never** blind-overwrite a farmer who has synced at least once.
   Tested: "keeps the server copy when the client edit is stale", "never
   blindly overwrites when baseRevision is missing".
10. **Onboarding never rolls backwards.** `applyOnboardingUpdate(user,
    {step, status})` in `backend/src/routes/users.js` ignores out-of-order steps
    and only fires the completion event on the forward transition. Tested:
    "never rolls onboarding backwards from a stale outbox entry", "marks
    completion at the final step and emits telemetry".
11. **Privileged fields are stripped, not rejected.** `PUT /users/profile` runs
    a privilege strip (role, email, verification flags, revisions) before the
    Joi `profileSchema`, so an over-posting client gets its harmless fields
    applied and its privileged ones ignored.
12. **Telemetry never fails a request.** `backend/src/services/authEvents.js`
    wraps every emit in a try/catch and a detached promise; ownership split is
    documented in its header comment and in `docs/admin/telemetry-schema.md`.

## Routes

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/v1/auth/register` | public | server-set `farmer` role, issues JWT + verification code |
| POST | `/api/v1/auth/login` | public | generic failure message, `lastLoginAt` on success |
| GET | `/api/v1/auth/me` | Bearer | session probe / refresh |
| POST | `/api/v1/auth/logout` | Bearer | best-effort audit + `auth.logout` telemetry (JWT itself is stateless) |
| POST | `/api/v1/auth/verify/request` | public | resend cooldown, enumeration-safe |
| POST | `/api/v1/auth/verify/confirm` | public | one-time code, attempt-capped |
| POST | `/api/v1/auth/password/forgot` | public | one-time token, enumeration-safe |
| POST | `/api/v1/auth/password/reset` | public | rejects token reuse/expiry |
| GET/PUT | `/api/v1/users/profile` | Bearer | pilot profile fields only |
| POST | `/api/v1/users/profile/sync` | Bearer | offline outbox, `{ batch: [...], max 10 }` |
| PUT | `/api/v1/users/onboarding` | Bearer | step progress + fields collected by that step |
| GET | `/api/admin/farmers` | admin RBAC | aggregates only — see `docs/admin/farmer-analytics.md` |

Frontend calls are all in `KRISHIVERSE/src/services/api/authService.js`
(`apiClient` base, `kv_token` / `kv_user` persistence).

## Client component map

| Concern | File |
|---|---|
| Session store (`ready`, `user`, `patchUser`) | `src/store/authStore.js` |
| Route guarding + onboarding gate | `src/components/common/ProtectedRoute.jsx` (`requireOnboarding`) |
| Public/guarded routes, lazy imports | `src/App.jsx` |
| Hidden-from-nav auth routes | `src/config/navigation.js` → `AUTH_ROUTES` |
| Meta titles/descriptions | `src/components/common/Seo.jsx` → `ROUTE_META` |
| Shared auth layout | `src/components/auth/AuthShell.jsx` |
| Shared crop picker (wizard + profile) | `src/components/auth/CropPicker.jsx` |
| Pages | `WelcomePage`, `LoginPage`, `RegisterPage`, `VerifyEmailPage`, `ForgotPasswordPage`, `ResetPasswordPage`, `OnboardingPage`, `ProfilePage` |
| Offline profile outbox | `src/services/offline/profileOutbox.js` |
| Outbox flush + payload collapse | `src/services/sync/syncService.js` (`collapseProfileEntries`, `STORE_ROUTES`) |
| Client telemetry adapter (allow-list) | `src/services/telemetry/farmerEvents.js` |

## Telemetry ownership

Server emits: `auth.signup_success|failure`, `auth.login_success|failure`,
`auth.logout`, `auth.verification_success|failure`, `auth.reset_success`,
`onboarding.step_completed`, `onboarding.completed`.
Client emits only: `auth.signup_started`, `auth.verification_started`,
`auth.reset_started`, `onboarding.started`, `onboarding.abandoned`.
The split exists so a retry can never double-count an outcome; the client side
is enforced by `CLIENT_EVENT_TYPES` in `farmerEvents.js` and by
`KRISHIVERSE/src/admin/__tests__/isolation.test.js` (the adapter must not
contain the literals `auth.login_success` / `onboarding.completed`).

## Test coverage

| Suite | Tests | Covers |
|---|---|---|
| `backend/tests/authSecurity.test.js` | 24 | register/login/verify/reset security matrix, rate limits, enumeration, telemetry + audit |
| `backend/tests/profileOnboarding.test.js` | 15 | profile updates, sync conflict rules, offline outbox, wizard progress, abandonment |
| `backend/tests/admin.farmers.test.js` | 6 | admin analytics endpoint, RBAC, PII-free output, time windows |
| `KRISHIVERSE/src/services/api/authService.test.js` | 9 | endpoint mapping, storage keys, best-effort logout |
| `KRISHIVERSE/src/store/authStore.test.js` | 8 | session lifecycle, `patchUser`, legacy `onboarded` migration |
| `KRISHIVERSE/src/services/sync/profileSync.test.js` | 6 | collapse, endpoint routing, offline queue → flush |
| `KRISHIVERSE/src/pages/__tests__/authFlow.test.jsx` | 12 | every public page renders + `ProtectedRoute` redirect matrix |
| `KRISHIVERSE/src/pages/__tests__/onboarding.test.jsx` | 6 | a11y progress, validation, 6-step walk, abandonment, signed-out redirect |
| `KRISHIVERSE/src/services/ai/aiPipelineIsolation.test.js` | 4 | no auth/profile reference anywhere under `src/services/ai` |

Backend total after this phase: **164 passing** (`npx mocha`).

## Deliberately NOT done

- No JWT revocation list, no refresh-token rotation (stateless pilot JWT).
- No third-party OAuth, no SMS/OTP, no SMTP provider — the adapter slot exists,
  wiring a provider is out of scope.
- No Aadhaar/PAN/bank/KYC fields anywhere in the schema or the UI.
- No AI-side changes: `ResponseValidator`, `aiRouter`, RAG ranking, Crop Doctor
  and Laya behaviour are untouched, and profile data is CONTEXT only (enforced
  by `aiPipelineIsolation.test.js`).
- No two-factor, no password complexity meter beyond the Joi minimum.
