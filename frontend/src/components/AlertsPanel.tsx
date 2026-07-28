import { useState } from "react";
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
    <div className="rounded-lg border border-slate-800 bg-slate-900">
      <div className="border-b border-slate-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-100">Alerts</h2>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2 px-4 py-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-500">Symbol</span>
          <select
            value={activeSymbol}
            onChange={(event) => setSymbol(event.target.value)}
            className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
          >
            {symbols.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-500">Condition</span>
          <select
            value={condition}
            onChange={(event) => setCondition(event.target.value as AlertCondition)}
            className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
          >
            {(Object.keys(CONDITION_LABELS) as AlertCondition[]).map((key) => (
              <option key={key} value={key}>
                {CONDITION_LABELS[key]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-500">Threshold</span>
          <input
            value={threshold}
            onChange={(event) => setThreshold(event.target.value)}
            type="number"
            step="any"
            placeholder={condition === "pct_change" ? "0.02 = 2%" : "price"}
            className="w-28 rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
          />
        </label>

        <button
          type="submit"
          disabled={submitting || !threshold}
          className="rounded-md bg-emerald-500 px-3 py-1.5 text-sm font-medium text-slate-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Create alert
        </button>
      </form>
      {error && <p className="px-4 pb-2 text-xs text-red-400">{error}</p>}

      {alerts.length > 0 && (
        <>
          <h3 className="px-4 pt-3 text-xs font-semibold text-slate-500">Active Alerts:</h3>
          <ul className="space-y-2 border-t border-slate-800 px-4 py-3">
            {alerts.map((alert) => (
              <li
                key={alert.id}
                className="flex items-center justify-between gap-3 rounded-md border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm"
              >
                <span className={alert.active ? "text-slate-200" : "text-slate-500 line-through"}>
                  <span className="mr-2 rounded bg-slate-800 px-1.5 py-0.5 text-xs font-semibold text-emerald-400">
                    {alert.symbol}
                  </span>
                  {CONDITION_LABELS[alert.condition]}{" "}
                  {alert.condition === "pct_change" ? alert.threshold : formatPrice(alert.threshold)}
                </span>
                <button
                  type="button"
                  onClick={() => onDelete(alert.id)}
                  className="shrink-0 rounded-md px-2 py-1 text-xs text-slate-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                >
                  remove
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
