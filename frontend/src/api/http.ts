import { getDeviceId } from "../utilities/deviceId";

export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("X-Device-Id", getDeviceId());
  return fetch(input, { ...init, headers });
}

export async function throwOnError(res: Response): Promise<void> {
  if (res.ok) return;
  const body = await res.json().catch(() => null);
  throw new Error(body?.detail ?? `request failed (${res.status})`);
}
