import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { BarMessage, QuoteMessage, SymbolState, TradeMessage } from "../types/stocks";

interface MarketDataState {
  symbols: Record<string, SymbolState>;
}

const initialState: MarketDataState = {
  symbols: {},
};

const marketDataSlice = createSlice({
  name: "marketData",
  initialState,
  reducers: {
    symbolMessageReceived(state, action: PayloadAction<TradeMessage | QuoteMessage | BarMessage>) {
      const message = action.payload;
      const existing = state.symbols[message.symbol] ?? { symbol: message.symbol };
      state.symbols[message.symbol] = { ...existing, [message.type]: message };
    },
  },
});

export const { symbolMessageReceived } = marketDataSlice.actions;
export default marketDataSlice.reducer;
