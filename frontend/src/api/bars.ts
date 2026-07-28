import { type ApiConfig, defaultApiConfig } from "./config";
import { throwOnError } from "./http";

export interface HistoricalBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export async function fetchBars(
  symbol: string,
  timeframe: string,
  limit: number,
  config: ApiConfig = defaultApiConfig,
): Promise<HistoricalBar[]> {
  const res = await fetch(`${config.baseUrl}/bars/${symbol}?timeframe=${timeframe}&limit=${limit}`);
  await throwOnError(res);
  return res.json();
}
