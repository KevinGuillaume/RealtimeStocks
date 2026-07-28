import { configureStore } from "@reduxjs/toolkit";
import alertsReducer from "./alertsSlice";
import connectionReducer from "./connectionSlice";
import marketDataReducer from "./marketDataSlice";
import watchlistReducer from "./watchlistSlice";

export const store = configureStore({
  reducer: {
    connection: connectionReducer,
    marketData: marketDataReducer,
    watchlist: watchlistReducer,
    alerts: alertsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
