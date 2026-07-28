export async function throwOnError(res: Response): Promise<void> {
  if (res.ok) return;
  const body = await res.json().catch(() => null);
  throw new Error(body?.detail ?? `request failed (${res.status})`);
}
