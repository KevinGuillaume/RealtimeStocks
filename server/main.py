import os
import uvicorn
from alpaca_stream import AlpacaMarketStream
from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

WATCHLIST = ["AAPL", "MSFT", "TSLA", "SPY"]

app = FastAPI(title="RealtimeStocks API")

#@TODO swap the origin to be whatever the host of wherever i move host at - once in prod
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# This is the way that I use to get the Injestor started from Alpaca
market_stream = AlpacaMarketStream(
    api_key=os.environ["ALPACA_API_KEY"],
    secret_key=os.environ["ALPACA_SECRET_KEY"],
    symbols=WATCHLIST,
)


# When the server starts, start listening and open the connection
@app.on_event("startup")
def start_market_stream():
    market_stream.start()


@app.get("/health")
def health_check():
    return {"status": "ok"}


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
