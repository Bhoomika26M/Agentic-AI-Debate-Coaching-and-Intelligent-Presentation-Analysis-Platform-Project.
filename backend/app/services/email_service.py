import logging
import smtplib
from email.message import EmailMessage

from app.core.config import settings

logger = logging.getLogger(__name__)


def build_password_reset_link(token: str) -> str:
    base_url = settings.frontend_base_url.rstrip("/")
    return f"{base_url}/reset-password?token={token}"


def send_password_reset_email(recipient_email: str, reset_token: str) -> str | None:
    if settings.email_backend == "smtp":
        message = EmailMessage()
        message["Subject"] = "Reset your Debate Coach password"
        message["From"] = settings.smtp_from_email
        message["To"] = recipient_email
        link = build_password_reset_link(reset_token)
        message.set_content(
            "Use the link below to reset your password. This link expires in 15 minutes.\n\n"
            f"{link}\n\n"
            "If you did not request this, you can ignore this email."
        )
        try:
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
                if settings.smtp_use_tls:
                    server.starttls()
                if settings.smtp_username and settings.smtp_password:
                    server.login(settings.smtp_username, settings.smtp_password)
                server.send_message(message)
            return link
        except Exception:
            logger.exception("Failed to send password-reset email")
            return None

    if settings.environment == "development" and settings.password_reset_debug_mode:
        link = build_password_reset_link(reset_token)
        logger.warning("Development password-reset link: %s", link)
        return link

    logger.info("Password reset email queued for %s via console backend", recipient_email)
    return None
