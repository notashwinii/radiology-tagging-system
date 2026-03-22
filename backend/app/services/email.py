import smtplib
import textwrap
from email.message import EmailMessage
from urllib.parse import quote

from app.core.settings import (
    APP_BASE_URL,
    EMAIL_FROM,
    SMTP_HOST,
    SMTP_PASSWORD,
    SMTP_PORT,
    SMTP_USE_TLS,
    SMTP_USERNAME,
)


class EmailDeliveryError(RuntimeError):
    pass


def send_verification_email(recipient_email: str, token: str) -> None:
    verification_url = f"{APP_BASE_URL}/verify-email/confirm?token={quote(token)}"

    msg = EmailMessage()
    msg["Subject"] = "Verify your Radiology Tagging System account"
    msg["From"] = EMAIL_FROM
    msg["To"] = recipient_email
    msg.set_content(
        textwrap.dedent(
            f"""
            Welcome to Radiology Tagging System.

            Please verify your email address to activate your account.
            {verification_url}

            If you did not create this account, you can ignore this message.
            """
        ).strip()
    )
    msg.add_alternative(
        f"""
        <p>Welcome to Radiology Tagging System.</p>
        <p>Please verify your email address to activate your account.</p>
        <p><a href=\"{verification_url}\">Verify your email</a></p>
        <p>If you did not create this account, you can ignore this message.</p>
        """,
        subtype="html",
    )

    try:
        if SMTP_USE_TLS:
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as server:
                server.starttls()
                server.login(SMTP_USERNAME, SMTP_PASSWORD)
                server.send_message(msg)
        else:
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as server:
                server.login(SMTP_USERNAME, SMTP_PASSWORD)
                server.send_message(msg)
    except Exception as exc:  # pragma: no cover - network path
        raise EmailDeliveryError(f"SMTP send failed: {exc}") from exc
