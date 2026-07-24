from fastapi.testclient import TestClient

from app import main
from app.market_data.stock_history import StockHistoryUnavailable


def test_history_route_returns_normalized_payload(monkeypatch):
    monkeypatch.setattr(
        main,
        "get_stock_history",
        lambda **_kwargs: {
            "symbol": "600519",
            "range": "12M",
            "adjust": "qfq",
            "source": "akshare",
            "updated_at": "2026-07-24T00:00:00+00:00",
            "warning": None,
            "bars": [{"date": "2026-07-23", "open": 1400.0, "high": 1420.0, "low": 1390.0, "close": 1415.0, "volume": 100.0, "amount": 141500.0}],
        },
        raising=False,
    )

    response = TestClient(main.app).get("/api/stocks/history?symbol=600519&range=12M&adjust=qfq")

    assert response.status_code == 200
    assert response.json()["symbol"] == "600519"
    assert response.json()["bars"][0]["close"] == 1415.0


def test_history_route_rejects_invalid_query_values():
    client = TestClient(main.app)

    assert client.get("/api/stocks/history?symbol=MSFT&range=12M&adjust=qfq").status_code == 422
    assert client.get("/api/stocks/history?symbol=600519&range=5Y&adjust=qfq").status_code == 422
    assert client.get("/api/stocks/history?symbol=600519&range=1M&adjust=invalid").status_code == 422


def test_history_route_hides_upstream_exception(monkeypatch):
    def unavailable(**_kwargs):
        raise StockHistoryUnavailable("RemoteDisconnected secret upstream detail")

    monkeypatch.setattr(main, "get_stock_history", unavailable)

    response = TestClient(main.app).get("/api/stocks/history?symbol=600519")

    assert response.status_code == 503
    assert response.json()["detail"] == {
        "code": "history_unavailable",
        "message": "Historical market data is temporarily unavailable.",
    }
