import React from "react";
import { useAdminData } from "../useAdminData";
import { CountList, EmptyState, ErrorNote, KeyValue, LoadingNote, Metric, NotCapturedList, Panel, ProdBadge } from "../components/ui";

export default function RagSection() {
  const { data, error, loading, refresh } = useAdminData("/rag", { intervalMs: 30000 });
  if (loading && !data) return <LoadingNote />;
  if (!data) return <ErrorNote error={error} onRetry={refresh} />;

  const production = data.production;
  const kb = data.kbBuildState;

  return (
    <div className="space-y-4">
      <ErrorNote error={error} onRetry={refresh} />
      <Panel title="RAG / knowledge — production" badge={<ProdBadge />} note={production.note}>
        {production.empty ? (
          <EmptyState message={production.note} />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Metric label="Queries" value={production.queries} />
            <Metric label="p95 latency" value={production.latency?.p95 === null ? "—" : `${production.latency?.p95} ms`} />
            <Metric label="Avg results" value={production.resultCount?.avg ?? "—"} />
            <Metric label="Advice API calls" value={production.apiWindow?.requests ?? 0} />
          </div>
        )}
        <div className="mt-3">
          <CountList title="KB versions in use" counts={production.kbVersionsInUse} />
        </div>
        <NotCapturedList items={data.notCaptured} />
      </Panel>

      <Panel
        title="KB build state"
        subtitle={kb?.note}
        badge={kb?.available ? <span className="badge badge-ghost badge-sm">manifest</span> : <span className="badge badge-error badge-sm">missing</span>}
      >
        {kb?.available ? (
          <KeyValue
            items={[
              { label: "KB version", value: kb.version },
              { label: "Generated", value: kb.generatedAt },
              { label: "Records", value: kb.counts.total },
              { label: "Curated", value: kb.counts.curated },
              { label: "Quarantined", value: kb.counts.quarantined },
              { label: "Verified", value: kb.counts.verified },
              { label: "With source URL", value: kb.counts.withSourceUrl },
              { label: "With dosage", value: kb.counts.withDosage },
              { label: "Conflicts", value: kb.counts.conflictCount },
              { label: "Input checksum", value: kb.inputChecksum },
            ]}
          />
        ) : (
          <EmptyState message={kb?.reason} />
        )}
      </Panel>
    </div>
  );
}
