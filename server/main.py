import asyncio
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import uvicorn
from alpaca_stream import AlpacaMarketStream
from bars import HistoricalBars, parse_timeframe
from config import ALPACA_API_KEY, ALPACA_SECRET_KEY, FRONTEND_URLS, SLACK_WEBHOOK_URL
from db import SessionLocal, engine, get_session
from fastapi import Depends, FastAPI, Header, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from models import Alert, LastPrice, WatchlistSymbol
from slack_notify import notify_alert_triggered
from sqlalchemy import delete, func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

_DEFAULT_SYMBOLS = ["AAPL", "MSFT", "TSLA", "SPY"]
_VALID_CONDITIONS = {"price_above", "price_below", "pct_change"}
_MAX_WATCHLIST_SYMBOLS = 30

historical_bars = HistoricalBars(api_key=ALPACA_API_KEY, secret_key=ALPACA_SECRET_KEY)
market_stream: AlpacaMarketStream | None = None

# symbol -> list of active alert dicts, refreshed at startup and on every
# alert mutation so the hot tick path (on_tick, below) never touches the DB.
_active_alerts_cache: dict[str, list[dict]] = {}
_alert_queue: asyncio.Queue = asyncio.Queue()

# symbol -> {"price": float, "timestamp": iso str}, updated on every trade
# tick (cheap dict write, no DB — same non-blocking constraint as
# _active_alerts_cache) and periodically flushed to last_prices by
# flush_last_prices_worker so a fresh page load has a price to show before
# the first live tick arrives, and it survives restarts.
_last_price_cache: dict[str, dict] = {}
_dirty_last_prices: set[str] = set()
_LAST_PRICE_FLUSH_INTERVAL = 5.0


async def get_device_id(x_device_id: str | None = Header(default=None)) -> str:
    if not x_device_id:
        raise HTTPException(status_code=400, detail="X-Device-Id header required")
    return x_device_id


async def seed_watchlist_if_empty(session: AsyncSession, device_id: str) -> bool:
    """Seeds a brand-new device's watchlist with the defaults. Returns whether it seeded."""
    count = (
        await session.execute(
            select(func.count()).select_from(WatchlistSymbol).where(WatchlistSymbol.device_id == device_id)
        )
    ).scalar_one()
    if count == 0:
        session.add_all(
            WatchlistSymbol(symbol=s, sort_order=i, device_id=device_id) for i, s in enumerate(_DEFAULT_SYMBOLS)
        )
        await session.commit()
        return True
    return False


async def refresh_active_alerts_cache(session: AsyncSession) -> None:
    result = await session.execute(select(Alert).where(Alert.active.is_(True)))
    cache: dict[str, list[dict]] = {}
    for alert in result.scalars():
        cache.setdefault(alert.symbol, []).append(
            {
                "id": alert.id,
                "device_id": alert.device_id,
                "symbol": alert.symbol,
                "condition": alert.condition,
                "threshold": alert.threshold,
                "baseline_price": alert.baseline_price,
            }
        )
    _active_alerts_cache.clear()
    _active_alerts_cache.update(cache)


def _alert_condition_met(alert: dict, price: float) -> bool:
    if alert["condition"] == "price_above":
        return price > alert["threshold"]
    if alert["condition"] == "price_below":
        return price < alert["threshold"]
    if alert["condition"] == "pct_change":
        baseline = alert["baseline_price"]
        if not baseline:
            return False
        return abs(price - baseline) / baseline >= alert["threshold"]
    return False


def on_tick(message: dict) -> None:
    """Called from the Alpaca background thread on every trade/quote/bar.

    Must stay non-blocking: no DB access and no awaiting here. Matching
    alerts are just handed off to the main event loop's queue, where
    alert_fire_worker does the real (async) work.
    """
    if message.get("type") != "trade":
        return

    _last_price_cache[message["symbol"]] = {"price": message["price"], "timestamp": message["timestamp"]}
    _dirty_last_prices.add(message["symbol"])

    if market_stream is None or market_stream._loop is None:
        return
    alerts = _active_alerts_cache.get(message["symbol"])
    if not alerts:
        return
    for alert in alerts:
        if _alert_condition_met(alert, message["price"]):
            market_stream._loop.call_soon_threadsafe(_alert_queue.put_nowait, (alert, message))


