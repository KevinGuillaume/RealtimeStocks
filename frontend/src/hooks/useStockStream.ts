import { useEffect, useRef } from "react";
import { useStockStore } from "../store/stockStore";
import type { StockMessage } from "../types/stocks";

const RECONNECT_DELAY_MS = 2000;

export function useStockStream(url: string) {
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    let socket: WebSocket | null = null;
    const { setStatus, applyMessage } = useStockStore.getState();

    const connect = () => {
      if (cancelled) return;

      setStatus("connecting");
      socket = new WebSocket(url);

      socket.onopen = () => {
        if (cancelled) return;
        setStatus("open");
      };

      socket.onmessage = (event) => {
        if (cancelled) return;
        let message: StockMessage;
        try {
          message = JSON.parse(event.data);
        } catch {
          return;
        }
        applyMessage(message);
      };

      socket.onclose = () => {
        if (cancelled) return;
        setStatus("closed");
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
  }, [url]);
}
