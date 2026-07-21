from datetime import timedelta

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.auth.routes import get_auth_store, router
from app.auth.store import AuthStore


WRITE_HEADERS = {"X-Requested-With": "QuantDesk"}


@pytest.fixture
def client(tmp_path):
    app = FastAPI()
    app.include_router(router)
    store = AuthStore(tmp_path / "auth.sqlite3", timedelta(days=30))
    app.dependency_overrides[get_auth_store] = lambda: store
    return TestClient(app)


def test_register_restores_session_and_logout_clears_it(client):
    registered = client.post(
        "/api/auth/register",
        json={"email": "me@example.com", "password": "correct password"},
        headers=WRITE_HEADERS,
    )

    assert registered.status_code == 201
    assert registered.json() == {"user": {"email": "me@example.com"}}
    assert client.get("/api/auth/session").json() == {"user": {"email": "me@example.com"}}
    assert client.post("/api/auth/logout", headers=WRITE_HEADERS).status_code == 204
    assert client.get("/api/auth/session").json() == {"user": None}


def test_watchlist_requires_session_and_is_private(client):
    assert client.get("/api/watchlist").status_code == 401
    assert client.get("/api/watchlist/stocks").status_code == 401
    client.post(
        "/api/auth/register",
        json={"email": "one@example.com", "password": "correct password"},
        headers=WRITE_HEADERS,
    )

    assert client.put("/api/watchlist/600519", headers=WRITE_HEADERS).status_code == 204
    assert client.get("/api/watchlist").json() == {"tickers": ["600519"]}


def test_watchlist_stock_details_preserve_saved_order_and_resolve_snapshot_misses(client, monkeypatch):
    client.post(
        "/api/auth/register",
        json={"email": "me@example.com", "password": "correct password"},
        headers=WRITE_HEADERS,
    )
    client.put("/api/watchlist/002197", headers=WRITE_HEADERS)
    client.put("/api/watchlist/600519", headers=WRITE_HEADERS)
    monkeypatch.setattr(
        "app.auth.routes.get_stock_snapshot",
        lambda: {"stocks": [{"ticker": "600519", "name": "贵州茅台"}]},
    )
    monkeypatch.setattr(
        "app.auth.routes.stock_quote",
        lambda ticker: {"stock": {"ticker": ticker, "name": "保利联合"}},
    )

    response = client.get("/api/watchlist/stocks")

    assert response.status_code == 200
    assert response.json() == {
        "tickers": ["002197", "600519"],
        "stocks": [
            {"ticker": "002197", "name": "保利联合"},
            {"ticker": "600519", "name": "贵州茅台"},
        ],
        "unavailable_tickers": [],
    }


def test_watchlist_stock_details_report_unavailable_saved_tickers(client, monkeypatch):
    client.post(
        "/api/auth/register",
        json={"email": "me@example.com", "password": "correct password"},
        headers=WRITE_HEADERS,
    )
    client.put("/api/watchlist/002197", headers=WRITE_HEADERS)
    monkeypatch.setattr("app.auth.routes.get_stock_snapshot", lambda: {"stocks": []})
    monkeypatch.setattr("app.auth.routes.stock_quote", lambda ticker: {"stock": None})

    response = client.get("/api/watchlist/stocks")

    assert response.status_code == 200
    assert response.json() == {
        "tickers": ["002197"],
        "stocks": [],
        "unavailable_tickers": ["002197"],
    }


def test_login_failure_does_not_disclose_account_existence(client):
    response = client.post(
        "/api/auth/login",
        json={"email": "missing@example.com", "password": "correct password"},
        headers=WRITE_HEADERS,
    )

    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "invalid_credentials"


def test_mutations_reject_requests_without_the_expected_header(client):
    response = client.post(
        "/api/auth/register",
        json={"email": "me@example.com", "password": "correct password"},
    )

    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "invalid_request_origin"
