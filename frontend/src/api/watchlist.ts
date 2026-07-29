import { type ApiConfig, defaultApiConfig } from "./config";
import { fetchBars } from "./bars";
import { apiFetch, throwOnError } from "./http";
import type { LastPriceEntry } from "./prices";

export interface AddSymbolResult {
  symbol: string;
  last_price: LastPriceEntry | null;
}

export async function fetchWatchlist(config: ApiConfig = defaultApiConfig): Promise<string[]> {
  const res = await apiFetch(`${config.baseUrl}/symbols`);
  await throwOnError(res);
  return res.json();
}

export async function addSymbol(symbol: string, config: ApiConfig = defaultApiConfig): Promise<AddSymbolResult> {
  const res = await apiFetch(`${config.baseUrl}/symbols?symbol=${encodeURIComponent(symbol)}`, { method: "POST" });
  await throwOnError(res);
  return res.json();
}

export async function removeSymbol(symbol: string, config: ApiConfig = defaultApiConfig): Promise<void> {
  const res = await apiFetch(`${config.baseUrl}/symbols/${encodeURIComponent(symbol)}`, { method: "DELETE" });
  await throwOnError(res);
}

export async function fetchOpeningPrice(
  symbol: string,
  config: ApiConfig = defaultApiConfig,
): Promise<number | null> {
  const bars = await fetchBars(symbol, "1Day", 1, config);
  return bars.length > 0 ? bars[0].open : null;
}
