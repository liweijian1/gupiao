from datetime import timedelta

import pytest

from app.auth.store import AuthStore, EmailAlreadyRegisteredError


def test_register_authenticate_and_keep_passwords_out_of_records(tmp_path):
    store = AuthStore(tmp_path / "auth.sqlite3", timedelta(days=30))
    user = store.register(" User@Example.com ", "correct horse battery")

    assert user.email == "user@example.com"
    assert store.authenticate("user@example.com", "correct horse battery") == user
    assert store.authenticate("user@example.com", "wrong password") is None
    assert "correct horse battery" not in (tmp_path / "auth.sqlite3").read_bytes().decode("latin1")


def test_register_rejects_duplicate_normalized_email(tmp_path):
    store = AuthStore(tmp_path / "auth.sqlite3", timedelta(days=30))
    store.register("User@Example.com", "correct horse battery")

    with pytest.raises(EmailAlreadyRegisteredError):
        store.register(" user@example.com ", "a different password")


def test_sessions_and_watchlist_are_user_scoped_and_idempotent(tmp_path):
    store = AuthStore(tmp_path / "auth.sqlite3", timedelta(days=30))
    first = store.register("first@example.com", "first password")
    second = store.register("second@example.com", "second password")

    session = store.create_session(first)
    assert store.get_session_user(session.token) == first
    store.revoke_session(session.token)
    assert store.get_session_user(session.token) is None

    store.add_watchlist_ticker(first.id, "600519")
    store.add_watchlist_ticker(first.id, "600519")
    store.add_watchlist_ticker(second.id, "MSFT")

    assert store.list_watchlist_tickers(first.id) == ["600519"]
    assert store.list_watchlist_tickers(second.id) == ["MSFT"]
    assert store.remove_watchlist_ticker(first.id, "600519") is True
    assert store.remove_watchlist_ticker(first.id, "600519") is False
