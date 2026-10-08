import React from "react";
import { useAdminData } from "../useAdminData";
import { CountBars, LatencyBars, toEntries } from "../components/charts";
import { CountList, DataTable, EmptyState, ErrorNote, EvalBadge, KeyValue, LoadingNote, Metric, NotCapturedList, Panel, ProdBadge } from "../components/ui";

export default function CropDoctorSection() {
  const { data, error, loading, refresh } = useAdminData("/cropdoctor", { intervalMs: 30000 });
  if (loading && !data) return <LoadingNote />;
  if (!data) return <ErrorNote error={error} onRetry={refresh} />;

  const production = data.production;
  const evaluation = data.evaluation;
  const confusion = evaluation?.metrics?.confusion;

  return (
    <div className="space-y-4">
      <ErrorNote error={error} onRetry={refresh} />

      <Panel title="Crop Doctor — production" badge={<ProdBadge />} note={production.note}>
        {production.empty ? (
          <EmptyState message={production.note} />
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <Metric label="Diagnoses" value={production.diagnoses} />
              <Metric label="Abstentions" value={production.abstentions} />
              <Metric label="p95 latency" value={production.latency?.p95 === null ? "—" : `${production.latency?.p95} ms`} />
              <Metric label="Errors" value={Object.values(production.errorCodes || {}).reduce((sum, value) => sum + value, 0)} />
            </div>
            <div className="grid lg:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium mb-1">Outcomes</h3>
                <CountBars data={toEntries(production.byOutcome, "outcome")} />
              </div>
              <div>
                <h3 className="text-sm font-medium mb-1">Latency</h3>
                <LatencyBars latency={production.latency} />
              </div>
            </div>
          </>
        )}
        <NotCapturedList items={data.notCaptured} />
      </Panel>

      <Panel title="Crop Doctor — evaluation" badge={<EvalBadge />} subtitle={evaluation?.origin || evaluation?.reason}>
        {!evaluation?.available ? (
          <EmptyState message={evaluation?.reason} />
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <Metric label="Text top-1 accuracy" value={evaluation.metrics.textTop1Accuracy === null ? "—" : `${evaluation.metrics.textTop1Accuracy}%`} />
              <Metric label="Text top-3 accuracy" value={evaluation.metrics.textTop3Accuracy === null ? "—" : `${evaluation.metrics.textTop3Accuracy}%`} />
              <Metric label="ONNX top-1 accuracy" value={evaluation.metrics.onnxTop1Accuracy === null ? "—" : `${evaluation.metrics.onnxTop1Accuracy}%`} hint={evaluation.metrics.onnxTotal ? `${evaluation.metrics.onnxCorrect}/${evaluation.metrics.onnxTotal}` : undefined} />
              <Metric label="Abstention rate" value={evaluation.metrics.abstentionRate === null ? "—" : `${evaluation.metrics.abstentionRate}%`} />
            </div>

            {confusion ? (
              <div className="mb-3">
                <h3 className="text-sm font-medium mb-1">Confusion matrix (labelled set)</h3>
                <DataTable
                  columns={[
                    { key: "label", label: "Actual" },
                    ...confusion.labels.map((label) => ({ key: label, label: `→ ${label}`, render: (row) => String(row.matrix[row.label]?.[label] ?? 0) })),
                    { key: "support", label: "Support" },
                  ]}
                  rows={confusion.labels.map((label) => ({ label, matrix: confusion.matrix, support: confusion.support[label] }))}
                />
              </div>
            ) : null}

            {evaluation.metrics.perClass ? (
              <div className="mb-3">
                <h3 className="text-sm font-medium mb-1">Per-class precision / recall / F1</h3>
                <DataTable
                  columns={[
                    { key: "name", label: "Class" },
                    { key: "precision", label: "Precision", render: (row) => (row.precision === null ? "—" : `${row.precision}%`) },
                    { key: "recall", label: "Recall", render: (row) => (row.recall === null ? "—" : `${row.recall}%`) },
                    { key: "f1", label: "F1", render: (row) => (row.f1 === null ? "—" : `${row.f1}%`) },
                    { key: "support", label: "Support" },
                  ]}
                  rows={Object.entries(evaluation.metrics.perClass).map(([name, values]) => ({ name, ...values }))}
                />
              </div>
            ) : null}

            <div className="grid lg:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium mb-1">Row kinds</h3>
                <CountList title="Rows" counts={evaluation.facets?.rowKinds} />
              </div>
              <div>
                <h3 className="text-sm font-medium mb-1">Latency (text matcher rows)</h3>
                <LatencyBars latency={evaluation.metrics.latency} />
              </div>
            </div>

            <div className="mt-3">
              <h3 className="text-sm font-medium mb-1">Methodology limitations</h3>
              <ul className="text-xs space-y-1 opacity-80">
                {(evaluation.limitations || []).map((line) => (
                  <li key={line}>• {line}</li>
                ))}
              </ul>
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}

export function ModelSection() {
  const { data, error, loading, refresh } = useAdminData("/models", { intervalMs: 30000 });
  if (loading && !data) return <LoadingNote />;
  if (!data) return <ErrorNote error={error} onRetry={refresh} />;

  const production = data.production;
  const evaluation = data.evaluation;

  return (
    <div className="space-y-4">
      <ErrorNote error={error} onRetry={refresh} />
      <Panel title="Model quality & performance — production" badge={<ProdBadge />} note={production.note}>
        {production.empty ? (
          <EmptyState message={production.note} />
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <Metric label="Invocations" value={production.invocations} />
              <Metric label="Fallbacks" value={production.fallbacks} tone={production.fallbacks ? "warn" : undefined} />
              <Metric label="Fallback share" value={production.fallbackSharePct === null ? "—" : `${production.fallbackSharePct}%`} />
              <Metric label="p95 latency" value={production.latency?.p95 === null ? "—" : `${production.latency?.p95} ms`} />
            </div>
            <DataTable
              columns={[
                { key: "name", label: "Model" },
                { key: "count", label: "Events" },
                { key: "providers", label: "Providers" },
                { key: "p95", label: "p95", render: (row) => (row.latency?.p95 === null ? "—" : `${row.latency?.p95} ms`) },
                { key: "max", label: "Max", render: (row) => (row.latency?.max === null ? "—" : `${row.latency.max} ms`) },
              ]}
              rows={production.byName || []}
              empty="No model events in this window."
            />
          </>
        )}
        <NotCapturedList items={data.notCaptured} />
      </Panel>

      <Panel title="Model evaluation" badge={<EvalBadge />}>
        <div className="grid lg:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-medium mb-1">Chatbot screening set</h3>
            {evaluation.chatbot.available ? (
              <KeyValue
                items={[
                  { label: "Accuracy", value: evaluation.chatbot.accuracy === null ? "—" : `${Math.round(evaluation.chatbot.accuracy * 100)}%` },
                  { label: "Cases", value: evaluation.chatbot.n },
                  { label: "Origin", value: evaluation.chatbot.origin },
                ]}
              />
            ) : (
              <EmptyState message={evaluation.chatbot.reason} />
            )}
          </div>
          <div>
            <h3 className="text-sm font-medium mb-1">Multilingual screening set</h3>
            {evaluation.multilingual.available ? (
              <KeyValue
                items={[
                  { label: "Languages", value: evaluation.multilingual.metrics.languages },
                  { label: "Intent accuracy", value: evaluation.multilingual.metrics.intentAccuracy },
                  { label: "Crop accuracy", value: evaluation.multilingual.metrics.cropAccuracy },
                  { label: "Retrieval accuracy", value: evaluation.multilingual.metrics.retrievalAccuracy },
                ]}
              />
            ) : (
              <EmptyState message={evaluation.multilingual.reason} />
            )}
          </div>
        </div>
        <p className="text-xs opacity-70 mt-3">These are evaluation numbers only — they are not production accuracy.</p>
      </Panel>
    </div>
  );
}
