import { AddSymbolForm } from "./components/AddSymbolForm";
import { AlertsPanel } from "./components/AlertsPanel";
import { AlertToast } from "./components/AlertToast";
import { Chart } from "./components/Chart";
import { SymbolSelector } from "./components/SymbolSelector";
import { Watchlist } from "./components/Watchlist";
import { useAlerts } from "./hooks/useAlerts";
import { useStockStream } from "./hooks/useStockStream";
import { useWatchlist } from "./hooks/useWatchlist";
import { useStockStore } from "./store/stockStore";

const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:8000/ws/stocks";

function App() {
  useStockStream(WS_URL);
  const { addSymbol } = useWatchlist();
  const { createAlert, deleteAlert } = useAlerts();

  const status = useStockStore((state) => state.status);
  const watchlist = useStockStore((state) => state.watchlist);
  const selectedSymbol = useStockStore((state) => state.selectedSymbol);
  const setSelectedSymbol = useStockStore((state) => state.setSelectedSymbol);
  const alerts = useStockStore((state) => state.alerts);

  return (
    <div className="min-h-screen bg-slate-950 p-6 font-sans text-slate-100">
      <AlertToast />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">RealtimeStocks</h1>
        <p className="text-sm text-slate-400">
          Stream status:{" "}
          <strong className={status === "open" ? "text-emerald-400" : "text-amber-400"}>{status}</strong>
        </p>
      </div>

      {watchlist.length === 0 || !selectedSymbol ? (
        <p className="mt-6 text-sm text-slate-400">Loading symbols…</p>
      ) : (
        <div className="mt-6 flex gap-6">
          <div className="space-y-4">
            <Watchlist symbols={watchlist} selected={selectedSymbol} onSelect={setSelectedSymbol} />
            <AddSymbolForm onAdd={addSymbol} />
          </div>

          <div className="min-w-0 flex-1 space-y-4">
            <SymbolSelector symbols={watchlist} selected={selectedSymbol} onSelect={setSelectedSymbol} />
            <Chart symbol={selectedSymbol} />
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
