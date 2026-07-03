import { useEffect } from "react";
import { useStockStore } from "../store/stockStore";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export function useWatchlist() {
  const setWatchlist = useStockStore((state) => state.setWatchlist);
  const setReferencePrice = useStockStore((state) => state.setReferencePrice);

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
}
