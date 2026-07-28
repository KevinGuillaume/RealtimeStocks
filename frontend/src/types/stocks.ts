export interface TradeMessage {
  type: "trade";
  symbol: string;
  price: number;
  size: number;
  timestamp: string;
}

export interface QuoteMessage {
  type: "quote";
  symbol: string;
  bid_price: number;
  bid_size: number;
  ask_price: number;
  ask_size: number;
  timestamp: string;
}

export interface BarMessage {
  type: "bar";
  symbol: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: string;
}

export interface AlertTriggeredMessage {
  type: "alert_triggered";
  alert_id: number;
  device_id: string;
  symbol: string;
  condition: AlertCondition;
  threshold: number;
  price: number;
  timestamp: string;
}

export type StockMessage = TradeMessage | QuoteMessage | BarMessage | AlertTriggeredMessage;

export interface SymbolState {
  symbol: string;
  trade?: TradeMessage;
  quote?: QuoteMessage;
  bar?: BarMessage;
}

export type ConnectionStatus = "connecting" | "open" | "closed";

export type AlertCondition = "price_above" | "price_below" | "pct_change";

export interface Alert {
  id: number;
  symbol: string;
  condition: AlertCondition;
  threshold: number;
  baseline_price: number | null;
  active: boolean;
  created_at: string;
  triggered_at: string | null;
}