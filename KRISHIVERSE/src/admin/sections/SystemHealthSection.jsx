import React from "react";
import { useAdminData } from "../useAdminData";
import { CountBars, LatencyBars, toEntries } from "../components/charts";
import { CountList, DataTable, ErrorNote, KeyValue, LoadingNote, Metric, Panel, StatusPill } from "../components/ui";

export default function SystemHealthSection() {
  const { data, error, loading, refresh } = useAdminData("/health", { intervalMs: 30000 });

  if (loading && !data) return <LoadingNote />;
  if (!data) return <ErrorNote error={error} onRetry={refresh} />;

  const { blocks, monitoringPipeline, status } = data;
  const api = blocks.api || {};
  const totals = api.totals || {};

  return (
    <div className="space-y-4">
      <ErrorNote error={error} onRetry={refresh} />
      <Panel title="System status" badge={<StatusPill status={status} />} note={`Generated ${data.generatedAt}`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Metric label="Uptime" value={`${Math.floor((blocks.uptime?.seconds || 0) / 60)}m`} hint={blocks.uptime?.since} />
          <Metric label="Node" value={blocks.process?.node} hint={blocks.process?.environment} />
          <Metric label="Memory (RSS)" value={blocks.process?.memoryMb ? `${blocks.process.memoryMb} MB` : null} />
          <Metric label="Database" value={blocks.database?.label} tone={blocks.database?.ok ? undefined : "bad"} />
        </div>
      </Panel>

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Farmer API traffic" subtitle="Rolling in-process window — resets when the backend restarts">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <Metric label="Requests" value={totals.total ?? 0} />
            <Metric label="2xx" value={totals.success ?? 0} />
            <Metric label="4xx" value={totals.clientErrors ?? 0} />
            <Metric label="5xx" value={totals.serverErrors ?? 0} tone={totals.serverErrors ? "bad" : undefined} />
          </div>
          <LatencyBars latency={api.latency} />
          <div className="text-xs opacity-60 mt-1">
            p50 {api.latency?.p50 ?? "—"} ms · p95 {api.latency?.p95 ?? "—"} ms · p99 {api.latency?.p99 ?? "—"} ms
          </div>
          <div className="mt-3">
            <CountBars data={toEntries(totals.byFeature, "feature")} />
          </div>
        </Panel>

        <Panel title="Telemetry pipeline" badge={<StatusPill status={blocks.telemetry?.status} />}>
          <KeyValue
            items={[
              { label: "Accepted", value: blocks.telemetry?.totalAccepted ?? 0 },
              { label: "Rejected", value: blocks.telemetry?.totalRejected ?? 0 },
              { label: "Duplicates", value: blocks.telemetry?.totalDuplicates ?? 0 },
              { label: "Rejection rate", value: blocks.telemetry?.rejectionRatePct === null || blocks.telemetry?.rejectionRatePct === undefined ? "—" : `${blocks.telemetry.rejectionRatePct}%` },
              { label: "Last event", value: blocks.telemetry?.lastEventAt || "never" },
              { label: "Collector", value: monitoringPipeline?.collector },
              { label: "Sampling", value: monitoringPipeline?.sampling },
            ]}
          />
          <p className="text-xs opacity-70 mt-3">{monitoringPipeline?.isolation}</p>
          <div className="mt-3">
            <CountList title="Rejection reasons" counts={blocks.telemetry?.rejectedByReason} />
          </div>
        </Panel>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Dependencies" badge={<StatusPill status={blocks.dependencies?.status} />}>
          <DataTable
            columns={[
              { key: "name", label: "Dependency" },
              { key: "kind", label: "Kind" },
              { key: "configured", label: "Configured" },
              { key: "reachable", label: "Reachable" },
              { key: "note", label: "Note", render: (row) => row.note || row.probeNote || "—" },
            ]}
            rows={blocks.dependencies?.dependencies || []}
          />
        </Panel>

        <Panel title="Versions" badge={<StatusPill status={blocks.versions?.status} />}>
          <KeyValue
            items={[
              { label: "Commit", value: blocks.versions?.git?.shortCommit || "unavailable" },
              { label: "Branch", value: blocks.versions?.git?.branch },
              { label: "Dirty tree", value: blocks.versions?.git?.dirty },
              { label: "Last commit", value: blocks.versions?.git?.lastCommitSubject },
              { label: "Backend version", value: blocks.versions?.build?.backend?.version },
              { label: "Frontend version", value: blocks.versions?.build?.frontend?.version },
              { label: "KB version", value: blocks.versions?.kb?.version },
              { label: "KB records", value: blocks.versions?.kb?.recordCount },
            ]}
          />
        </Panel>
      </div>

      <Panel title="Readiness" badge={<StatusPill status={blocks.readiness?.status} />}>
        <div className="flex items-center gap-4">
          <Metric label="Score" value={blocks.readiness?.scorePct === null ? "n/a" : `${blocks.readiness?.scorePct}%`} />
          <div className="text-sm">
            <div>
              Failing: {blocks.readiness?.failing?.length ? blocks.readiness.failing.join(", ") : "none"}
            </div>
            <div className="opacity-70">
              Warnings: {blocks.readiness?.warnings?.length ? blocks.readiness.warnings.join(", ") : "none"}
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
