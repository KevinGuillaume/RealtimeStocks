import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { getStoredSymbol, setStoredSymbol } from "../utilities/storage";

interface WatchlistState {
  watchlist: string[];
  selectedSymbol: string | null;
  referencePrices: Record<string, number>;
}

const initialState: WatchlistState = {
  watchlist: [],
  selectedSymbol: getStoredSymbol(),
  referencePrices: {},
};

const watchlistSlice = createSlice({
  name: "watchlist",
  initialState,
  reducers: {
    setSelectedSymbol(state, action: PayloadAction<string>) {
      state.selectedSymbol = action.payload;
      setStoredSymbol(action.payload);
    },
    setWatchlist(state, action: PayloadAction<string[]>) {
      state.watchlist = action.payload;
      // keep the remembered symbol if it's actually still in the incoming
      // watchlist, otherwise fall back to the first symbol
      if (!state.selectedSymbol || !action.payload.includes(state.selectedSymbol)) {
        state.selectedSymbol = action.payload[0] ?? null;
      }
      setStoredSymbol(state.selectedSymbol);
    },
    setReferencePrice(state, action: PayloadAction<{ symbol: string; price: number }>) {
      state.referencePrices[action.payload.symbol] = action.payload.price;
    },
    addWatchlistSymbol(state, action: PayloadAction<string>) {
      const symbol = action.payload;
      if (!state.watchlist.includes(symbol)) state.watchlist.push(symbol);
      state.selectedSymbol = state.selectedSymbol ?? symbol;
      setStoredSymbol(state.selectedSymbol);
    },
    removeWatchlistSymbol(state, action: PayloadAction<string>) {
      const symbol = action.payload;
      state.watchlist = state.watchlist.filter((s) => s !== symbol);
      if (state.selectedSymbol === symbol) {
        state.selectedSymbol = state.watchlist[0] ?? null;
        setStoredSymbol(state.selectedSymbol);
      }
    },
  },
});

export const { setSelectedSymbol, setWatchlist, setReferencePrice, addWatchlistSymbol, removeWatchlistSymbol } =
  watchlistSlice.actions;
export default watchlistSlice.reducer;
