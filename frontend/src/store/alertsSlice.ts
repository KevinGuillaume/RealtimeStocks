import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Alert, AlertTriggeredMessage } from "../types/stocks";

interface AlertsState {
  alerts: Alert[];
  alertEvents: AlertTriggeredMessage[];
}

const initialState: AlertsState = {
  alerts: [],
  alertEvents: [],
};

const alertsSlice = createSlice({
  name: "alerts",
  initialState,
  reducers: {
    setAlerts(state, action: PayloadAction<Alert[]>) {
      state.alerts = action.payload;
    },
    addAlert(state, action: PayloadAction<Alert>) {
      state.alerts.push(action.payload);
    },
    removeAlertById(state, action: PayloadAction<number>) {
      state.alerts = state.alerts.filter((alert) => alert.id !== action.payload);
    },
    dismissAlertEvent(state, action: PayloadAction<number>) {
      state.alertEvents = state.alertEvents.filter((_, i) => i !== action.payload);
    },
    alertTriggered(state, action: PayloadAction<AlertTriggeredMessage>) {
      const message = action.payload;
      state.alertEvents.push(message);
      const alert = state.alerts.find((a) => a.id === message.alert_id);
      if (alert) {
        alert.active = false;
        alert.triggered_at = message.timestamp;
      }
    },
  },
});

export const { setAlerts, addAlert, removeAlertById, dismissAlertEvent, alertTriggered } = alertsSlice.actions;
export default alertsSlice.reducer;
