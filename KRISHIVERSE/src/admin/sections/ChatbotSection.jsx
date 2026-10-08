import React from "react";
import { useAdminData } from "../useAdminData";
import { CountBars, CountDonut, LatencyBars, toEntries } from "../components/charts";
import { CountList, EmptyState, ErrorNote, LoadingNote, Metric, NotCapturedList, Panel, ProdBadge } from "../components/ui";

export default function ChatbotSection() {
  const { data, error, loading, refresh } = useAdminData("/chatbot", { intervalMs: 30000 });
  if (loading && !data) return <LoadingNote />;
  if (!data) return <ErrorNote error={error} onRetry={refresh} />;

  const production = data.production;

  return (
    <div className="space-y-4">
      <ErrorNote error={error} onRetry={refresh} />
      <Panel title="Chatbot" badge={<ProdBadge />} subtitle={`Window ${data.window?.from} → ${data.window?.to}`} note={production.note}>
        {production.empty ? (
          <EmptyState message={production.note} />
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <Metric label="Requests" value={production.requests} />
              <Metric label="Offline share" value={production.offlineSharePct === null ? "—" : `${production.offlineSharePct}%`} />
              <Metric label="p95 latency" value={production.latency?.p95 === null ? "—" : `${production.latency?.p95} ms`} />
              <Metric label="API window calls" value={production.apiWindow?.requests ?? 0} hint={production.apiWindow ? `${production.apiWindow.errors} errors` : undefined} />
            </div>
            <div className="grid lg:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium mb-1">Outcomes</h3>
                <CountBars data={toEntries(production.byOutcome, "outcome")} />
              </div>
              <div>
                <h3 className="text-sm font-medium mb-1">Intent labels reported by clients</h3>
                <CountList title="Intents" counts={production.intents} />
              </div>
              <div>
                <h3 className="text-sm font-medium mb-1">Latency</h3>
                <LatencyBars latency={production.latency} />
              </div>
              <div>
                <h3 className="text-sm font-medium mb-1">Connectivity</h3>
                <CountDonut data={toEntries(production.byConnectivity, "mode")} />
              </div>
            </div>
            <div className="grid lg:grid-cols-2 gap-4 mt-3">
              <div>
                <h3 className="text-sm font-medium mb-1">Languages</h3>
                <CountList title="Languages" counts={production.byLanguage} />
              </div>
              <div>
                <h3 className="text-sm font-medium mb-1">Error codes</h3>
                <CountList title="Errors" counts={production.errorCodes} />
              </div>
            </div>
          </>
        )}
        <NotCapturedList items={data.notCaptured} />
      </Panel>
    </div>
  );
}
