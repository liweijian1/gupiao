from __future__ import annotations

from typing import Any, Dict

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from .config import CORS_ORIGINS
from .indicators import INDICATORS
from .service import get_macro_snapshot, refresh_macro_snapshot
from .stocks import get_stock_snapshot, stock_quote, stock_realtime_quote, stock_search, fetch_stock_snapshot


app = FastAPI(
    title="QuantDesk Macro API",
    version="0.1.0",
    description="AkShare-backed China macro data API for the stock analysis prototype.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.get("/api/macro/indicators")
def macro_indicator_map() -> Dict[str, Any]:
    return {"indicators": INDICATORS}


@app.get("/api/macro/snapshot")
def macro_snapshot(force: bool = Query(default=False)) -> Dict[str, Any]:
    return get_macro_snapshot(force_refresh=force)


@app.get("/api/macro/series")
def macro_series() -> Dict[str, Any]:
    snapshot = get_macro_snapshot()
    return {
        "series": snapshot["series"],
        "source": snapshot["source"],
        "updated_at": snapshot["updated_at"],
        "warning": snapshot.get("warning"),
    }


@app.get("/api/macro/scores")
def macro_scores() -> Dict[str, Any]:
    snapshot = get_macro_snapshot()
    return {
        "scores": snapshot["scores"],
        "source": snapshot["source"],
        "updated_at": snapshot["updated_at"],
        "warning": snapshot.get("warning"),
    }


@app.post("/api/macro/refresh")
def macro_refresh() -> Dict[str, Any]:
    return refresh_macro_snapshot()


@app.get("/api/stocks/snapshot")
def stocks_snapshot(force: bool = Query(default=False)) -> Dict[str, Any]:
    return get_stock_snapshot(force_refresh=force)


@app.get("/api/stocks/search")
def stocks_search(q: str = Query(default=""), limit: int = Query(default=50, ge=1, le=200)) -> Dict[str, Any]:
    return stock_search(query=q, limit=limit)


@app.get("/api/stocks/quote")
def stocks_quote(symbol: str = Query(...)) -> Dict[str, Any]:
    return stock_quote(symbol)


@app.get("/api/stocks/realtime")
def stocks_realtime(symbol: str = Query(...), force: bool = Query(default=False)) -> Dict[str, Any]:
    return stock_realtime_quote(symbol, force_refresh=force)


@app.post("/api/stocks/refresh")
def stocks_refresh() -> Dict[str, Any]:
    return fetch_stock_snapshot()
