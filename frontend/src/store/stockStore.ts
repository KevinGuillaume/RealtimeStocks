import { create } from "zustand";
import type { Alert, AlertTriggeredMessage, ConnectionStatus, StockMessage, SymbolState } from "../types/stocks";

interface StockStore {
  status: ConnectionStatus;
  symbols: Record<string, SymbolState>;
  referencePrices: Record<string, number>;
  watchlist: string[];
  selectedSymbol: string | null;
  alerts: Alert[];
  alertEvents: AlertTriggeredMessage[];
  setStatus: (status: ConnectionStatus) => void;
  applyMessage: (message: StockMessage) => void;
  setSelectedSymbol: (symbol: string) => void;
  setWatchlist: (symbols: string[]) => void;
  setReferencePrice: (symbol: string, price: number) => void;
  addWatchlistSymbol: (symbol: string) => void;
  removeWatchlistSymbol: (symbol: string) => void;
  setAlerts: (alerts: Alert[]) => void;
  addAlert: (alert: Alert) => void;
  removeAlertById: (id: number) => void;
  dismissAlertEvent: (index: number) => void;
}

export const useStockStore = create<StockStore>((set) => ({
  status: "connecting",
  symbols: {},
  referencePrices: {},
  watchlist: [],
  selectedSymbol: null,
  alerts: [],
  alertEvents: [],
  setStatus: (status) => set({ status }),
  applyMessage: (message) =>
    set((state) => {
      if (message.type === "alert_triggered") {
        return {
          alertEvents: [...state.alertEvents, message],
          alerts: state.alerts.map((alert) =>
            alert.id === message.alert_id
              ? { ...alert, active: false, triggered_at: message.timestamp }
              : alert,
          ),
        };
      }

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
  addWatchlistSymbol: (symbol) =>
    set((state) => ({
      watchlist: state.watchlist.includes(symbol) ? state.watchlist : [...state.watchlist, symbol],
      selectedSymbol: state.selectedSymbol ?? symbol,
    })),
  removeWatchlistSymbol: (symbol) =>
    set((state) => {
      const watchlist = state.watchlist.filter((s) => s !== symbol);
      return {
        watchlist,
        selectedSymbol: state.selectedSymbol === symbol ? (watchlist[0] ?? null) : state.selectedSymbol,
      };
    }),
  setAlerts: (alerts) => set({ alerts }),
  addAlert: (alert) => set((state) => ({ alerts: [...state.alerts, alert] })),
  removeAlertById: (id) => set((state) => ({ alerts: state.alerts.filter((alert) => alert.id !== id) })),
  dismissAlertEvent: (index) =>
    set((state) => ({ alertEvents: state.alertEvents.filter((_, i) => i !== index) })),
}));
