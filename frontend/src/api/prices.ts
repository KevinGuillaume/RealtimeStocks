import { type ApiConfig, defaultApiConfig } from "./config";
import { apiFetch, throwOnError } from "./http";

export interface LastPriceEntry {
  price: number;
  timestamp: string;
}

export async function fetchLastPrices(
  config: ApiConfig = defaultApiConfig,
): Promise<Record<string, LastPriceEntry>> {
  const res = await apiFetch(`${config.baseUrl}/prices`);
  await throwOnError(res);
  return res.json();
}
