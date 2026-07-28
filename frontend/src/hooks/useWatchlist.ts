import { useCallback, useEffect } from "react";
import * as watchlistApi from "../api/watchlist";
import { useAppDispatch } from "../store/hooks";
import {
  addWatchlistSymbol,
  removeWatchlistSymbol,
  setReferencePrice,
  setWatchlist,
} from "../store/watchlistSlice";

export function useWatchlist() {
  const dispatch = useAppDispatch();

  const addSymbol = useCallback(
    async (symbol: string) => {
      const added = await watchlistApi.addSymbol(symbol);
      dispatch(addWatchlistSymbol(added));

      watchlistApi
        .fetchOpeningPrice(added)
        .then((price) => {
          if (price !== null) dispatch(setReferencePrice({ symbol: added, price }));
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

    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  return { addSymbol, removeSymbol };
}
