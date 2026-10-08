# Telemetry Schema v1

Authoritative definition: `backend/src/admin/schema/eventSchema.js`.
The browser-side client (`KRISHIVERSE/src/services/telemetry/telemetryClient.js`)
normalises to the same shape but the server validator is the source of truth.

## Envelope

`POST /api/admin/telemetry` takes one event, `POST /api/admin/telemetry/batch`
takes `{ "events": [ ... ] }` (max **50**; larger batches are rejected whole).
In a batch, individual bad events are **dropped with per-event errors**, never
rejected wholesale. Duplicate `eventId`s inside one batch are dropped.

## Fields (strict allowlist — unknown fields are validation errors)

| Field | Required | Rules |
|---|---|---|
| `schemaVersion` | yes | must be `1` |
| `eventId` | no | ≤64 chars; server fills a UUID when absent |
| `eventType` | yes | enum (below) |
| `occurredAt` | yes | ISO-8601; not more than **5 min** in the future, not older than **31 days** |
| `sessionId` | yes | ≤64 chars |
| `requestId` | no | ≤64 chars (correlates to the `x-request-id` response header) |
| `feature` | yes | enum (below) |
| `intent` | no | `^[a-z0-9][a-z0-9_.-]{0,63}$` — an intent *label*, never user text |
| `language` | no | `en \| ta \| hi \| tanglish \| other` |
| `outcome` | yes | `success \| fallback \| error \| timeout \| offline` |
| `latencyMs` | no | 0–600000 |
| `errorCode` | no | `^[A-Z0-9_]{1,64}$` |
| `connectivity` | no | `online \| offline \| unknown` |
| `source` | no | object: `surface` (`web\|pwa\|offline\|server\|admin\|unknown`), `appVersion`, `locale`, `platform` (each ≤32 chars, no other keys) |
| `retrieval` | no | `{ kbVersion?, resultCount?, sourceCount?, latencyMs? }` |
| `model` | no | `{ name?, provider?, quantization?, latencyMs?, tokensPerSecond? }` |
| `safety` | no | `{ validatorOutcome: safe\|warning\|high_risk\|blocked\|none, dosageVerified: bool\|null, rulesFired: [≤20 lowercase rule ids] }` |
| `experiment` | no | `{ id, variant }` both matching the label regex, ≤32 chars |
| `metadata` | no | ≤**8** keys matching the label regex; values: finite number, boolean, or single-line string ≤**120** chars with no control characters |

Anything else (notably `message`, `answer`, `question`, free text) is rejected
by the allowlist. There is deliberately **no field for farmer content**.

## Enums

- **eventType (32):** `session.start`, `session.end`, `chatbot.request`,
  `chatbot.response`, `retrieval.query`, `retrieval.result`, `safety.block`,
  `safety.warn`, `safety.allow`, `cropdoctor.diagnose`, `model.invoke`,
  `model.fallback`, `api.request`, `sync.conflict`, `error.unhandled`,
  `health.probe`, `experiment.exposure`,
  `auth.signup_started`, `auth.signup_success`, `auth.signup_failure`,
  `auth.login_success`, `auth.login_failure`, `auth.logout`,
  `auth.verification_started`, `auth.verification_success`,
  `auth.verification_failure`, `auth.reset_started`, `auth.reset_success`,
  `onboarding.started`, `onboarding.step_completed`, `onboarding.completed`,
  `onboarding.abandoned`
- **feature (13):** `chatbot`, `cropdoctor`, `weather`, `prices`, `calendar`,
  `schemes`, `notifications`, `advice`, `decision`, `auth`, `onboarding`,
  `sync`, `other`

Ownership: the server emits the `auth.*_success` / `*_failure` / `logout` and
the `onboarding.step_completed` / `onboarding.completed` events from the route
handlers; the browser emits only `auth.signup_started`,
`auth.verification_started`, `auth.reset_started`, `onboarding.started`, and
`onboarding.abandoned` — through
`KRISHIVERSE/src/services/telemetry/farmerEvents.js`, the single allow-listed
adapter (see `KRISHIVERSE/src/admin/__tests__/isolation.test.js`).

## Example

```json
{
  "schemaVersion": 1,
  "eventType": "chatbot.response",
  "occurredAt": "2026-10-07T06:00:00.000Z",
  "sessionId": "s-abc123",
  "requestId": "b1c2…",
  "feature": "chatbot",
  "intent": "disease",
  "language": "ta",
  "outcome": "success",
  "latencyMs": 412,
  "source": { "surface": "pwa", "appVersion": "1.4.0", "locale": "ta-IN" },
  "safety": { "validatorOutcome": "safe", "dosageVerified": false, "rulesFired": [] },
  "metadata": { "kbVersion": "v2" }
}
```

## Ingestion, sampling, retention

- Server-side ingestion is **validated then persisted**; `validateEvent` never
  throws (hostile input returns `{ ok: false, errors }`).
- Passive server observation (`requestTelemetry`) samples successful requests at
  `TELEMETRY_SAMPLE_RATE` (default **0.25**); **failure responses (4xx/5xx) and
  slow requests are always kept**. Under `NODE_ENV=test` the middleware records
  nothing.
- Persistence: MongoDB `telemetryevents` (unique `eventId`) + a
  `telemetryhealth` rollup doc. The in-memory `requestCollector` keeps a ring of
  the **5 000** most recent observations for percentile math without DB queries.
- Browser client batches for 5 s or 25 events, uses `sendBeacon` when available,
  caps its queue at 200 events, and **never rejects** — capture returns a
  boolean and flush resolves `{ sent, failed }`.

## Ingestion health

`GET /api/admin/telemetry/health` reports accepted/rejected counts and the
rejection rate; the readiness check `telemetry-pipeline` passes while the
rejection rate stays **< 5 %**.
