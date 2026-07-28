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

        <input
          value={threshold}
          onChange={(event) => setThreshold(event.target.value)}
          type="number"
          step="any"
          placeholder={condition === "pct_change" ? "0.02 = 2%" : "price"}
          className="w-28 rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
        />

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
        <ul className="divide-y divide-slate-800 border-t border-slate-800">
          {alerts.map((alert) => (
            <li key={alert.id} className="flex items-center justify-between px-4 py-2 text-sm">
              <span className={alert.active ? "text-slate-200" : "text-slate-500 line-through"}>
                {alert.symbol} {CONDITION_LABELS[alert.condition]}{" "}
                {alert.condition === "pct_change" ? alert.threshold : formatPrice(alert.threshold)}
              </span>
              <button
                type="button"
                onClick={() => onDelete(alert.id)}
                className="text-xs text-slate-500 transition-colors hover:text-red-400"
              >
                remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
