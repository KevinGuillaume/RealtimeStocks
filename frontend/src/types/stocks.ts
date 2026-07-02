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

export type StockMessage = TradeMessage | QuoteMessage | BarMessage;

export interface SymbolState {
  symbol: string;
  trade?: TradeMessage;
  quote?: QuoteMessage;
  bar?: BarMessage;
}

export type ConnectionStatus = "connecting" | "open" | "closed";