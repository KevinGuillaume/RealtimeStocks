import { AddSymbolForm } from "./components/AddSymbolForm";
import { AlertsPanel } from "./components/AlertsPanel";
import { AlertToast } from "./components/AlertToast";
import { Chart } from "./components/Chart";
import { HelpPanel } from "./components/HelpPanel";
import { Watchlist } from "./components/Watchlist";
import { useAlerts } from "./hooks/useAlerts";
import { useStockStream } from "./hooks/useStockStream";
import { useWatchlist } from "./hooks/useWatchlist";
import { useAppDispatch, useAppSelector } from "./store/hooks";
import { setSelectedSymbol as setSelectedSymbolAction } from "./store/watchlistSlice";

const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:8000/ws/stocks";

const STATUS_LABEL: Record<string, string> = {
  open: "Live",
  connecting: "Connecting…",
  closed: "Offline",
};

function App() {
  useStockStream(WS_URL);
  const { addSymbol, removeSymbol } = useWatchlist();
  const { createAlert, deleteAlert } = useAlerts();
  const dispatch = useAppDispatch();

  const status = useAppSelector((state) => state.connection.status);
  const watchlist = useAppSelector((state) => state.watchlist.watchlist);
  const selectedSymbol = useAppSelector((state) => state.watchlist.selectedSymbol);
  const setSelectedSymbol = (symbol: string) => dispatch(setSelectedSymbolAction(symbol));
  const alerts = useAppSelector((state) => state.alerts.alerts);

  return (
    <div className="flex h-screen flex-col bg-[var(--stx-bg)] font-sans text-[var(--stx-text)]">
      <AlertToast />

      <header className="flex shrink-0 items-center gap-4 border-b border-[var(--stx-divider)] px-4 py-3">
        <span className="flex-1 text-lg font-semibold">Market Alerts and Watch</span>
        <span
          className={`shrink-0 rounded px-2.5 py-1 text-xs font-medium ${
            status === "open"
              ? "bg-[var(--stx-accent-dim)] text-[var(--stx-accent)]"
              : "bg-[var(--stx-surface-2)] text-[var(--stx-text-dim)]"
          }`}
        >
          {STATUS_LABEL[status] ?? status}
        </span>
      </header>

      <HelpPanel />

      {watchlist.length === 0 || !selectedSymbol ? (
        <p className="p-6 text-sm text-[var(--stx-text-dim)]">Loading symbols…</p>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-[260px_1fr_280px]">
          <div className="flex min-h-0 flex-col border-r border-[var(--stx-divider)]">
            <Watchlist symbols={watchlist} selected={selectedSymbol} onSelect={setSelectedSymbol} onRemove={removeSymbol} />
            <AddSymbolForm onAdd={addSymbol} />
          </div>

          <div className="min-h-0 min-w-0 border-r border-[var(--stx-divider)] p-3">
            <Chart symbol={selectedSymbol} />
          </div>

          <div className="min-h-0 p-3">
            <AlertsPanel
              symbols={watchlist}
              selected={selectedSymbol}
              alerts={alerts}
              onCreate={createAlert}
              onDelete={deleteAlert}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
