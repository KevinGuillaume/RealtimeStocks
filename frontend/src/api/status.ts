import { type ApiConfig, defaultApiConfig } from "./config";
import { throwOnError } from "./http";

export interface AppStatus {
  slack_connected: boolean;
}

export async function fetchAppStatus(config: ApiConfig = defaultApiConfig): Promise<AppStatus> {
  const res = await fetch(`${config.baseUrl}/config`);
  await throwOnError(res);
  return res.json();
}
