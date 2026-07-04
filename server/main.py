import asyncio
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import uvicorn
from alpaca_stream import AlpacaMarketStream
from bars import HistoricalBars, parse_timeframe
from config import ALPACA_API_KEY, ALPACA_SECRET_KEY
from db import SessionLocal, engine, get_session
from fastapi import Depends, FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from models import Alert, WatchlistSymbol
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

_DEFAULT_SYMBOLS = ["AAPL", "MSFT", "TSLA", "SPY"]
_VALID_CONDITIONS = {"price_above", "price_below", "pct_change"}

historical_bars = HistoricalBars(api_key=ALPACA_API_KEY, secret_key=ALPACA_SECRET_KEY)
market_stream: AlpacaMarketStream | None = None

# symbol -> list of active alert dicts, refreshed at startup and on every
# alert mutation so the hot tick path (on_tick, below) never touches the DB.
_active_alerts_cache: dict[str, list[dict]] = {}
_alert_queue: asyncio.Queue = asyncio.Queue()


async def seed_watchlist_if_empty(session: AsyncSession) -> None:
    count = (await session.execute(select(func.count()).select_from(WatchlistSymbol))).scalar_one()
    if count == 0:
        session.add_all(WatchlistSymbol(symbol=s, sort_order=i) for i, s in enumerate(_DEFAULT_SYMBOLS))
        await session.commit()


async def refresh_active_alerts_cache(session: AsyncSession) -> None:
    result = await session.execute(select(Alert).where(Alert.active.is_(True)))
    cache: dict[str, list[dict]] = {}
    for alert in result.scalars():
        cache.setdefault(alert.symbol, []).append(
            {
                "id": alert.id,
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
    if message.get("type") != "trade" or market_stream is None or market_stream._loop is None:
        return
    alerts = _active_alerts_cache.get(message["symbol"])
    if not alerts:
        return
    for alert in alerts:
        if _alert_condition_met(alert, message["price"]):
            market_stream._loop.call_soon_threadsafe(_alert_queue.put_nowait, (alert, message))


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
                "symbol": alert["symbol"],
                "condition": alert["condition"],
                "threshold": alert["threshold"],
                "price": message["price"],
                "timestamp": message["timestamp"],
            }
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    global market_stream

    async with SessionLocal() as session:
        await seed_watchlist_if_empty(session)
        symbols = list((await session.execute(select(WatchlistSymbol.symbol))).scalars().all())
        await refresh_active_alerts_cache(session)

    market_stream = AlpacaMarketStream(
        api_key=ALPACA_API_KEY,
        secret_key=ALPACA_SECRET_KEY,
        symbols=symbols,
        on_tick=on_tick,
    )
    market_stream.start()
    worker_task = asyncio.create_task(alert_fire_worker())

    yield

    worker_task.cancel()
    await engine.dispose()


app = FastAPI(title="RealtimeStocks API", lifespan=lifespan)

#@TODO swap the origin to be whatever the host of wherever i move host at - once in prod
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/symbols")
async def get_symbols(session: AsyncSession = Depends(get_session)) -> list[str]:
    result = await session.execute(select(WatchlistSymbol.symbol).order_by(WatchlistSymbol.sort_order))
    return list(result.scalars().all())


@app.post("/symbols")
async def add_symbol(symbol: str, session: AsyncSession = Depends(get_session)) -> dict:
    symbol = symbol.upper()
    session.add(WatchlistSymbol(symbol=symbol))
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(status_code=409, detail=f"{symbol} already in watchlist")
    # NOTE: does not update the live Alpaca stream subscription — a restart
    # is required before ticks for this symbol appear on /ws/stocks.
    return {"symbol": symbol}


@app.delete("/symbols/{symbol}")
async def remove_symbol(symbol: str, session: AsyncSession = Depends(get_session)) -> dict:
    await session.execute(delete(WatchlistSymbol).where(WatchlistSymbol.symbol == symbol.upper()))
    await session.commit()
    return {"symbol": symbol.upper()}


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
async def list_alerts(session: AsyncSession = Depends(get_session)) -> list[dict]:
    result = await session.execute(select(Alert).order_by(Alert.created_at))
    return [_alert_to_dict(alert) for alert in result.scalars()]


@app.post("/alerts")
async def create_alert(
    symbol: str, condition: str, threshold: float, session: AsyncSession = Depends(get_session)
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

    alert = Alert(symbol=symbol, condition=condition, threshold=threshold, baseline_price=baseline_price)
    session.add(alert)
    await session.commit()
    await session.refresh(alert)
    await refresh_active_alerts_cache(session)
    return _alert_to_dict(alert)


@app.delete("/alerts/{alert_id}")
async def delete_alert(alert_id: int, session: AsyncSession = Depends(get_session)) -> dict:
    await session.execute(delete(Alert).where(Alert.id == alert_id))
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
