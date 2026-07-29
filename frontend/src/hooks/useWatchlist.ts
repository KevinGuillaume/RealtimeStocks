import { useCallback, useEffect } from "react";
import * as pricesApi from "../api/prices";
import * as watchlistApi from "../api/watchlist";
import { symbolMessageReceived } from "../store/marketDataSlice";
import { useAppDispatch } from "../store/hooks";
import {
  addWatchlistSymbol,
  removeWatchlistSymbol,
  setReferencePrice,
  setWatchlist,
} from "../store/watchlistSlice";

function seedLastPrice(symbol: string, entry: pricesApi.LastPriceEntry) {
  return symbolMessageReceived({ type: "trade", symbol, price: entry.price, size: 0, timestamp: entry.timestamp });
}

export function useWatchlist() {
  const dispatch = useAppDispatch();

  const addSymbol = useCallback(
    async (symbol: string) => {
      const added = await watchlistApi.addSymbol(symbol);
      dispatch(addWatchlistSymbol(added.symbol));
      if (added.last_price) dispatch(seedLastPrice(added.symbol, added.last_price));

      watchlistApi
        .fetchOpeningPrice(added.symbol)
        .then((price) => {
          if (price !== null) dispatch(setReferencePrice({ symbol: added.symbol, price }));
        })
        .catch(() => {});
    },
    [dispatch],
  );

  const removeSymbol = useCallback(
    async (symbol: string) => {
      await watchlistApi.removeSymbol(symbol);
      dispatch(removeWatchlistSymbol(symbol.toUpperCase()));
    },
    [dispatch],
  );

  useEffect(() => {
    let cancelled = false;

    watchlistApi
      .fetchWatchlist()
      .then((symbols) => {
        if (cancelled) return;
        dispatch(setWatchlist(symbols));

        symbols.forEach((symbol) => {
          watchlistApi
            .fetchOpeningPrice(symbol)
            .then((price) => {
              if (cancelled || price === null) return;
              dispatch(setReferencePrice({ symbol, price }));
            })
            .catch(() => {});
        });
      })
      .catch(() => {});

    pricesApi
      .fetchLastPrices()
      .then((prices) => {
        if (cancelled) return;
        Object.entries(prices).forEach(([symbol, entry]) => dispatch(seedLastPrice(symbol, entry)));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  return { addSymbol, removeSymbol };
}
