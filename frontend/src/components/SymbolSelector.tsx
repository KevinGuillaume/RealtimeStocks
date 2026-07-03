interface SymbolSelectorProps {
  symbols: string[];
  selected: string;
  onSelect: (symbol: string) => void;
}

export function SymbolSelector({ symbols, selected, onSelect }: SymbolSelectorProps) {
  return (
    <div className="flex gap-2">
      {symbols.map((symbol) => (
        <button
          key={symbol}
          type="button"
          onClick={() => onSelect(symbol)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            symbol === selected
              ? "bg-emerald-500 text-slate-950"
              : "bg-slate-800 text-slate-300 hover:bg-slate-700"
          }`}
        >
          {symbol}
        </button>
      ))}
    </div>
  );
}
