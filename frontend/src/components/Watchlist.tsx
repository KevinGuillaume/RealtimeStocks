import { useAppSelector } from "../store/hooks";
import { formatPrice, formatVolume } from "../utilities/format";

interface WatchlistProps {
  symbols: string[];
  selected: string;
  onSelect: (symbol: string) => void;
  onRemove?: (symbol: string) => void;
}

export function Watchlist({ symbols, selected, onSelect, onRemove }: WatchlistProps) {
  const symbolStates = useAppSelector((state) => state.marketData.symbols);
  const referencePrices = useAppSelector((state) => state.watchlist.referencePrices);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="text-[10px] uppercase tracking-wide text-[var(--stx-text-dim)]">
            <th className="border-b border-[var(--stx-divider)] px-3 py-2 text-left font-medium">Sym</th>
            <th className="border-b border-[var(--stx-divider)] px-2 py-2 text-right font-medium">Last</th>
            <th className="border-b border-[var(--stx-divider)] px-2 py-2 text-right font-medium">Chg%</th>
            <th className="border-b border-[var(--stx-divider)] px-3 py-2 text-right font-medium">Vol</th>
          </tr>
        </thead>
        <tbody>
          {symbols.map((symbol) => {
            const symbolState = symbolStates[symbol];
            const price = symbolState?.trade?.price ?? symbolState?.bar?.close ?? symbolState?.quote?.ask_price;
            const reference = referencePrices[symbol];
            const change = price !== undefined && reference ? ((price - reference) / reference) * 100 : undefined;
            const isSelected = symbol === selected;

            return (
              <tr
                key={symbol}
                onClick={() => onSelect(symbol)}
                className={`group cursor-pointer transition-colors ${
                  isSelected ? "bg-[var(--stx-accent-dim)]" : "hover:bg-white/[0.04]"
                }`}
              >
                <td className="relative border-b border-[var(--stx-divider)] px-3 py-2 font-medium">
                  {symbol}
                  {onRemove && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onRemove(symbol);
                      }}
                      className="absolute right-1 top-1/2 -translate-y-1/2 rounded px-1.5 text-[var(--stx-text-dim)] opacity-0 transition-opacity hover:text-[var(--stx-down)] group-hover:opacity-100"
                      aria-label={`Remove ${symbol}`}
                    >
                      ×
                    </button>
                  )}
                </td>
                <td className="border-b border-[var(--stx-divider)] px-2 py-2 text-right font-mono tabular-nums">
                  {formatPrice(price)}
                </td>
                <td
                  className={`border-b border-[var(--stx-divider)] px-2 py-2 text-right font-mono tabular-nums ${
                    change === undefined
                      ? "text-[var(--stx-text-dim)]"
                      : change >= 0
                        ? "text-[var(--stx-up)]"
                        : "text-[var(--stx-down)]"
                  }`}
                >
                  {change === undefined ? "—" : `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`}
                </td>
                <td className="border-b border-[var(--stx-divider)] px-3 py-2 text-right font-mono tabular-nums text-[var(--stx-text-dim)]">
                  {formatVolume(symbolState?.bar?.volume)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
