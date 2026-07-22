from __future__ import annotations

import re

from pydantic import BaseModel, field_validator


EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
TICKER_PATTERN = re.compile(r"^[A-Z0-9._-]{1,24}$")


def normalize_email(value: str) -> str:
    email = str(value).strip().lower()
    if not EMAIL_PATTERN.fullmatch(email):
        raise ValueError("email_invalid")
    return email


def normalize_ticker(value: str) -> str:
    ticker = str(value).strip().upper()
    if not TICKER_PATTERN.fullmatch(ticker):
        raise ValueError("ticker_invalid")
    return ticker


def validate_password(value: str) -> str:
    password = str(value)
    if not 10 <= len(password) <= 128:
        raise ValueError("password_length_invalid")
    return password


class Credentials(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def email_is_valid(cls, value: str) -> str:
        return normalize_email(value)

    @field_validator("password")
    @classmethod
    def password_has_valid_length(cls, value: str) -> str:
        return validate_password(value)


class PasswordResetRequest(BaseModel):
    email: str

    @field_validator("email")
    @classmethod
    def email_is_valid(cls, value: str) -> str:
        return normalize_email(value)


class PasswordResetConfirmation(BaseModel):
    token: str
    password: str

    @field_validator("token")
    @classmethod
    def token_is_present(cls, value: str) -> str:
        token = str(value).strip()
        if not token:
            raise ValueError("password_reset_invalid")
        return token

    @field_validator("password")
    @classmethod
    def password_has_valid_length(cls, value: str) -> str:
        return validate_password(value)
