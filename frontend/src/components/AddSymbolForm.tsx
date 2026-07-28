import { useState } from "react";

interface AddSymbolFormProps {
  onAdd: (symbol: string) => Promise<void>;
}

export function AddSymbolForm({ onAdd }: AddSymbolFormProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const symbol = value.trim().toUpperCase();
    if (!symbol) return;

    setSubmitting(true);
    setError(null);
    try {
      await onAdd(symbol);
      setValue("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed to add symbol");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-56 shrink-0 space-y-1">
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Add symbol…"
          maxLength={10}
          className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-1.5 text-sm uppercase text-slate-100 placeholder:normal-case placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={submitting || !value.trim()}
          className="shrink-0 rounded-md bg-emerald-500 px-3 py-1.5 text-sm font-medium text-slate-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </form>
  );
}
