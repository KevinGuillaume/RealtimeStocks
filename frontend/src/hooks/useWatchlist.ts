import { useCallback, useEffect } from "react";
import { useStockStore } from "../store/stockStore";
import { API_URL } from "../config";

async function throwOnError(res: Response): Promise<void> {
  if (res.ok) return;
  const body = await res.json().catch(() => null);
  throw new Error(body?.detail ?? `request failed (${res.status})`);
}

export function useWatchlist() {
  const setWatchlist = useStockStore((state) => state.setWatchlist);
  const setReferencePrice = useStockStore((state) => state.setReferencePrice);
  const addWatchlistSymbol = useStockStore((state) => state.addWatchlistSymbol);
  const removeWatchlistSymbol = useStockStore((state) => state.removeWatchlistSymbol);

  const addSymbol = useCallback(
    async (symbol: string) => {
      const res = await fetch(`${API_URL}/symbols?symbol=${encodeURIComponent(symbol)}`, { method: "POST" });
      await throwOnError(res);
      const { symbol: added } = (await res.json()) as { symbol: string };
      addWatchlistSymbol(added);

      fetch(`${API_URL}/bars/${added}?timeframe=1Day&limit=1`)
        .then((res) => res.json())
        .then((bars: { open: number }[]) => {
          if (bars.length > 0) setReferencePrice(added, bars[0].open);
        })
        .catch(() => {});
    },
    [addWatchlistSymbol, setReferencePrice],
  );

  const removeSymbol = useCallback(
    async (symbol: string) => {
      const res = await fetch(`${API_URL}/symbols/${encodeURIComponent(symbol)}`, { method: "DELETE" });
      await throwOnError(res);
      removeWatchlistSymbol(symbol.toUpperCase());
    },
    [removeWatchlistSymbol],
  );

  useEffect(() => {
    let cancelled = false;

    fetch(`${API_URL}/symbols`)
      .then((res) => res.json())
      .then((symbols: string[]) => {
        if (cancelled) return;
        setWatchlist(symbols);

        symbols.forEach((symbol) => {
          fetch(`${API_URL}/bars/${symbol}?timeframe=1Day&limit=1`)
            .then((res) => res.json())
            .then((bars: { open: number }[]) => {
              if (cancelled || bars.length === 0) return;
              setReferencePrice(symbol, bars[0].open);
            })
            .catch(() => {});
        });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [setWatchlist, setReferencePrice]);

  return { addSymbol, removeSymbol };
}
