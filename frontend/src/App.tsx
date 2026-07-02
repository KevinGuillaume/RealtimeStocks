import { useStockStream } from "./hooks/useStockStream";
import { formatPrice, formatTime } from "./utilities/format";

const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:8000/ws/stocks";

function App() {
  const { symbols, status } = useStockStream(WS_URL);
  const rows = Object.values(symbols).sort((a, b) => a.symbol.localeCompare(b.symbol));

  return (
    <div className="min-h-screen bg-slate-950 p-6 font-sans text-slate-100">
      <h1 className="text-2xl font-semibold tracking-tight">RealtimeStocks</h1>
      <p className="mt-1 text-sm text-slate-400">
        Stream status:{" "}
        <strong
          className={
            status === "open" ? "text-emerald-400" : "text-amber-400"
          }
        >
          {status}
        </strong>
      </p>

      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-slate-400">Waiting for ticks…</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full min-w-max border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3 font-medium">Symbol</th>
                <th className="px-4 py-3 font-medium">Last Trade</th>
                <th className="px-4 py-3 font-medium">Bid</th>
                <th className="px-4 py-3 font-medium">Ask</th>
                <th className="px-4 py-3 font-medium">Bar Close</th>
                <th className="px-4 py-3 font-medium">
                  Volume <span className="normal-case text-slate-500">(shares)</span>
                </th>
                <th className="px-4 py-3 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {rows.map(({ symbol, trade, quote, bar }) => (
                <tr key={symbol} className="odd:bg-slate-950 even:bg-slate-900/50 hover:bg-slate-800/60">
                  <td className="px-4 py-3 font-semibold text-slate-100">{symbol}</td>
                  <td className="px-4 py-3 font-mono tabular-nums">{formatPrice(trade?.price)}</td>
                  <td className="px-4 py-3 font-mono tabular-nums text-slate-300">{formatPrice(quote?.bid_price)}</td>
                  <td className="px-4 py-3 font-mono tabular-nums text-slate-300">{formatPrice(quote?.ask_price)}</td>
                  <td className="px-4 py-3 font-mono tabular-nums text-slate-300">{formatPrice(bar?.close)}</td>
                  <td className="px-4 py-3 font-mono tabular-nums text-slate-300">{bar?.volume ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {formatTime(trade?.timestamp ?? quote?.timestamp ?? bar?.timestamp)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default App;
