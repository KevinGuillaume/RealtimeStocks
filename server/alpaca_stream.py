"""Bridges Alpaca's live stock market data websocket to our own FastAPI clients.

Alpaca's StockDataStream.run() opens its own event loop (via asyncio.run) and
blocks, so it's driven in a background thread. Incoming ticks are handed back
to FastAPI's event loop with run_coroutine_threadsafe so they can be
broadcast to connected frontend websockets.
"""

import asyncio
import logging
import threading
from typing import Callable, Iterable

from alpaca.data.enums import DataFeed
from alpaca.data.live import StockDataStream
from alpaca.data.models.bars import Bar
from alpaca.data.models.quotes import Quote
from alpaca.data.models.trades import Trade
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class AlpacaMarketStream:
    def __init__(
        self,
        api_key: str,
        secret_key: str,
        symbols: Iterable[str],
        feed: DataFeed = DataFeed.IEX,
        on_tick: Callable[[dict], None] | None = None,
    ):
        self._client = StockDataStream(api_key, secret_key, feed=feed)
        self._clients: set[WebSocket] = set()
        self._loop: asyncio.AbstractEventLoop | None = None
        self._thread: threading.Thread | None = None
        self._on_tick = on_tick

        symbols = list(symbols)
        self._client.subscribe_trades(self._on_trade, *symbols)
        self._client.subscribe_quotes(self._on_quote, *symbols)
        self._client.subscribe_bars(self._on_bar, *symbols)

    def start(self) -> None:
        self._loop = asyncio.get_event_loop()
        self._thread = threading.Thread(target=self._run_client, daemon=True)
        self._thread.start()

    def _run_client(self) -> None:
        try:
            self._client.run()
        except Exception:
            logger.exception("Alpaca stream stopped unexpectedly")

    def add_client(self, websocket: WebSocket) -> None:
        self._clients.add(websocket)

    def remove_client(self, websocket: WebSocket) -> None:
        self._clients.discard(websocket)

    def _dispatch(self, message: dict) -> None:
        print(f"Returned from Alpaca: {message}")
        if self._on_tick is not None:
            self._on_tick(message)
        if self._loop is None:
            return
        asyncio.run_coroutine_threadsafe(self._broadcast(message), self._loop)

    async def _broadcast(self, message: dict) -> None:
        for websocket in list(self._clients):
            try:
                await websocket.send_json(message)
            except Exception:
                self._clients.discard(websocket)

    async def _on_trade(self, trade: Trade) -> None:
        self._dispatch(
            {
                "type": "trade",
                "symbol": trade.symbol,
                "price": trade.price,
                "size": trade.size,
                "timestamp": trade.timestamp.isoformat(),
            }
        )

    async def _on_quote(self, quote: Quote) -> None:
        self._dispatch(
            {
                "type": "quote",
                "symbol": quote.symbol,
                "bid_price": quote.bid_price,
                "bid_size": quote.bid_size,
                "ask_price": quote.ask_price,
                "ask_size": quote.ask_size,
                "timestamp": quote.timestamp.isoformat(),
            }
        )

    async def _on_bar(self, bar: Bar) -> None:
        self._dispatch(
            {
                "type": "bar",
                "symbol": bar.symbol,
                "open": bar.open,
                "high": bar.high,
                "low": bar.low,
                "close": bar.close,
                "volume": bar.volume,
                "timestamp": bar.timestamp.isoformat(),
            }
        )
