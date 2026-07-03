import { create } from "zustand";
import type { ConnectionStatus, StockMessage, SymbolState } from "../types/stocks";

interface StockStore {
  status: ConnectionStatus;
  symbols: Record<string, SymbolState>;
  referencePrices: Record<string, number>;
  watchlist: string[];
  selectedSymbol: string | null;
  setStatus: (status: ConnectionStatus) => void;
  applyMessage: (message: StockMessage) => void;
  setSelectedSymbol: (symbol: string) => void;
  setWatchlist: (symbols: string[]) => void;
  setReferencePrice: (symbol: string, price: number) => void;
}

export const useStockStore = create<StockStore>((set) => ({
  status: "connecting",
  symbols: {},
  referencePrices: {},
  watchlist: [],
  selectedSymbol: null,
  setStatus: (status) => set({ status }),
  applyMessage: (message) =>
    set((state) => {
      const existing = state.symbols[message.symbol] ?? { symbol: message.symbol };
      return {
        symbols: {
          ...state.symbols,
          [message.symbol]: { ...existing, [message.type]: message },
        },
      };
    }),
  setSelectedSymbol: (symbol) => set({ selectedSymbol: symbol }),
  setWatchlist: (symbols) =>
    set((state) => ({
      watchlist: symbols,
      selectedSymbol: state.selectedSymbol ?? symbols[0] ?? null,
    })),
  setReferencePrice: (symbol, price) =>
    set((state) => ({ referencePrices: { ...state.referencePrices, [symbol]: price } })),
}));