async def _flush_last_prices() -> None:
    if not _dirty_last_prices:
        return
    symbols = list(_dirty_last_prices)
    _dirty_last_prices.difference_update(symbols)
    rows = [
        {
            "symbol": symbol,
            "price": _last_price_cache[symbol]["price"],
            "traded_at": datetime.fromisoformat(_last_price_cache[symbol]["timestamp"]),
        }
        for symbol in symbols
        if symbol in _last_price_cache
    ]
    if not rows:
        return

    async with SessionLocal() as session:
        stmt = pg_insert(LastPrice).values(rows)
        stmt = stmt.on_conflict_do_update(
            index_elements=[LastPrice.symbol],
            set_={"price": stmt.excluded.price, "traded_at": stmt.excluded.traded_at, "updated_at": func.now()},
        )
        await session.execute(stmt)
        await session.commit()


async def flush_last_prices_worker() -> None:
    while True:
        await asyncio.sleep(_LAST_PRICE_FLUSH_INTERVAL)
        await _flush_last_prices()


async def alert_fire_worker() -> None:
    while True:
        alert, message = await _alert_queue.get()
        async with SessionLocal() as session:
            result = await session.execute(select(Alert).where(Alert.id == alert["id"], Alert.active.is_(True)))
            db_alert = result.scalar_one_or_none()
            if db_alert is None:
                continue  # already fired or deleted by a concurrent request
            db_alert.active = False
            db_alert.triggered_at = datetime.now(timezone.utc)
            await session.commit()
            await refresh_active_alerts_cache(session)

        await market_stream._broadcast(
            {
                "type": "alert_triggered",
                "alert_id": alert["id"],
                "device_id": alert["device_id"],
                "symbol": alert["symbol"],
                "condition": alert["condition"],
                "threshold": alert["threshold"],
                "price": message["price"],
                "timestamp": message["timestamp"],
            }
        )
        asyncio.create_task(notify_alert_triggered(alert, message))


@asynccontextmanager
async def lifespan(app: FastAPI):
    global market_stream

    async with SessionLocal() as session:
        symbols = list((await session.execute(select(WatchlistSymbol.symbol).distinct())).scalars().all())
        await refresh_active_alerts_cache(session)
        for row in (await session.execute(select(LastPrice))).scalars():
            _last_price_cache[row.symbol] = {"price": row.price, "timestamp": row.traded_at.isoformat()}

    market_stream = AlpacaMarketStream(
        api_key=ALPACA_API_KEY,
        secret_key=ALPACA_SECRET_KEY,
        symbols=symbols,
        on_tick=on_tick,
    )
    market_stream.start()
    worker_task = asyncio.create_task(alert_fire_worker())
    flush_task = asyncio.create_task(flush_last_prices_worker())

    yield

    worker_task.cancel()
    flush_task.cancel()
    await _flush_last_prices()
    await engine.dispose()


app = FastAPI(title="RealtimeStocks API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_URLS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/config")
def get_config() -> dict:
    return {"slack_connected": bool(SLACK_WEBHOOK_URL)}


@app.get("/symbols")
async def get_symbols(
    device_id: str = Depends(get_device_id), session: AsyncSession = Depends(get_session)
) -> list[str]:
    seeded = await seed_watchlist_if_empty(session, device_id)
    if seeded:
        await asyncio.to_thread(market_stream.add_symbols, *_DEFAULT_SYMBOLS)

    result = await session.execute(
        select(WatchlistSymbol.symbol)
        .where(WatchlistSymbol.device_id == device_id)
        .order_by(WatchlistSymbol.sort_order)
    )
    return list(result.scalars().all())


@app.get("/prices")
def get_last_prices() -> dict[str, dict]:
    return dict(_last_price_cache)


