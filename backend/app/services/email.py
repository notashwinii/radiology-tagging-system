from urllib.parse import quote

import requests

from app.core.settings import APP_BASE_URL, EMAIL_FROM, RESEND_API_KEY


class EmailDeliveryError(RuntimeError):
    pass


def send_verification_email(recipient_email: str, token: str) -> None:
    verification_url = f"{APP_BASE_URL}/verify-email/confirm?token={quote(token)}"
    response = requests.post(
        "https://api.resend.com/emails",
        headers={
            "Authorization": f"Bearer {RESEND_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "from": EMAIL_FROM,
            "to": [recipient_email],
            "subject": "Verify your Radiology Tagging System account",
            "html": (
                "<p>Welcome to Radiology Tagging System.</p>"
                "<p>Please verify your email address to activate your account.</p>"
                f'<p><a href="{verification_url}">Verify your email</a></p>'
                "<p>If you did not create this account, you can ignore this message.</p>"
            ),
            "text": (
                "Welcome to Radiology Tagging System.\n\n"
                "Please verify your email address to activate your account.\n"
                f"{verification_url}\n\n"
                "If you did not create this account, you can ignore this message."
            ),
        },
        timeout=15,
    )
    if not response.ok:
        raise EmailDeliveryError(
            f"Resend email delivery failed with status {response.status_code}: {response.text}"
        )
