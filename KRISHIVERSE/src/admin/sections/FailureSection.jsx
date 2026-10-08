import React, { useState } from "react";
import { useAdminData } from "../useAdminData";
import { adminPatch, adminPost, can } from "../adminApi";
import { useAdminSession } from "../sessionContext";
import { CountBars, toEntries } from "../components/charts";
import { CountList, DataTable, EmptyState, ErrorNote, LoadingNote, Metric, Panel, ProdBadge, StatusPill } from "../components/ui";

export default function FailureSection() {
  const { permissions } = useAdminSession();
  const failures = useAdminData("/failures", { intervalMs: 30000 });
  const errors = useAdminData("/errors", { intervalMs: 60000 });
  const incidents = useAdminData("/incidents", { intervalMs: 30000 });
  const [actionError, setActionError] = useState(null);
  const [busy, setBusy] = useState(false);

  const mayFile = can(permissions, "admin:incidents");
  const production = failures.data?.production;

  async function createIncident() {
    setBusy(true);
    setActionError(null);
    try {
      await adminPost("/incidents", {
        title: "Dashboard-observed degradation",
        severity: "sev3",
        summary: "Opened from the failure analysis panel.",
        impact: "Under assessment",
      });
      await incidents.refresh();
    } catch (err) {
      setActionError(err?.message || "Could not create incident");
    } finally {
      setBusy(false);
    }
  }

  async function resolveIncident(incidentId, status) {
    setBusy(true);
    setActionError(null);
    try {
      await adminPatch(`/incidents/${incidentId}`, { status, note: `marked ${status} from dashboard` });
      await incidents.refresh();
    } catch (err) {
      setActionError(err?.message || "Could not update incident");
    } finally {
      setBusy(false);
    }
  }

  if (failures.loading && !failures.data) return <LoadingNote />;
  if (!failures.data) return <ErrorNote error={failures.error} onRetry={failures.refresh} />;

  return (
    <div className="space-y-4">
      <ErrorNote error={failures.error} onRetry={failures.refresh} />
      <ErrorNote error={actionError} />

      <Panel title="Failure analysis — production" badge={<ProdBadge />} note={production.note}>
        {production.empty ? (
          <EmptyState message={production.note} />
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <Metric label="Failed events" value={production.failedEvents} />
              <Metric label="Failure share" value={production.failureSharePct === null ? "—" : `${production.failureSharePct}%`} tone={production.failureSharePct > 5 ? "bad" : undefined} />
              <Metric label="Server errors (API)" value={production.api?.serverErrors ?? 0} />
              <Metric label="Client errors (API)" value={production.api?.clientErrors ?? 0} />
            </div>
            <div className="grid lg:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium mb-1">Error codes</h3>
                <CountList title="Codes" counts={production.errorCodes} />
              </div>
              <div>
                <h3 className="text-sm font-medium mb-1">Failed events by type</h3>
                <CountBars data={toEntries(production.byEventType, "eventType")} />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-sm font-medium mb-1">Routes with errors</h3>
              <DataTable
                columns={[
                  { key: "route", label: "Route" },
                  { key: "total", label: "Requests" },
                  { key: "errors", label: "5xx" },
                ]}
                rows={production.worstRoutes || []}
                empty="No route-level errors in this window."
              />
            </div>
            <div className="mt-3">
              <h3 className="text-sm font-medium mb-1">Recent failed events</h3>
              <DataTable
                columns={[
                  { key: "eventId", label: "Event" },
                  { key: "at", label: "When" },
                  { key: "eventType", label: "Type" },
                  { key: "feature", label: "Feature" },
                  { key: "errorCode", label: "Code" },
                  { key: "outcome", label: "Outcome" },
                ]}
                rows={failures.data?.topFailures || []}
                empty="No failed events recorded."
              />
            </div>
          </>
        )}
      </Panel>

      <Panel title="Error center" badge={<StatusPill status={errors.data?.summary ? "ok" : "unknown"} />}>
        {errors.error ? (
          <ErrorNote error={errors.error} onRetry={errors.refresh} />
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <Metric label="Errors logged" value={errors.data?.summary?.total ?? 0} />
              <Metric label="By severity" value={Object.entries(errors.data?.summary?.bySeverity || {}).map(([key, value]) => `${key}:${value}`).join(" ") || "—"} />
            </div>
            <DataTable
              columns={[
                { key: "at", label: "When" },
                { key: "severity", label: "Severity" },
                { key: "scope", label: "Scope" },
                { key: "code", label: "Code" },
                { key: "route", label: "Route" },
                { key: "message", label: "Message" },
              ]}
              rows={errors.data?.errors || []}
              empty="No admin errors recorded."
            />
          </>
        )}
      </Panel>

      <Panel
        title="Incident centre"
        actions={
          mayFile ? (
            <button type="button" className="btn btn-xs btn-primary" disabled={busy} onClick={createIncident}>
              Open incident
            </button>
          ) : (
            <span className="badge badge-ghost badge-sm">read-only</span>
          )
        }
      >
        {incidents.error ? (
          <ErrorNote error={incidents.error} onRetry={incidents.refresh} />
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <Metric label="Total" value={incidents.data?.summary?.total ?? 0} />
              <Metric label="Open" value={incidents.data?.summary?.open ?? 0} tone={incidents.data?.summary?.open ? "warn" : undefined} />
              <Metric label="Sev1" value={incidents.data?.summary?.bySeverity?.sev1 ?? 0} />
              <Metric label="Resolved" value={incidents.data?.summary?.byStatus?.resolved ?? 0} />
            </div>
            <DataTable
              columns={[
                { key: "incidentId", label: "ID" },
                { key: "title", label: "Title" },
                { key: "severity", label: "Severity" },
                { key: "status", label: "Status", render: (row) => <StatusPill status={row.status === "resolved" ? "pass" : row.status === "mitigated" ? "warn" : "fail"} /> },
                { key: "openedAt", label: "Opened" },
                { key: "actions", label: "Actions", render: (row) => (mayFile ? (
                  <span className="flex gap-1">
                    {row.status !== "resolved" ? (
                      <button type="button" className="btn btn-xs" disabled={busy} onClick={() => resolveIncident(row.incidentId, "resolved")}>
                        Resolve
                      </button>
                    ) : (
                      <span className="badge badge-ghost badge-sm">closed</span>
                    )}
                  </span>
                ) : (
                  <span className="badge badge-ghost badge-sm">read-only</span>
                )) },
              ]}
              rows={incidents.data?.incidents || []}
              empty="No incidents."
            />
          </>
        )}
      </Panel>
    </div>
  );
}
