from __future__ import annotations

import hashlib
import secrets
import sqlite3
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from pathlib import Path

import bcrypt

from .models import normalize_email, normalize_ticker


class EmailAlreadyRegisteredError(ValueError):
    """Raised when a normalized email already has an account."""


@dataclass(frozen=True)
class AuthUser:
    id: int
    email: str


@dataclass(frozen=True)
class SessionRecord:
    token: str
    user: AuthUser


def hash_session_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


class AuthStore:
    def __init__(self, path: Path, session_ttl: timedelta) -> None:
        self.path = Path(path)
        self.session_ttl = session_ttl
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._initialize_schema()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.path)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        return connection

    def _initialize_schema(self) -> None:
        with self._connect() as connection:
            connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT NOT NULL UNIQUE,
                    password_hash BLOB NOT NULL,
                    created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS sessions (
                    token_hash TEXT PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    expires_at TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS watchlist_items (
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    ticker TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    PRIMARY KEY (user_id, ticker)
                );
                CREATE INDEX IF NOT EXISTS sessions_expiry_index ON sessions(expires_at);
                """
            )

    @staticmethod
    def _now() -> datetime:
        return datetime.now(UTC)

    @staticmethod
    def _user_from_row(row: sqlite3.Row | None) -> AuthUser | None:
        if row is None:
            return None
        return AuthUser(id=row["id"], email=row["email"])

    def register(self, email: str, password: str) -> AuthUser:
        normalized_email = normalize_email(email)
        password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
        now = self._now().isoformat()
        try:
            with self._connect() as connection:
                cursor = connection.execute(
                    "INSERT INTO users (email, password_hash, created_at) VALUES (?, ?, ?)",
                    (normalized_email, password_hash, now),
                )
        except sqlite3.IntegrityError as error:
            raise EmailAlreadyRegisteredError(normalized_email) from error
        return AuthUser(id=cursor.lastrowid, email=normalized_email)

    def authenticate(self, email: str, password: str) -> AuthUser | None:
        normalized_email = normalize_email(email)
        with self._connect() as connection:
            row = connection.execute(
                "SELECT id, email, password_hash FROM users WHERE email = ?", (normalized_email,)
            ).fetchone()
        if row is None or not bcrypt.checkpw(password.encode("utf-8"), row["password_hash"]):
            return None
        return AuthUser(id=row["id"], email=row["email"])

    def create_session(self, user: AuthUser) -> SessionRecord:
        token = secrets.token_urlsafe(32)
        now = self._now()
        with self._connect() as connection:
            connection.execute(
                "INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
                (hash_session_token(token), user.id, (now + self.session_ttl).isoformat(), now.isoformat()),
            )
        return SessionRecord(token=token, user=user)

    def get_session_user(self, token: str) -> AuthUser | None:
        if not token:
            return None
        now = self._now().isoformat()
        with self._connect() as connection:
            connection.execute("DELETE FROM sessions WHERE expires_at <= ?", (now,))
            row = connection.execute(
                """
                SELECT users.id, users.email
                FROM sessions
                JOIN users ON users.id = sessions.user_id
                WHERE sessions.token_hash = ? AND sessions.expires_at > ?
                """,
                (hash_session_token(token), now),
            ).fetchone()
        return self._user_from_row(row)

    def revoke_session(self, token: str) -> None:
        if not token:
            return
        with self._connect() as connection:
            connection.execute("DELETE FROM sessions WHERE token_hash = ?", (hash_session_token(token),))

    def list_watchlist_tickers(self, user_id: int) -> list[str]:
        with self._connect() as connection:
            rows = connection.execute(
                "SELECT ticker FROM watchlist_items WHERE user_id = ? ORDER BY created_at ASC, ticker ASC",
                (user_id,),
            ).fetchall()
        return [row["ticker"] for row in rows]

    def add_watchlist_ticker(self, user_id: int, ticker: str) -> None:
        normalized_ticker = normalize_ticker(ticker)
        with self._connect() as connection:
            connection.execute(
                "INSERT OR IGNORE INTO watchlist_items (user_id, ticker, created_at) VALUES (?, ?, ?)",
                (user_id, normalized_ticker, self._now().isoformat()),
            )

    def remove_watchlist_ticker(self, user_id: int, ticker: str) -> bool:
        normalized_ticker = normalize_ticker(ticker)
        with self._connect() as connection:
            cursor = connection.execute(
                "DELETE FROM watchlist_items WHERE user_id = ? AND ticker = ?",
                (user_id, normalized_ticker),
            )
        return cursor.rowcount > 0
