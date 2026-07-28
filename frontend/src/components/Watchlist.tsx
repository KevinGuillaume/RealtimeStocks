import { useAppSelector } from "../store/hooks";
import { formatPrice } from "../utilities/format";

interface WatchlistProps {
  symbols: string[];
  selected: string;
  onSelect: (symbol: string) => void;
}

export function Watchlist({ symbols, selected, onSelect }: WatchlistProps) {
  const symbolStates = useAppSelector((state) => state.marketData.symbols);
  const referencePrices = useAppSelector((state) => state.watchlist.referencePrices);

  return (
    <div className="w-56 shrink-0 rounded-lg border border-slate-800 bg-slate-900">
      <div className="flex items-center justify-between px-4 py-2 text-xs font-medium uppercase tracking-wide text-slate-500">
        <span>Symbol</span>
        <span className="flex flex-col items-end gap-0.5">
          <span>Price</span>
          <span>Chg</span>
        </span>
      </div>
      <ul className="divide-y divide-slate-800 border-t border-slate-800">
        {symbols.map((symbol) => {
          const symbolState = symbolStates[symbol];
          const price = symbolState?.trade?.price ?? symbolState?.bar?.close ?? symbolState?.quote?.ask_price;
          const reference = referencePrices[symbol];
          const change = price !== undefined && reference ? ((price - reference) / reference) * 100 : undefined;

          return (
            <li key={symbol}>
              <button
                type="button"
                onClick={() => onSelect(symbol)}
                className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors ${
                  symbol === selected ? "bg-slate-800" : "hover:bg-slate-800/60"
                }`}
              >
                <span className="font-semibold text-slate-100">{symbol}</span>
                <span className="flex flex-col items-end">
                  <span className="font-mono tabular-nums text-slate-200">{formatPrice(price)}</span>
                  <span
                    className={`font-mono text-xs tabular-nums ${
                      change === undefined ? "text-slate-500" : change >= 0 ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {change === undefined ? "—" : `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
