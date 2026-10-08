import React, { useState } from "react";
import { useAdminData } from "../useAdminData";
import { adminPost, can } from "../adminApi";
import { useAdminSession } from "../sessionContext";
import { CountBars, toEntries } from "../components/charts";
import { CountList, DataTable, EmptyState, ErrorNote, LoadingNote, Metric, NotCapturedList, Panel, ProdBadge } from "../components/ui";

export default function SafetySection() {
  const { permissions } = useAdminSession();
  const { data, error, loading, refresh } = useAdminData("/safety", { intervalMs: 30000 });
  const [actionError, setActionError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (loading && !data) return <LoadingNote />;
  if (!data) return <ErrorNote error={error} onRetry={refresh} />;

  const production = data.production;
  const mayReview = can(permissions, "admin:ops");

  async function review(eventId, verdict) {
    setBusy(true);
    setActionError(null);
    try {
      await adminPost("/safety/reviews", { eventId, verdict, note: "operator review from dashboard" });
      await refresh();
    } catch (err) {
      setActionError(err?.message || "Review failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <ErrorNote error={error} onRetry={refresh} />
      <ErrorNote error={actionError} />
      <Panel title="Safety gate" badge={<ProdBadge />} note={production.note}>
        {production.empty ? (
          <EmptyState message={production.note} />
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
              <Metric label="Events" value={production.events} />
              <Metric label="Blocked" value={production.blocked} tone={production.blocked ? "warn" : undefined} />
              <Metric label="Warned" value={production.warned} />
              <Metric label="Allowed" value={production.allowed} />
              <Metric
                label="Verified dosage share"
                value={production.dosage?.verifiedSharePct === null || production.dosage?.verifiedSharePct === undefined ? "—" : `${production.dosage.verifiedSharePct}%`}
                hint={`${production.dosage?.verified ?? 0} verified / ${production.dosage?.unverified ?? 0} unverified`}
              />
            </div>
            <div className="grid lg:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium mb-1">Validator outcomes</h3>
                <CountBars data={toEntries(production.validatorOutcomes, "outcome")} />
              </div>
              <div>
                <h3 className="text-sm font-medium mb-1">Rules fired</h3>
                <CountList title="Rules" counts={production.rulesFired} />
              </div>
            </div>

            <div className="mt-4">
              <h3 className="text-sm font-medium mb-1">
                Blocked / review queue — {production.reviewQueue?.reviewed ?? 0} of {production.reviewQueue?.total ?? 0} reviewed
              </h3>
              <DataTable
                columns={[
                  { key: "eventId", label: "Event" },
                  { key: "at", label: "When" },
                  { key: "intent", label: "Intent" },
                  { key: "language", label: "Language" },
                  { key: "rules", label: "Rules" },
                  {
                    key: "reviewed",
                    label: "Review",
                    render: (row) =>
                      row.reviewed ? (
                        <span className="badge badge-ghost badge-sm">reviewed</span>
                      ) : mayReview ? (
                        <span className="flex gap-1">
                          <button type="button" className="btn btn-xs" disabled={busy} onClick={() => review(row.eventId, "correct")}>
                            Correct
                          </button>
                          <button type="button" className="btn btn-xs btn-warning" disabled={busy} onClick={() => review(row.eventId, "false-positive")}>
                            False positive
                          </button>
                          <button type="button" className="btn btn-xs btn-outline" disabled={busy} onClick={() => review(row.eventId, "needs-escalation")}>
                            Escalate
                          </button>
                        </span>
                      ) : (
                        <span className="badge badge-ghost badge-sm">read-only</span>
                      ),
                  },
                ]}
                rows={production.blockedSample || []}
                empty="No blocked events in this window."
              />
              {!mayReview ? <p className="text-xs opacity-60 mt-1">Your role has read-only access to the review queue.</p> : null}
            </div>
          </>
        )}
        <NotCapturedList items={data.notCaptured} />
      </Panel>
    </div>
  );
}
