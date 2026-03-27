"""
core/email.py
Email sending utilities using SMTP.
"""

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from core.config import settings

logger = logging.getLogger(__name__)


def send_otp_email(to_email: str, otp: str, full_name: str = "") -> bool:
    """
    Send OTP verification email.
    Returns True if email was sent successfully, False otherwise.
    """
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD or not settings.SMTP_FROM_EMAIL:
        logger.warning("SMTP not configured. Skipping email send.")
        return False

    try:
        # Create message
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"Your {settings.APP_NAME} Verification Code"
        msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
        msg["To"] = to_email

        # Plain text version
        text_body = f"""
Hello{" " + full_name if full_name else ""},

Your verification code is: {otp}

This code will expire in 10 minutes.

If you didn't request this code, please ignore this email.

Best regards,
{settings.APP_NAME} Team
        """.strip()

        # HTML version
        html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
        .content {{ background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }}
        .otp-code {{ font-size: 32px; font-weight: bold; color: #4CAF50; text-align: center; padding: 20px; background-color: white; border-radius: 8px; margin: 20px 0; letter-spacing: 8px; }}
        .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{settings.APP_NAME}</h1>
        </div>
        <div class="content">
            <p>Hello{" " + full_name if full_name else ""},</p>
            <p>Your verification code is:</p>
            <div class="otp-code">{otp}</div>
            <p style="text-align: center; color: #666;">This code will expire in 10 minutes.</p>
            <p style="margin-top: 30px;">If you didn't request this code, please ignore this email.</p>
        </div>
        <div class="footer">
            <p>Best regards,<br>{settings.APP_NAME} Team</p>
        </div>
    </div>
</body>
</html>
        """.strip()

        # Attach both versions
        part1 = MIMEText(text_body, "plain")
        part2 = MIMEText(html_body, "html")
        msg.attach(part1)
        msg.attach(part2)

        # Send email
        # Use SMTP_SSL for port 465, regular SMTP with STARTTLS for port 587
        if settings.SMTP_PORT == 465:
            # SSL connection (port 465)
            with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(msg)
        else:
            # STARTTLS connection (port 587)
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(msg)

        logger.info(f"OTP email sent successfully to {to_email}")
        return True

    except smtplib.SMTPAuthenticationError:
        logger.error("SMTP authentication failed. Check SMTP_USER and SMTP_PASSWORD.")
        return False
    except smtplib.SMTPException as e:
        logger.error(f"SMTP error while sending email to {to_email}: {e}")
        return False
    except (TimeoutError, OSError) as e:
        logger.error(
            f"Connection timeout/error when sending email to {to_email}: {e}. "
            f"Try port 465 instead of 587, or check firewall/antivirus settings."
        )
        return False
    except Exception as e:
        logger.error(f"Unexpected error while sending email to {to_email}: {e}")
        return False
