import { useCallback, useEffect } from "react";
import * as alertsApi from "../api/alerts";
import type { NewAlert } from "../api/alerts";
import { useAppDispatch } from "../store/hooks";
import { addAlert, removeAlertById, setAlerts } from "../store/alertsSlice";

export type { NewAlert };

export function useAlerts() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    let cancelled = false;

    alertsApi
      .fetchAlerts()
      .then((alerts) => {
        if (!cancelled) dispatch(setAlerts(alerts));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  const createAlert = useCallback(
    async (newAlert: NewAlert) => {
      const alert = await alertsApi.createAlertRequest(newAlert);
      dispatch(addAlert(alert));
    },
    [dispatch],
  );

  const deleteAlert = useCallback(
    async (id: number) => {
      await alertsApi.deleteAlertRequest(id);
      dispatch(removeAlertById(id));
    },
    [dispatch],
  );

  return { createAlert, deleteAlert };
}
