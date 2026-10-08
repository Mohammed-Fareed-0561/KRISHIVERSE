import React from "react";
import { useAdminData } from "../useAdminData";
import { DataTable, ErrorNote, LoadingNote, Metric, Panel, ProdBadge } from "../components/ui";

export default function AuditSection() {
  const audit = useAdminData("/audit?limit=200", { intervalMs: 30000 });
  const summary = useAdminData("/audit/summary", { intervalMs: 30000 });
  const logs = useAdminData("/logs?limit=200", { intervalMs: 15000 });

  if (audit.loading && !audit.data) return <LoadingNote />;
  if (!audit.data) return <ErrorNote error={audit.error} onRetry={audit.refresh} />;

  return (
    <div className="space-y-4">
      <ErrorNote error={audit.error} onRetry={audit.refresh} />

      <Panel title="Audit summary" badge={<ProdBadge />} note={summary.data?.summary?.retention}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <Metric label="Entries" value={summary.data?.summary?.total ?? 0} />
          <Metric label="Allowed" value={summary.data?.summary?.byResult?.allowed ?? 0} />
          <Metric label="Denied" value={summary.data?.summary?.byResult?.denied ?? 0} tone={summary.data?.summary?.byResult?.denied ? "warn" : undefined} />
          <Metric label="Failed" value={summary.data?.summary?.byResult?.failed ?? 0} />
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-medium mb-1">By actor</h3>
            <DataTable
              columns={[{ key: "actor", label: "Actor" }, { key: "count", label: "Entries" }]}
              rows={Object.entries(summary.data?.summary?.byActor || {}).map(([actor, count]) => ({ actor, count, id: actor }))}
            />
          </div>
          <div>
            <h3 className="text-sm font-medium mb-1">By action</h3>
            <DataTable
              columns={[{ key: "action", label: "Action" }, { key: "count", label: "Entries" }]}
              rows={Object.entries(summary.data?.summary?.byAction || {}).map(([action, count]) => ({ action, count, id: action }))}
            />
          </div>
        </div>
      </Panel>

      <Panel title="Audit trail" subtitle="Append-only: there is no endpoint that updates or deletes an audit entry.">
        <DataTable
          columns={[
            { key: "at", label: "When" },
            { key: "actorLabel", label: "Actor" },
            { key: "actorRole", label: "Role" },
            { key: "action", label: "Action" },
            { key: "target", label: "Target" },
            { key: "result", label: "Result" },
            { key: "ipPrefix", label: "IP (masked)" },
          ]}
          rows={audit.data.entries || []}
          empty="No audit entries yet."
        />
      </Panel>

      <Panel
        title="Log centre"
        badge={<span className="badge badge-ghost badge-sm">redacted</span>}
        note={logs.data?.redaction}
      >
        <ErrorNote error={logs.error} onRetry={logs.refresh} />
        <DataTable
          columns={[
            { key: "at", label: "When" },
            { key: "source", label: "Source" },
            { key: "level", label: "Level" },
            { key: "scope", label: "Scope" },
            { key: "message", label: "Message" },
            { key: "status", label: "Status" },
          ]}
          rows={logs.data?.entries || []}
          empty="No log entries yet."
        />
        <p className="text-xs opacity-60 mt-1">Sources: {(logs.data?.sources || []).join(" · ")}</p>
      </Panel>
    </div>
  );
}
