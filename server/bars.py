"""Historical OHLCV bars fetched from Alpaca's REST API.

The live websocket stream (alpaca_stream.py) uses a separate client and auth
flow (StockDataStream, streaming). Historical bars go through Alpaca's REST
client (StockHistoricalDataClient) instead, which takes the same API
key/secret but authenticates as plain request headers rather than a
websocket handshake.
"""

import logging
import re
from datetime import datetime, timedelta, timezone

from alpaca.common.enums import Sort
from alpaca.data.enums import DataFeed
from alpaca.data.historical import StockHistoricalDataClient
from alpaca.data.requests import StockBarsRequest
from alpaca.data.timeframe import TimeFrame, TimeFrameUnit

logger = logging.getLogger(__name__)

_TIMEFRAME_RE = re.compile(r"^(\d+)(Min|Hour|Day|Week|Month)$", re.IGNORECASE)
_UNIT_BY_NAME = {
    "min": TimeFrameUnit.Minute,
    "hour": TimeFrameUnit.Hour,
    "day": TimeFrameUnit.Day,
    "week": TimeFrameUnit.Week,
    "month": TimeFrameUnit.Month,
}

# How far back to search for `limit` bars of a given unit. Generous on
# purpose to ride out weekends/holidays without missing data.
_LOOKBACK_BY_UNIT = {
    TimeFrameUnit.Minute: timedelta(days=10),
    TimeFrameUnit.Hour: timedelta(days=60),
    TimeFrameUnit.Day: timedelta(days=400),
    TimeFrameUnit.Week: timedelta(days=1500),
    TimeFrameUnit.Month: timedelta(days=4000),
}


def parse_timeframe(value: str) -> TimeFrame:
    match = _TIMEFRAME_RE.match(value)
    if not match:
        raise ValueError(f"unsupported timeframe: {value!r}")
    amount, unit_name = match.groups()
    return TimeFrame(int(amount), _UNIT_BY_NAME[unit_name.lower()])


class HistoricalBars:
    def __init__(self, api_key: str, secret_key: str, feed: DataFeed = DataFeed.IEX):
        self._client = StockHistoricalDataClient(api_key, secret_key)
        self._feed = feed

    def get_recent_bars(self, symbol: str, timeframe: TimeFrame, limit: int) -> list[dict]:
        now = datetime.now(timezone.utc)
        lookback = _LOOKBACK_BY_UNIT.get(timeframe.unit, timedelta(days=10))
        request = StockBarsRequest(
            symbol_or_symbols=symbol,
            timeframe=timeframe,
            start=now - lookback,
            end=now,
            limit=limit,
            feed=self._feed,
            sort=Sort.DESC
        )

        try:
            bar_set = self._client.get_stock_bars(request)
        except Exception:
            logger.exception("Failed to fetch historical bars for %s", symbol)
            return []

        bars = sorted(bar_set.data.get(symbol, []), key=lambda bar: bar.timestamp)

        return [
            {
                "time": int(bar.timestamp.timestamp()),
                "open": bar.open,
                "high": bar.high,
                "low": bar.low,
                "close": bar.close,
                "volume": bar.volume,
            }
            for bar in bars
        ]
