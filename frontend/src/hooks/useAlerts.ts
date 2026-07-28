import { useCallback, useEffect } from "react";
import { useStockStore } from "../store/stockStore";
import { API_URL } from "../config";
import type { Alert, AlertCondition } from "../types/stocks";

async function throwOnError(res: Response): Promise<void> {
  if (res.ok) return;
  const body = await res.json().catch(() => null);
  throw new Error(body?.detail ?? `request failed (${res.status})`);
}

export interface NewAlert {
  symbol: string;
  condition: AlertCondition;
  threshold: number;
}

export function useAlerts() {
  const setAlerts = useStockStore((state) => state.setAlerts);
  const addAlert = useStockStore((state) => state.addAlert);
  const removeAlertById = useStockStore((state) => state.removeAlertById);

  useEffect(() => {
    let cancelled = false;

    fetch(`${API_URL}/alerts`)
      .then((res) => res.json())
      .then((alerts: Alert[]) => {
        if (!cancelled) setAlerts(alerts);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [setAlerts]);

  const createAlert = useCallback(
    async ({ symbol, condition, threshold }: NewAlert) => {
      const params = new URLSearchParams({ symbol, condition, threshold: String(threshold) });
      const res = await fetch(`${API_URL}/alerts?${params}`, { method: "POST" });
      await throwOnError(res);
      const alert = (await res.json()) as Alert;
      addAlert(alert);
    },
    [addAlert],
  );

  const deleteAlert = useCallback(
    async (id: number) => {
      const res = await fetch(`${API_URL}/alerts/${id}`, { method: "DELETE" });
      await throwOnError(res);
      removeAlertById(id);
    },
    [removeAlertById],
  );

  return { createAlert, deleteAlert };
}
