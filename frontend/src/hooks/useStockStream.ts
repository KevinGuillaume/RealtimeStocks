import { useEffect, useRef } from "react";
import { alertTriggered } from "../store/alertsSlice";
import { setStatus } from "../store/connectionSlice";
import { useAppDispatch } from "../store/hooks";
import { symbolMessageReceived } from "../store/marketDataSlice";
import type { StockMessage } from "../types/stocks";

const RECONNECT_DELAY_MS = 2000;

export function useStockStream(url: string) {
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dispatch = useAppDispatch();

  useEffect(() => {
    let cancelled = false;
    let socket: WebSocket | null = null;

    const connect = () => {
      if (cancelled) return;

      dispatch(setStatus("connecting"));
      socket = new WebSocket(url);

      socket.onopen = () => {
        if (cancelled) return;
        dispatch(setStatus("open"));
      };

      socket.onmessage = (event) => {
        if (cancelled) return;
        let message: StockMessage;
        try {
          message = JSON.parse(event.data);
        } catch {
          return;
        }
        if (message.type === "alert_triggered") {
          dispatch(alertTriggered(message));
        } else {
          dispatch(symbolMessageReceived(message));
        }
      };

      socket.onclose = () => {
        if (cancelled) return;
        dispatch(setStatus("closed"));
        reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS);
      };

      socket.onerror = () => {
        socket?.close();
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      socket?.close();
    };
  }, [url, dispatch]);
}
