from __future__ import annotations

import smtplib
import ssl
from email.message import EmailMessage
from urllib.parse import quote

from ..config import (
    PASSWORD_RESET_BASE_URL,
    SMTP_FROM_EMAIL,
    SMTP_HOST,
    SMTP_PASSWORD,
    SMTP_PORT,
    SMTP_USERNAME,
)


class PasswordResetMailError(RuntimeError):
    """Raised when password-reset email delivery is unavailable."""


def send_password_reset_email(email: str, token: str) -> None:
    if not all((SMTP_HOST, SMTP_USERNAME, SMTP_PASSWORD, SMTP_FROM_EMAIL, PASSWORD_RESET_BASE_URL)):
        raise PasswordResetMailError("password reset email is not configured")

    reset_url = f"{PASSWORD_RESET_BASE_URL.rstrip('/')}/reset-password?token={quote(token, safe='')}"
    message = EmailMessage()
    message["Subject"] = "QuantDesk 密码重置"
    message["From"] = SMTP_FROM_EMAIL
    message["To"] = email
    message.set_content(
        "你正在重置 QuantDesk 密码。请在 15 分钟内打开以下链接设置新密码：\n\n"
        f"{reset_url}\n\n"
        "如果不是你本人操作，请忽略本邮件。"
    )

    try:
        with smtplib.SMTP_SSL(
            SMTP_HOST,
            SMTP_PORT,
            context=ssl.create_default_context(),
            timeout=10,
        ) as smtp:
            smtp.login(SMTP_USERNAME, SMTP_PASSWORD)
            smtp.send_message(message)
    except (OSError, smtplib.SMTPException) as error:
        raise PasswordResetMailError("password reset email delivery failed") from error