@app.post("/symbols")
async def add_symbol(
    symbol: str, device_id: str = Depends(get_device_id), session: AsyncSession = Depends(get_session)
) -> dict:
    symbol = symbol.upper()

    count = (
        await session.execute(
            select(func.count()).select_from(WatchlistSymbol).where(WatchlistSymbol.device_id == device_id)
        )
    ).scalar_one()
    if count >= _MAX_WATCHLIST_SYMBOLS:
        raise HTTPException(status_code=400, detail=f"watchlist limit reached ({_MAX_WATCHLIST_SYMBOLS} symbols max)")

    bars = await asyncio.to_thread(historical_bars.get_recent_bars, symbol, parse_timeframe("1Day"), 1)
    if not bars:
        raise HTTPException(status_code=400, detail=f"no price data for {symbol!r} — check the ticker")

    if symbol not in _last_price_cache:
        last_bar = bars[-1]
        _last_price_cache[symbol] = {
            "price": last_bar["close"],
            "timestamp": datetime.fromtimestamp(last_bar["time"], tz=timezone.utc).isoformat(),
        }
        _dirty_last_prices.add(symbol)

    session.add(WatchlistSymbol(symbol=symbol, device_id=device_id))
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(status_code=409, detail=f"{symbol} already in watchlist")

    await asyncio.to_thread(market_stream.add_symbols, symbol)
    return {"symbol": symbol, "last_price": _last_price_cache.get(symbol)}


@app.delete("/symbols/{symbol}")
async def remove_symbol(
    symbol: str, device_id: str = Depends(get_device_id), session: AsyncSession = Depends(get_session)
) -> dict:
    symbol = symbol.upper()
    result = await session.execute(
        delete(WatchlistSymbol).where(WatchlistSymbol.symbol == symbol, WatchlistSymbol.device_id == device_id)
    )
    await session.commit()
    if result.rowcount:
        remaining = (
            await session.execute(
                select(func.count()).select_from(WatchlistSymbol).where(WatchlistSymbol.symbol == symbol)
            )
        ).scalar_one()
        if remaining == 0:
            # only unsubscribe once no device is watching this symbol anymore —
            # unsubscribing an unknown symbol raises in alpaca-py.
            await asyncio.to_thread(market_stream.remove_symbols, symbol)
    return {"symbol": symbol}


@app.get("/bars/{symbol}")
def get_bars(symbol: str, timeframe: str = "1Min", limit: int = 200) -> list[dict]:
    try:
        parsed_timeframe = parse_timeframe(timeframe)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return historical_bars.get_recent_bars(symbol.upper(), parsed_timeframe, limit)


def _alert_to_dict(alert: Alert) -> dict:
    return {
        "id": alert.id,
        "symbol": alert.symbol,
        "condition": alert.condition,
        "threshold": alert.threshold,
        "baseline_price": alert.baseline_price,
        "active": alert.active,
        "created_at": alert.created_at.isoformat(),
        "triggered_at": alert.triggered_at.isoformat() if alert.triggered_at else None,
    }


@app.get("/alerts")
async def list_alerts(
    device_id: str = Depends(get_device_id), session: AsyncSession = Depends(get_session)
) -> list[dict]:
    result = await session.execute(
        select(Alert).where(Alert.device_id == device_id).order_by(Alert.created_at)
    )
    return [_alert_to_dict(alert) for alert in result.scalars()]


@app.post("/alerts")
async def create_alert(
    symbol: str,
    condition: str,
    threshold: float,
    device_id: str = Depends(get_device_id),
    session: AsyncSession = Depends(get_session),
) -> dict:
    if condition not in _VALID_CONDITIONS:
        raise HTTPException(status_code=400, detail=f"condition must be one of {sorted(_VALID_CONDITIONS)}")

    symbol = symbol.upper()
    baseline_price = None
    if condition == "pct_change":
        bars = await asyncio.to_thread(historical_bars.get_recent_bars, symbol, parse_timeframe("1Min"), 1)
        if not bars:
            raise HTTPException(status_code=400, detail=f"no recent price data for {symbol}")
        baseline_price = bars[-1]["close"]

    alert = Alert(
        symbol=symbol, condition=condition, threshold=threshold, baseline_price=baseline_price, device_id=device_id
    )
    session.add(alert)
    await session.commit()
    await session.refresh(alert)
    await refresh_active_alerts_cache(session)
    return _alert_to_dict(alert)


@app.delete("/alerts/{alert_id}")
async def delete_alert(
    alert_id: int, device_id: str = Depends(get_device_id), session: AsyncSession = Depends(get_session)
) -> dict:
    await session.execute(delete(Alert).where(Alert.id == alert_id, Alert.device_id == device_id))
    await session.commit()
    await refresh_active_alerts_cache(session)
    return {"id": alert_id}


@app.websocket("/ws/stocks")
async def stocks_socket(websocket: WebSocket):
    await websocket.accept()
    market_stream.add_client(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        market_stream.remove_client(websocket)


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
