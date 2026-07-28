interface SymbolSelectorProps {
  selected: string;
}

export function SymbolSelector({ selected }: SymbolSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Viewing</span>
      <span className="rounded-md bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-slate-950">{selected}</span>
    </div>
  );
}
