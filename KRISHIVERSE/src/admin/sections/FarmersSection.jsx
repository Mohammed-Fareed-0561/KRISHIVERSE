import React from "react";
import { useAdminData } from "../useAdminData";
import { CountBars, toEntries } from "../components/charts";
import { EmptyState, ErrorNote, LoadingNote, Metric, Panel, ProdBadge } from "../components/ui";

/**
 * Section 12 — farmer adoption & onboarding analytics.
 *
 * Read-only panel over GET /api/admin/farmers. The endpoint returns aggregates
 * only (no names, emails, or any identifier), so this component never handles
 * PII. Admin accounts are excluded server-side — the panel measures pilot
 * farmers, not staff.
 */
export default function FarmersSection() {
  const { data, error, loading, refresh } = useAdminData("/farmers", { intervalMs: 60000 });

  if (loading && !data) return <LoadingNote />;
  if (!data) return <ErrorNote error={error} onRetry={refresh} />;

  const { snapshot, activity, funnel, distributions, window } = data;
  const pct = (value) => (value === null || value === undefined ? "—" : `${value}%`);

  const byStep = (funnel.byStep || []).map((row) => ({
    name: `Step ${row.step}`,
    value: row.count,
  }));
  const districts = (distributions.district || []).map((row) => ({ name: row.key, value: row.count }));
  const crops = (distributions.crop || []).map((row) => ({ name: row.key, value: row.count }));

  return (
    <div className="space-y-4">
      <ErrorNote error={error} onRetry={refresh} />

      <Panel
        title={data.label || "Farmer adoption"}
        badge={<ProdBadge />}
        subtitle={`Aggregates only — no names, emails, or identifiers. Active window: ${window?.activeWindowHours ?? 168}h.`}
        note={data.note}
        actions={
          <button type="button" className="btn btn-xs" onClick={refresh}>
            Refresh
          </button>
        }
      >
        {!snapshot || snapshot.registered === 0 ? (
          <EmptyState message={data.note} />
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <Metric label="Registered farmers" value={snapshot.registered} hint={`excludes ${snapshot.accountsExcluded}`} />
              <Metric label="Email verified" value={snapshot.verified} hint={pct(snapshot.verifiedPct)} />
              <Metric label="Active (7d)" value={snapshot.active} hint={pct(snapshot.activePct)} />
              <Metric label="New in window" value={activity.registeredInWindow} hint={pct(activity.signupRatePct)} />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              <Metric label="Logins" value={activity.logins} />
              <Metric label="Failed logins" value={activity.failedLogins} tone={activity.failedLogins ? "warn" : undefined} />
              <Metric
                label="Login success rate"
                value={pct(activity.loginSuccessRatePct)}
                hint={`${activity.logins} ok / ${activity.failedLogins} failed`}
              />
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium mb-1">Onboarding funnel</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-2">
                  <Metric label="Started" value={funnel.started} hint={`${funnel.notStarted} not started`} />
                  <Metric label="Completed" value={funnel.completed} hint={pct(funnel.completionPct)} />
                  <Metric label="Abandoned" value={funnel.abandoned} hint={pct(funnel.abandonmentPct)} />
                  <Metric label="Completion rate" value={pct(funnel.completionPct)} />
                </div>
                <CountBars data={byStep} height={180} />
                <p className="text-xs opacity-60 mt-1">Step 0 = registered but the wizard has not been entered yet.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-1">Language</h3>
                  <CountBars data={toEntries(distributions.language, "name")} height={180} />
                </div>
                <div>
                  <h3 className="text-sm font-medium mb-1">Top districts</h3>
                  <CountBars data={districts} height={180} />
                </div>
                <div>
                  <h3 className="text-sm font-medium mb-1">Top crops</h3>
                  <CountBars data={crops} height={200} />
                </div>
              </div>
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}
