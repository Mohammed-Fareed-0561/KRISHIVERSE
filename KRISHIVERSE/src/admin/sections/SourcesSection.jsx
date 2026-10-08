import React from "react";
import { useAdminData } from "../useAdminData";
import { CountBars, toEntries } from "../components/charts";
import { CountList, DataTable, ErrorNote, KeyValue, LoadingNote, Metric, Panel } from "../components/ui";

export default function SourcesSection() {
  const { data, error, loading, refresh } = useAdminData("/sources");
  if (loading && !data) return <LoadingNote />;
  if (!data) return <ErrorNote error={error} onRetry={refresh} />;

  const scan = data.sources;
  const provenance = scan.provenance;

  return (
    <div className="space-y-4">
      <ErrorNote error={error} onRetry={refresh} />
      <Panel title="Source monitoring" badge={<span className="badge badge-ghost badge-sm">{data.label}</span>} subtitle={data.note}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <Metric label="Records scanned" value={scan.total} />
          <Metric label="Citation availability" value={provenance.citationAvailabilityPct === null ? "—" : `${provenance.citationAvailabilityPct}%`} tone={provenance.citationAvailabilityPct < 50 ? "warn" : undefined} />
          <Metric label="Verified share" value={provenance.verifiedPct === null ? "—" : `${provenance.verifiedPct}%`} />
          <Metric label="Duplicate records" value={scan.duplicates.duplicateRecords} tone={scan.duplicates.duplicateRecords ? "warn" : undefined} />
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-medium mb-1">Records by source</h3>
            <CountBars data={toEntries(Object.fromEntries(scan.bySource.map((row) => [row.name, row.count])), "source")} />
          </div>
          <div>
            <h3 className="text-sm font-medium mb-1">Freshness (lastUpdated)</h3>
            <CountBars data={toEntries(scan.freshness, "bucket")} />
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-4 mt-3">
          <div>
            <h3 className="text-sm font-medium mb-1">Organizations</h3>
            <CountList title="Organizations" counts={Object.fromEntries(scan.byOrganization.map((row) => [row.name, row.count]))} />
          </div>
          <div>
            <h3 className="text-sm font-medium mb-1">Record kinds / status</h3>
            <CountList title="Kinds" counts={scan.byRecordKind} />
            <div className="mt-2">
              <CountList title="Status" counts={scan.byStatus} />
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-4 mt-3">
          <div>
            <h3 className="text-sm font-medium mb-1">Quarantine reasons</h3>
            <CountList title="Reasons" counts={Object.fromEntries(provenance.quarantineReasons.map((row) => [row.name, row.count]))} />
          </div>
          <div>
            <h3 className="text-sm font-medium mb-1">Duplicate sample</h3>
            <DataTable
              columns={[
                { key: "identity", label: "Identity (name + link)" },
                { key: "count", label: "Count" },
              ]}
              rows={scan.duplicates.sample.map((row, index) => ({ ...row, id: `${row.identity}-${index}` }))}
              empty="No duplicate identities detected."
            />
            <p className="text-xs opacity-60 mt-1">{scan.duplicates.method}</p>
          </div>
        </div>

        <div className="mt-3">
          <KeyValue
            items={[
              { label: "Dosage-bearing records", value: scan.dosage.total },
              { label: "Dosage with provenance", value: scan.dosage.withProvenance },
              { label: "Records with source", value: provenance.withSource },
              { label: "Records with source URL", value: provenance.withSourceUrl },
              { label: "Verified records", value: provenance.verified },
              { label: "Cached for", value: `${Math.round(scan.cacheTtlMs / 60000)} min` },
            ]}
          />
        </div>
      </Panel>
    </div>
  );
}
