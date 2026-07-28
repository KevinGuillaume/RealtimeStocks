import type { Alert, AlertCondition } from "../types/stocks";
import { type ApiConfig, defaultApiConfig } from "./config";
import { throwOnError } from "./http";

export interface NewAlert {
  symbol: string;
  condition: AlertCondition;
  threshold: number;
}

export async function fetchAlerts(config: ApiConfig = defaultApiConfig): Promise<Alert[]> {
  const res = await fetch(`${config.baseUrl}/alerts`);
  await throwOnError(res);
  return res.json();
}

export async function createAlertRequest(
  { symbol, condition, threshold }: NewAlert,
  config: ApiConfig = defaultApiConfig,
): Promise<Alert> {
  const params = new URLSearchParams({ symbol, condition, threshold: String(threshold) });
  const res = await fetch(`${config.baseUrl}/alerts?${params}`, { method: "POST" });
  await throwOnError(res);
  return res.json();
}

export async function deleteAlertRequest(id: number, config: ApiConfig = defaultApiConfig): Promise<void> {
  const res = await fetch(`${config.baseUrl}/alerts/${id}`, { method: "DELETE" });
  await throwOnError(res);
}
