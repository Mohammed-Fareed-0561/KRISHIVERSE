# Authentication Security Notes

Companion to `docs/auth/authentication-architecture.md`. This file lists the
threats considered, the control that answers each one, and the test that pins
it down. Baseline suite: `backend/tests/authSecurity.test.js` (24 tests),
`backend/tests/profileOnboarding.test.js` (15), `npx mocha` → **164 passing**.

## Controls

| Threat | Control | Pinned by |
|---|---|---|
| Privilege escalation at signup | role always set server-side (`farmer`); client `role`/verification flags ignored | "ignores a client-supplied role and any verification flags" |
| Account enumeration | one generic failure message for unknown email vs wrong password; verify/forgot answer identically for unknown addresses | 5 enumeration tests |
| Credential stuffing / password spraying | per-IP **and** per-email in-memory budget, evaluated **before** the user lookup | "locks the account after AUTH_FAIL_MAX failures, even with correct credentials", "shares the per-IP budget across accounts" |
| Code/token guessing | 6-digit codes and reset tokens stored as SHA-256, TTL + max attempts + resend cooldown, constant-time compare (`credentials.js`) | "stores only a hash of the verification code", "rejects a wrong code…", "rate-limits repeated confirm attempts" |
| Token replay after use | one-time flag cleared on successful confirm/reset | "rejects reuse" (password reset) |
| Secret leakage in logs/API | `delivery.js` modes: production never returns and never logs the secret; `recipient: 'redacted'`, no address, no code | delivery adapter contract (§ guarantees, architecture doc) |
| Secret leakage in the client bundle | secrets only ever arrive as an explicit `devCode`/`devToken` response field in non-production | `canExposeSecret()` gate in `delivery.js` |
| PII in telemetry | events carry metadata limited to ≤8 keys of number/boolean/≤120-char string (`authEvents.js` `sanitizeMetadata`); no field for farmer content | schema allowlist, `docs/admin/telemetry-schema.md` |
| Session theft from logs | passwords, JWTs, codes and tokens are never logged; the logger only sees redacted fields | repo-wide: no `log.*(password\|token\|code)` calls on the auth path |
| Over-posting | Joi schemas with `stripUnknown`, plus an explicit privilege strip on `PUT /users/profile` | "strips privileged fields instead of applying them" |
| Stale client wiping a fresh profile | monotonic `profileRevision` + `baseRevision` check; missing `baseRevision` ⇒ conflict | sync conflict tests |
| Offline outbox rewinding onboarding | step-monotonic `applyOnboardingUpdate` | "never rolls onboarding backwards from a stale outbox entry" |
| Telemetry breaking an auth response | every emit wrapped, detached, swallowed (`authEvents.js`) | fire-and-forget contract |
| Admin panel exposing farmer PII | `GET /api/admin/farmers` returns aggregates only; RBAC-gated | "never returns names or email addresses", "requires an admin-scope identity" |

## Rate limiting & lockout

- `backend/src/middleware/authRateLimit.js`, in-memory, no Redis (single-node
  pilot).
- Two budgets: per-IP (`req.ip`) and per-email (lowercased), both counted by
  `beginAuthAttempt()` **before** the user document is read, so a locked account
  stays locked even when the attacker then supplies the correct password.
- Defaults `AUTH_FAIL_MAX=5` / `AUTH_FAIL_WINDOW_MS=900000`, read from `env`
  on every request so tests and operators can tune without restarts.
- Verification/reset endpoints additionally carry their own send cooldowns and
  attempt caps (env: `AUTH_VERIFICATION_*`, `AUTH_RESET_*`).
- `resetAuthAttempts()` runs from `backend/tests/helpers/db.js` so suites stay
  order-independent.

## Password & credential handling

- Hashing/derivation and comparison live in
  `backend/src/services/credentials.js` (`sha256`, `constantTimeEqual`,
  `generateCode`, `generateToken`, TTL readers).
- Login issues a stateless JWT signed with the existing secret; the same token
  shape the rest of the API already expects (`requireAuth`).
- Logout is best-effort server-side (audit + telemetry) because the JWT cannot
  be revoked; the client always clears `kv_token` / `kv_user` locally.

## Isolation rule (profile = CONTEXT, never evidence)

Nothing under `KRISHIVERSE/src/services/ai/**` may reference `kv_user`,
`kv_token`, `authService`, `authStore`, `profileOutbox`, `store/auth`,
`users/profile`, or the auth endpoints. Enforced by
`KRISHIVERSE/src/services/ai/aiPipelineIsolation.test.js`, which scans the raw
source of every file in that folder and includes a self-check that the scan
would actually fire on a planted violation. This is what keeps a farmer's
profile, language, district or crops from quietly steering ResponseValidator,
aiRouter, RAG ranking, or the Crop Doctor.

## Data KrishiVerse does NOT collect

No Aadhaar, PAN, bank account, or any other KYC identifier exists in
`User.js`, in any Joi schema, or in any page of this feature. Profile fields
are limited to name, language (incl. `tanglish`), district, farm size, soil,
irrigation, crops, experience, and notification preferences.

## Environment variables

See the auth block in `backend/.env.example`:

| Var | Purpose | Default |
|---|---|---|
| `AUTH_FAIL_MAX` | failed attempts per window per IP/email | 5 |
| `AUTH_FAIL_WINDOW_MS` | lockout window | 900000 |
| `AUTH_VERIFICATION_TTL_MS` | code lifetime | 900000 |
| `AUTH_VERIFICATION_MAX_ATTEMPTS` | confirm attempts | 5 |
| `AUTH_VERIFICATION_COOLDOWN_MS` | resend cooldown | 60000 |
| `AUTH_RESET_TTL_MS` | reset token lifetime | 3600000 |
| `AUTH_RESET_COOLDOWN_MS` | forgot resend cooldown | 60000 |

Nothing in this list is a secret; the JWT signing secret is inherited from the
existing backend config and is never logged.
