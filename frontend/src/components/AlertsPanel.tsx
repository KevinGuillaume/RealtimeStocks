import { useEffect, useState } from "react";
import { fetchAppStatus } from "../api/status";
import type { Alert, AlertCondition } from "../types/stocks";
import type { NewAlert } from "../hooks/useAlerts";
import { formatPrice } from "../utilities/format";

interface AlertsPanelProps {
  symbols: string[];
  selected: string;
  alerts: Alert[];
  onCreate: (alert: NewAlert) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

const CONDITION_LABELS: Record<AlertCondition, string> = {
  price_above: "price above",
  price_below: "price below",
  pct_change: "% change from baseline",
};

export function AlertsPanel({ symbols, selected, alerts, onCreate, onDelete }: AlertsPanelProps) {
  const [symbol, setSymbol] = useState(selected);
  const [condition, setCondition] = useState<AlertCondition>("price_above");
  const [threshold, setThreshold] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [slackConnected, setSlackConnected] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchAppStatus()
      .then((status) => {
        if (!cancelled) setSlackConnected(status.slack_connected);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const activeSymbol = symbols.includes(symbol) ? symbol : (selected ?? symbols[0] ?? "");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = Number(threshold);
    if (!activeSymbol || !Number.isFinite(parsed)) return;

    setSubmitting(true);
    setError(null);
    try {
      await onCreate({ symbol: activeSymbol, condition, threshold: parsed });
      setThreshold("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed to create alert");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col rounded-lg border border-[var(--stx-divider)] bg-[var(--stx-surface)]">
      <div className="flex shrink-0 items-center gap-1.5 border-b border-[var(--stx-divider)] px-3 py-2.5 text-sm font-medium">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        Active alerts
      </div>

      {!slackConnected && (
        <div className="shrink-0 border-b border-[var(--stx-divider)] bg-[var(--stx-down)]/10 px-3 py-2 text-[11px] text-[var(--stx-down)]">
          Slack webhook not connected
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2.5">
        {alerts.length === 0 && <p className="px-1 text-xs text-[var(--stx-text-dim)]">No alerts yet.</p>}
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`rounded-md bg-[var(--stx-surface-2)] px-2.5 py-2 ${alert.active ? "" : "opacity-50"}`}
          >
            <div className="flex items-center gap-1.5">
              <span className="shrink-0 rounded bg-[var(--stx-accent-dim)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--stx-accent)]">
                {alert.symbol}
              </span>
              <span
                className={`min-w-0 flex-1 truncate text-xs ${alert.active ? "" : "line-through"}`}
                title={`${CONDITION_LABELS[alert.condition]} ${
                  alert.condition === "pct_change" ? alert.threshold : formatPrice(alert.threshold)
                }`}
              >
                {CONDITION_LABELS[alert.condition]}{" "}
                {alert.condition === "pct_change" ? alert.threshold : formatPrice(alert.threshold)}
              </span>
              <button
                type="button"
                onClick={() => onDelete(alert.id)}
                className="shrink-0 text-[var(--stx-text-dim)] hover:text-[var(--stx-down)]"
                aria-label="Remove alert"
              >
                ×
              </button>
            </div>
            {alert.active && (
              <div className="mt-1 text-[11px] text-[var(--stx-text-dim)]">triggers on next tick</div>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="shrink-0 border-t border-[var(--stx-divider)] p-2.5">
        <div className="flex flex-col gap-1.5">
          <select
            value={activeSymbol}
            onChange={(event) => setSymbol(event.target.value)}
            className="min-h-[30px] rounded-md border border-[var(--stx-divider)] bg-[var(--stx-surface-2)] px-2 text-xs focus:border-[var(--stx-accent)] focus:outline-none"
          >
            {symbols.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={condition}
            onChange={(event) => setCondition(event.target.value as AlertCondition)}
            className="min-h-[30px] rounded-md border border-[var(--stx-divider)] bg-[var(--stx-surface-2)] px-2 text-xs focus:border-[var(--stx-accent)] focus:outline-none"
          >
            {(Object.keys(CONDITION_LABELS) as AlertCondition[]).map((key) => (
              <option key={key} value={key}>
                {CONDITION_LABELS[key]}
              </option>
            ))}
          </select>
          <input
            value={threshold}
            onChange={(event) => setThreshold(event.target.value)}
            type="number"
            step="any"
            placeholder={condition === "pct_change" ? "0.02 = 2%" : "Threshold"}
            className="min-h-[30px] rounded-md border border-[var(--stx-divider)] bg-[var(--stx-surface-2)] px-2 text-xs placeholder:text-[var(--stx-text-dim)] focus:border-[var(--stx-accent)] focus:outline-none"
          />
          <button
            type="submit"
            disabled={submitting || !threshold}
            className="min-h-[30px] rounded-md border border-[var(--stx-accent)] text-xs font-medium text-[var(--stx-accent)] transition-colors hover:bg-[var(--stx-accent-dim)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Create alert
          </button>
        </div>
        {error && <p className="mt-1.5 text-[11px] text-[var(--stx-down)]">{error}</p>}
      </form>
    </div>
  );
}
