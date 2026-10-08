# Admin Operations Runbook

Dashboard: open `/admin` in the frontend (served by the same app). API base:
`/api/admin`. All procedures below are read-only unless marked as an action.

## 0. Get access (one-time)

1. Set in `backend/.env` (see `backend/.env.example`):

   ```
   ADMIN_EMAIL=admin@example.com
   ADMIN_PASSWORD=<long unique password>
   ADMIN_ROLE=superadmin
   ```

2. Restart the backend — `provisionAdmin()` creates/updates the account
   (secrets are never logged).
3. Log in at `/admin` with those credentials. The UI shows your permission set
   from `GET /api/admin/auth/me`.

Roles: `viewer` (read), `auditor` (+ audit, incidents), `admin` (+ ops, backups,
config), `superadmin` (+ rollback/restore authority). See `admin-security.md`.

## 1. Daily glance (2 minutes)

1. **System health** — every component block should be green. Red blocks are
   independent: one being down does not imply the others are.
2. **Failures & incidents** — new 4xx/5xx codes since yesterday? 5xx rate on
   health panel should be ≤ 1 % (warn > 1 %, fail > 5 %).
3. **Readiness & DR** — note any check that flipped to `warn`/`fail`
   (especially `kb-provenance`, `kb-dosage`, `telemetry-pipeline`).
4. **Audit & logs** — unexpected actors or a spike of `access denied` entries
   (possible credential misuse or a misconfigured client).

## 2. Triage a production issue

1. **Failures & incidents** → filter by error code / feature. The log centre
   shows the redacted ring (last 500 entries) merged by level.
2. Correlate with `x-request-id` from the user report against telemetry events
   (`requestId` field, `GET /api/admin/telemetry/events?...`).
3. Open an incident:
   `POST /api/admin/incidents` `{ title, severity: sev1|sev2|sev3, ... }`
   (permission `admin:incidents`).
   Lifecycle: `open → mitigated → resolved` via
   `PATCH /api/admin/incidents/:id` (resolved sets `closedAt`; reopening clears
   it). Every state change appends to the incident timeline.
4. Mitigate, then record the outcome in the incident note.

Severity guide: **sev1** farmer-facing outage or safety-gate failure ·
**sev2** degraded feature (fallbacks, latency) · **sev3** cosmetic/admin-only.

## 3. Telemetry pipeline degraded

Symptoms: `telemetry-pipeline` check warn/fail; health panel accepted/rejected
diverging.

1. `GET /api/admin/telemetry/health` — rejection rate ≥ 5 % means a schema
   mismatch (usually a client emitting unknown fields) → fix the emitter, not
   the schema.
2. Farmer traffic is unaffected by design — do **not** block a release on
   telemetry-only issues.
3. If MongoDB writes are failing entirely, confirm farmer routes still serve
   (they must — observer is fire-and-forget), then fix storage.

## 4. Backup / verify / restore drill

Backups snapshot **secret-free** critical metadata listed in
`backend/src/admin/paths.js` (`CRITICAL_ASSETS`: KB manifest, pilot config,
package manifests, eval results). `.env`/keys are never copied.

```bash
# create
curl -X POST  $API/admin/backups -H "Authorization: Bearer $TOKEN"
# list / inspect
curl        $API/admin/backups     -H "Authorization: Bearer $TOKEN"
# verify checksums against live files
curl        $API/admin/backups/$ID/verify -H "Authorization: Bearer $TOKEN"
```

**Restore drill (performed in development/DR rehearsals only):**

```bash
curl -X POST $API/admin/backups/$ID/restore \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"confirm": true, "targetDir": "C:/scratch/kv-restore"}'
```

Guard rails (all enforced server-side):

1. body must contain `"confirm": true`
2. caller must be `superadmin`
3. writes outside `backend/backups/` require `ADMIN_ALLOW_RESTORE=true`
4. restores are recorded in the backup document (`restores[]`: actor, target,
   ok, in-area vs authorized-external) and audited

The drill never hot-swaps the running application; it only materialises files
into the target directory. Expected drill result: `ok: true` with every asset
verifying against its `sha256`.

**Recovery procedure (real incident):**

1. Take a fresh backup first (`POST /backups`) — capture current state.
2. Identify the bad change (Versions & changes panel: app/KB/git history).
3. Prefer **redeploying a known-good commit** for farmer-facing assets (KB,
   config, code live in the repository).
4. Use a restore drill to stage registry/eval metadata if it drifted.
5. Verify: readiness scorecard green, retrieval eval re-run, spot-check `/admin`
   panels.

## 5. RTO / RPO / DR status

The Readiness & DR panel shows:

- **RTO** — `ADMIN_RTO_HOURS` (default **4 h**)
- **RPO** — `ADMIN_RPO_HOURS` (default **24 h**)
- **Last restore drill** — from `restores[]` in the backup registry, or
  `performed: false` with the exact command to run one.

Scope note (shown in the panel): RTO/RPO apply to admin metadata and telemetry.
Farmer-facing KB assets live in the repository and are restored by redeploying
a known-good commit.

## 6. Version & config governance

- **Versions & changes**: app version (package.json), git commit/branch (guarded
  `execFileSync`, unavailable in restricted environments — stated as such), KB
  version from `manifest.json`, dependency map (RAG service probe), change
  histories.
- **Registries**: datasets / models / dependencies are registered entries with
  provenance fields; writes need `admin:ops` and are audited
  (`POST /api/admin/registry`).
- Config history: `GET /api/admin/versions/config-history` shows recorded
  configuration deltas — check it after any incident to see what changed.

## 7. Evaluation runs (populates the eval dashboard)

From `KRISHIVERSE/`:

```bash
npx vitest run eval            # all suites; writes eval/results/*.json
npx vitest run eval/retrieval.eval.test.js   # single dataset
```

`safety.json` and `provenance.json` are written by `afterAll` hooks that
**re-evaluate checks live**, so their numbers always describe the current build.
After any AI-behaviour change, re-run the suites and re-check the readiness
`safety-invariants` / `provenance-invariants` / `retrieval-recall` checks.

## 8. Honest limitations (do not paper over)

- Production traffic is unlabelled: the dashboard reports counts, outcomes and
  latency — **never** live "accuracy". Evaluation badges mean exactly that.
- Training loss: never available (no training pipeline telemetry).
- Client-side latency/errors: not captured until frontend farmer-path
  instrumentation lands; panels say so explicitly.
- No production rollback is executed by this system; restore is drill-oriented
  by design.
