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
    <form onSubmit={handleSubmit} className="shrink-0 border-t border-[var(--stx-divider)] p-2.5">
      <div className="flex gap-1.5">
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Add symbol…"
          maxLength={10}
          className="min-h-[30px] w-full flex-1 rounded-md border border-[var(--stx-divider)] bg-[var(--stx-surface-2)] px-2.5 text-xs uppercase text-[var(--stx-text)] placeholder:normal-case placeholder:text-[var(--stx-text-dim)] focus:border-[var(--stx-accent)] focus:outline-none"
        />
        <button
          type="submit"
          disabled={submitting || !value.trim()}
          className="shrink-0 rounded-md border border-[var(--stx-accent)] px-2.5 text-sm text-[var(--stx-accent)] transition-colors hover:bg-[var(--stx-accent-dim)] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Add symbol"
        >
          +
        </button>
      </div>
      {error && <p className="mt-1 text-[11px] text-[var(--stx-down)]">{error}</p>}
    </form>
  );
}
