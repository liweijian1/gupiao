from __future__ import annotations

import logging
from datetime import timedelta
from functools import lru_cache
from urllib.parse import urlsplit

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from ..config import (
    AUTH_ALLOWED_ORIGINS,
    AUTH_COOKIE_NAME,
    AUTH_COOKIE_PATH,
    AUTH_COOKIE_SECURE,
    AUTH_DB_PATH,
    AUTH_SESSION_DAYS,
    PASSWORD_RESET_TTL_MINUTES,
)
from ..stocks import get_stock_snapshot, stock_quote
from .models import Credentials, PasswordResetConfirmation, PasswordResetRequest, normalize_ticker
from .password_reset_mailer import PasswordResetMailError, send_password_reset_email
from .store import AuthStore, AuthUser, EmailAlreadyRegisteredError


router = APIRouter(prefix="/api", tags=["auth"])
logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def get_auth_store() -> AuthStore:
    return AuthStore(
        AUTH_DB_PATH,
        timedelta(days=AUTH_SESSION_DAYS),
        password_reset_ttl=timedelta(minutes=PASSWORD_RESET_TTL_MINUTES),
    )


def _request_origin(request: Request) -> str | None:
    origin = request.headers.get("origin")
    if origin:
        return origin
    referer = request.headers.get("referer")
    if not referer:
        return None
    parsed = urlsplit(referer)
    return f"{parsed.scheme}://{parsed.netloc}" if parsed.scheme and parsed.netloc else None


def require_same_origin(request: Request) -> None:
    if request.headers.get("X-Requested-With") != "QuantDesk":
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail={"code": "invalid_request_origin"})
    origin = _request_origin(request)
    if origin and origin not in AUTH_ALLOWED_ORIGINS:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail={"code": "invalid_request_origin"})


def require_current_user(
    request: Request, store: AuthStore = Depends(get_auth_store)
) -> AuthUser:
    user = store.get_session_user(request.cookies.get(AUTH_COOKIE_NAME, ""))
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail={"code": "authentication_required"})
    return user


def get_optional_current_user(
    request: Request, store: AuthStore = Depends(get_auth_store)
) -> AuthUser | None:
    return store.get_session_user(request.cookies.get(AUTH_COOKIE_NAME, ""))


def _set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=AUTH_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=AUTH_COOKIE_SECURE,
        samesite="lax",
        path=AUTH_COOKIE_PATH,
        max_age=AUTH_SESSION_DAYS * 86400,
    )


def _user_payload(user: AuthUser | None) -> dict[str, dict[str, str] | None]:
    return {"user": {"email": user.email} if user else None}


@router.post(
    "/auth/register",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_same_origin)],
)
def register(credentials: Credentials, response: Response, store: AuthStore = Depends(get_auth_store)):
    try:
        user = store.register(credentials.email, credentials.password)
    except EmailAlreadyRegisteredError as error:
        raise HTTPException(status.HTTP_409_CONFLICT, detail={"code": "email_registered"}) from error
    session = store.create_session(user)
    _set_session_cookie(response, session.token)
    return _user_payload(user)


@router.post("/auth/login", dependencies=[Depends(require_same_origin)])
def login(credentials: Credentials, response: Response, store: AuthStore = Depends(get_auth_store)):
    user = store.authenticate(credentials.email, credentials.password)
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail={"code": "invalid_credentials"})
    session = store.create_session(user)
    _set_session_cookie(response, session.token)
    return _user_payload(user)


@router.post(
    "/auth/password-reset/request",
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[Depends(require_same_origin)],
)
def request_password_reset(
    payload: PasswordResetRequest, store: AuthStore = Depends(get_auth_store)
) -> Response:
    token = store.create_password_reset(payload.email)
    if token:
        try:
            send_password_reset_email(payload.email, token)
        except PasswordResetMailError:
            logger.exception("Password reset email delivery failed")
    return Response(status_code=status.HTTP_202_ACCEPTED)


@router.post(
    "/auth/password-reset/confirm",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_same_origin)],
)
def confirm_password_reset(
    payload: PasswordResetConfirmation, store: AuthStore = Depends(get_auth_store)
) -> Response:
    if not store.consume_password_reset(payload.token, payload.password):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail={"code": "password_reset_invalid"})
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/auth/logout", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_same_origin)])
def logout(request: Request, store: AuthStore = Depends(get_auth_store)) -> Response:
    store.revoke_session(request.cookies.get(AUTH_COOKIE_NAME, ""))
    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    response.delete_cookie(key=AUTH_COOKIE_NAME, path=AUTH_COOKIE_PATH)
    return response


@router.get("/auth/session")
def session(user: AuthUser | None = Depends(get_optional_current_user)):
    return _user_payload(user)


@router.get("/watchlist")
def list_watchlist(
    user: AuthUser = Depends(require_current_user), store: AuthStore = Depends(get_auth_store)
):
    return {"tickers": store.list_watchlist_tickers(user.id)}


def resolve_watchlist_stocks(tickers: list[str]) -> tuple[list[dict], list[str]]:
    snapshot = get_stock_snapshot()
    snapshot_stocks = snapshot.get("stocks") if isinstance(snapshot, dict) else []
    by_ticker = {
        str(stock.get("ticker", "")).upper(): stock
        for stock in snapshot_stocks
        if isinstance(stock, dict) and stock.get("ticker")
    }
    stocks: list[dict] = []
    unavailable_tickers: list[str] = []
    for ticker in tickers:
        stock = by_ticker.get(ticker.upper())
        if stock is None:
            try:
                quote = stock_quote(ticker)
                stock = quote.get("stock") if isinstance(quote, dict) else None
            except Exception:  # noqa: BLE001 - one unavailable ticker should not hide the rest.
                stock = None
        if isinstance(stock, dict):
            stocks.append(stock)
        else:
            unavailable_tickers.append(ticker)
    return stocks, unavailable_tickers


@router.get("/watchlist/stocks")
def list_watchlist_stocks(
    user: AuthUser = Depends(require_current_user), store: AuthStore = Depends(get_auth_store)
):
    tickers = store.list_watchlist_tickers(user.id)
    stocks, unavailable_tickers = resolve_watchlist_stocks(tickers)
    return {
        "tickers": tickers,
        "stocks": stocks,
        "unavailable_tickers": unavailable_tickers,
    }


@router.put("/watchlist/{ticker}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_same_origin)])
def add_watchlist_ticker(
    ticker: str,
    user: AuthUser = Depends(require_current_user),
    store: AuthStore = Depends(get_auth_store),
) -> Response:
    try:
        store.add_watchlist_ticker(user.id, normalize_ticker(ticker))
    except ValueError as error:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail={"code": "ticker_invalid"}) from error
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/watchlist/{ticker}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_same_origin)])
def delete_watchlist_ticker(
    ticker: str,
    user: AuthUser = Depends(require_current_user),
    store: AuthStore = Depends(get_auth_store),
) -> Response:
    try:
        store.remove_watchlist_ticker(user.id, normalize_ticker(ticker))
    except ValueError as error:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail={"code": "ticker_invalid"}) from error
    return Response(status_code=status.HTTP_204_NO_CONTENT)
