import React from "react";
import { useAdminData } from "../useAdminData";
import { CountBars, CountDonut, toEntries } from "../components/charts";
import { CountList, DataTable, EmptyState, ErrorNote, EvalBadge, KeyValue, LoadingNote, Metric, NotCapturedList, Panel, ProdBadge } from "../components/ui";

export default function LanguageSection() {
  const { data, error, loading, refresh } = useAdminData("/languages", { intervalMs: 30000 });
  if (loading && !data) return <LoadingNote />;
  if (!data) return <ErrorNote error={error} onRetry={refresh} />;

  const production = data.production;
  const evaluation = data.evaluation;

  return (
    <div className="space-y-4">
      <ErrorNote error={error} onRetry={refresh} />
      <Panel title="Language coverage — production" badge={<ProdBadge />} note={production.note}>
        {production.empty ? (
          <EmptyState message={production.note} />
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
              <Metric label="Tagged events" value={production.taggedEvents} />
              <Metric label="Languages seen" value={Object.keys(production.byLanguage || {}).length} />
              <Metric label="Share of traffic" value={`${Object.keys(production.sharePct || {}).length} languages`} />
            </div>
            <div className="grid lg:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium mb-1">Events by language</h3>
                <CountBars data={toEntries(production.byLanguage, "language")} />
              </div>
              <div>
                <h3 className="text-sm font-medium mb-1">Share of tagged events</h3>
                <CountDonut data={toEntries(production.sharePct, "language")} />
              </div>
            </div>
          </>
        )}
        <NotCapturedList items={data.notCaptured} />
      </Panel>

      <Panel title="Language coverage — evaluation" badge={<EvalBadge />}>
        <DataTable
          columns={[
            { key: "dataset", label: "Dataset" },
            { key: "languages", label: "Languages covered" },
          ]}
          rows={Object.entries(evaluation.coverage || {}).map(([dataset, languages]) => ({ dataset, languages: languages.join(", ") }))}
          empty="No evaluation language coverage available."
        />
      </Panel>
    </div>
  );
}

export function CoverageSection() {
  const { data, error, loading, refresh } = useAdminData("/coverage", { intervalMs: 60000 });
  if (loading && !data) return <LoadingNote />;
  if (!data) return <ErrorNote error={error} onRetry={refresh} />;

  const coverage = data.coverage;
  const evaluation = data.evaluation;

  return (
    <div className="space-y-4">
      <ErrorNote error={error} onRetry={refresh} />
      <Panel title="Data coverage — KB state" subtitle={data.kbState?.note}>
        {coverage ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <Metric label="Crop-linked" value={coverage.cropLinkedPct === null ? "—" : `${coverage.cropLinkedPct}%`} />
              <Metric label="Provenance" value={coverage.provenancePct === null ? "—" : `${coverage.provenancePct}%`} tone={coverage.provenancePct < 1 ? "bad" : "warn"} />
              <Metric label="Verified" value={coverage.verifiedPct === null ? "—" : `${coverage.verifiedPct}%`} />
              <Metric label="Quarantined" value={coverage.quarantined} hint={`${coverage.quarantinePct ?? 0}% of KB`} />
            </div>
            <KeyValue
              items={[
                { label: "Dosage records", value: coverage.dosageRecords },
                { label: "Orphan treatments", value: coverage.orphanTreatments },
                { label: "Unresolved edges", value: coverage.unresolvedEdges },
                { label: "Field conflicts", value: coverage.conflictCount },
              ]}
            />
          </>
        ) : (
          <EmptyState message={data.kbState?.reason || "KB state unavailable."} />
        )}
      </Panel>

      <Panel title="Production — features exercised" badge={<ProdBadge />}>
        <CountList title="Features" counts={data.production?.eventsByFeature} />
      </Panel>

      <Panel title="Coverage — evaluation" badge={<EvalBadge />} note={evaluation?.note}>
        <KeyValue
          items={[
            { label: "Retrieval topics", value: evaluation?.retrievalTopics?.join(", ") || "—" },
            { label: "Retrieval languages", value: evaluation?.retrievalLanguages?.join(", ") || "—" },
            { label: "Uncovered topics", value: evaluation?.uncoveredTopics?.join(", ") || "none" },
          ]}
        />
      </Panel>
    </div>
  );
}
