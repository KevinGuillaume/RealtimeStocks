import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { ConnectionStatus } from "../types/stocks";

interface ConnectionState {
  status: ConnectionStatus;
}

const initialState: ConnectionState = {
  status: "connecting",
};

const connectionSlice = createSlice({
  name: "connection",
  initialState,
  reducers: {
    setStatus(state, action: PayloadAction<ConnectionStatus>) {
      state.status = action.payload;
    },
  },
});

export const { setStatus } = connectionSlice.actions;
export default connectionSlice.reducer;
