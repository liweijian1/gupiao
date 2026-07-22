from datetime import UTC, datetime, timedelta

from app.auth.store import AuthStore, hash_session_token


def test_reset_token_is_single_use_and_revokes_sessions(tmp_path):
    store = AuthStore(tmp_path / "auth.sqlite3", timedelta(days=30))
    user = store.register("user@example.com", "initial-secret")
    session = store.create_session(user)

    token = store.create_password_reset(user.email)

    assert token is not None
    assert store.consume_password_reset(token, "replacement-secret") is True
    assert store.authenticate(user.email, "initial-secret") is None
    assert store.authenticate(user.email, "replacement-secret") == user
    assert store.get_session_user(session.token) is None
    assert store.consume_password_reset(token, "another-secret") is False


def test_unknown_or_expired_reset_token_cannot_change_password(tmp_path):
    store = AuthStore(tmp_path / "auth.sqlite3", timedelta(days=30))
    user = store.register("user@example.com", "initial-secret")

    assert store.create_password_reset("missing@example.com") is None
    token = store.create_password_reset(user.email)
    assert token is not None
    with store._connect() as connection:
        connection.execute(
            "UPDATE password_reset_tokens SET expires_at = ? WHERE token_hash = ?",
            ((datetime.now(UTC) - timedelta(seconds=1)).isoformat(), hash_session_token(token)),
        )

    assert store.consume_password_reset(token, "replacement-secret") is False
    assert store.authenticate(user.email, "initial-secret") == user
