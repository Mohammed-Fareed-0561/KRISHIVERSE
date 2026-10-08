# Farmer Onboarding

Six-step pilot wizard + offline profile sync. Backend contract:
`backend/src/routes/users.js` (`PUT /users/onboarding`,
`POST /users/profile/sync`, `applyOnboardingUpdate`).
Frontend: `KRISHIVERSE/src/pages/OnboardingPage.jsx`.

## The wizard

| Step | Title (i18n key) | Collects |
|---|---|---|
| 1 | `onboarding.step1.title` — Language & district | `language` (`ta/en/hi/tanglish`), `location.district`, `location.state`, `village` |
| 2 | `onboarding.step2.title` — Your farm | `farmSize {value, unit}`, `experienceYears` |
| 3 | `onboarding.step3.title` — Your crops | `crops[]` (max 12) via shared `components/auth/CropPicker.jsx` |
| 4 | `onboarding.step4.title` — Water & experience | `irrigation` (`well/borewell/canal/drip/sprinkler/rainfed/other`) |
| 5 | `onboarding.step5.title` — Preferences | `notifications {sms,push}`, `unitPrefs {area,temperature}` |
| 6 | `onboarding.step6.title` — Review & finish | read-only summary, final save marks `completed` |

- Progress is a `role="progressbar"` with `aria-valuenow/min/max` and the
  `Step {{current}} of {{total}}` label; every step persists with
  `PUT /users/onboarding {step, status, ...fields}` (one write — progress and
  the fields the step collected land together).
- A signed-out farmer is redirected to `/login` (`requireOnboarding={false}`
  on the wizard route so the gate does not loop).
- `Save & exit` persists `status: 'abandoned'` (and later returns cleanly:
  the server clears the abandonment marker when the farmer resumes — tested by
  "tracks abandonment and clears it when the farmer returns").
- Abandonment telemetry is emitted **once on unmount**, not on every step
  change: `stepRef` records the last step reached, a mount-only effect does the
  capture. (An earlier `[step]`-keyed effect fired `onboarding.abandoned` on
  every Continue tap; fixed and pinned by `onboarding.test.jsx`.)

## Offline behaviour

1. If `saveOnboarding` / `updateProfile` fails while offline, the edit is
   queued with `services/offline/profileOutbox.js#queueProfileEdit`:
   `{ id, baseRevision, profile, onboarding? }` into the shared sync queue
   under `DB_STORES.farmers`. `baseRevision` is the `profileRevision` the
   device last saw from the server.
2. When connectivity returns, `syncService.flushSync()` routes those entries by
   `STORE_ROUTES` to `POST /users/profile/sync` (batch collapsed by
   `collapseProfileEntries` — per-user payloads merged, `baseRevision` maxed,
   client-only `id` dropped; server schema strips unknown keys anyway).
3. The server applies each entry **only if** `baseRevision >= profileRevision`
   (server-wins-if-newer); otherwise the entry comes back `status: 'conflict'`
   with the server copy, and the client keeps the newer server data. A missing
   `baseRevision` counts as `0`, so a device that has never synced cannot
   overwrite anyone — and a device with an old revision cannot either.
4. `onboarding {step, status}` inside a sync entry is applied only when
   `entry.onboarding.step >= current` — the outbox can move onboarding forward
   but never backwards.
5. UI states after an offline save: the field is applied locally
   (`authStore.patchUser` merges it into `kv_user`), a notice tells the farmer
   the change is queued, and `pendingProfileEdits()` shows how many are waiting.

All five behaviours are covered by `profileSync.test.js` (6 tests) and
`profileOnboarding.test.js` (15 tests, incl. "applies offline onboarding
progress carried by the outbox" and "never rolls onboarding backwards from a
stale outbox entry").

## Completion & telemetry

- Server: `onboarding.step_completed` per forward step; `onboarding.completed`
  exactly once at the final transition — the shared helper
  `emitOnboardingCompleted(user, req, source)` in `routes/users.js` is the only
  place that fires it (sources `'wizard'` and `'sync'`), so the outbox flush
  cannot double-count.
- Client: `onboarding.started` when the wizard opens,
  `onboarding.abandoned` on `Save & exit`/unmount — nothing else, enforced by
  `CLIENT_EVENT_TYPES` in `services/telemetry/farmerEvents.js`.
- The admin funnel reads the stored `User.onboarding {step, startedAt,
  completedAt, abandonedAt}` counters — see `docs/admin/farmer-analytics.md`.

## Gate & profile

- `ProtectedRoute` (default `requireOnboarding`) sends a farmer whose
  `onboarding.status !== 'completed'` to `/onboarding`; `/profile` stays
  reachable for completed farmers (and `requireOnboarding={false}` on the
  wizard avoids redirect loops).
- After completion the same data is editable on `/profile` (online:
  `PUT /users/profile`; offline: outbox + `patchUser`).

## i18n

145 new keys under `auth.*`, `welcome.*`, `forgot.*`, `reset.*`, `verify.*`,
`onboarding.*` (incl. `step{1..6}.hint`, `irrigation.*`) and `profile.*` are
merged into all three locales (`src/i18n/locales/{en,ta,hi}.json`). Every call
uses `t(key, fallback)` so a missing translation falls back to English rather
than rendering a raw key. `User.language` additionally accepts `tanglish`
(additive, server enum only; the UI locale set stays `en/ta/hi`).

## Tests

| Suite | Tests |
|---|---|
| `backend/tests/profileOnboarding.test.js` | 15 (profile, sync conflicts, offline outbox, wizard progress, abandonment) |
| `KRISHIVERSE/src/pages/__tests__/onboarding.test.jsx` | 6 (progress a11y, per-step validation, persisted step, full 6-step walk to `completed`, `abandoned` + telemetry, signed-out redirect) |
| `KRISHIVERSE/src/services/sync/profileSync.test.js` | 6 (collapse, routing, flush) |
