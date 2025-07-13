"""
Email Service Module

Handles SMTP email sending with support for both development (Mailpit)
and production environments.
"""

import os
import asyncio
import html
from typing import Optional, List
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
import aiosmtplib
import logging

logger = logging.getLogger(__name__)


class EmailService:
    """Email service for sending emails via SMTP."""

    def __init__(self):
        self.smtp_server = os.getenv("SMTP_SERVER", "localhost")
        self.smtp_port = int(os.getenv("SMTP_PORT", "1025"))
        self.smtp_username = os.getenv("SMTP_USERNAME", "")
        self.smtp_password = os.getenv("SMTP_PASSWORD", "")
        self.smtp_use_tls = os.getenv("SMTP_USE_TLS", "false").lower() == "true"
        self.from_email = os.getenv("SMTP_FROM_EMAIL", "noreply@zentropy.local")
        self.from_name = os.getenv("SMTP_FROM_NAME", "Zentropy")
        self.email_enabled = os.getenv("EMAIL_ENABLED", "true").lower() == "true"

        # Full sender address with name
        self.from_address = f"{self.from_name} <{self.from_email}>"

    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        attachments: Optional[List[dict]] = None,
    ) -> bool:
        """
        Send an email via SMTP.

        Args:
            to_email: Recipient email address
            subject: Email subject
            html_content: HTML version of the email
            text_content: Plain text version (optional)
            attachments: List of attachment dictionaries (optional)

        Returns:
            bool: True if email was sent successfully, False otherwise
        """
        if not self.email_enabled:
            logger.info(f"Email sending disabled. Would send to {to_email}: {subject}")
            return True

        try:
            # Create message
            message = MIMEMultipart("alternative")
            message["From"] = self.from_address
            message["To"] = to_email
            message["Subject"] = subject

            # Add text content if provided
            if text_content:
                text_part = MIMEText(text_content, "plain")
                message.attach(text_part)

            # Add HTML content
            html_part = MIMEText(html_content, "html")
            message.attach(html_part)

            # Add attachments if provided
            if attachments:
                for attachment in attachments:
                    part = MIMEBase("application", "octet-stream")
                    part.set_payload(attachment["content"])
                    encoders.encode_base64(part)
                    part.add_header(
                        "Content-Disposition",
                        f"attachment; filename= {attachment['filename']}",
                    )
                    message.attach(part)

            # Send email
            await aiosmtplib.send(
                message,
                hostname=self.smtp_server,
                port=self.smtp_port,
                username=self.smtp_username if self.smtp_username else None,
                password=self.smtp_password if self.smtp_password else None,
                use_tls=self.smtp_use_tls,
            )

            logger.info(f"Email sent successfully to {to_email}")
            return True

        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return False

    def send_email_sync(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        attachments: Optional[List[dict]] = None,
    ) -> bool:
        """
        Synchronous wrapper for send_email.

        Args:
            to_email: Recipient email address
            subject: Email subject
            html_content: HTML version of the email
            text_content: Plain text version (optional)
            attachments: List of attachment dictionaries (optional)

        Returns:
            bool: True if email was sent successfully, False otherwise
        """
        try:
            # Try to get the current event loop
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # If loop is already running, create a new thread
                import concurrent.futures

                def run_in_thread():
                    new_loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(new_loop)
                    try:
                        return new_loop.run_until_complete(
                            self.send_email(
                                to_email,
                                subject,
                                html_content,
                                text_content,
                                attachments,
                            )
                        )
                    finally:
                        new_loop.close()

                with concurrent.futures.ThreadPoolExecutor() as executor:
                    future = executor.submit(run_in_thread)
                    return future.result()
            else:
                # Loop exists but not running, use it
                return loop.run_until_complete(
                    self.send_email(
                        to_email, subject, html_content, text_content, attachments
                    )
                )
        except RuntimeError:
            # No event loop exists, create a new one
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                return loop.run_until_complete(
                    self.send_email(
                        to_email, subject, html_content, text_content, attachments
                    )
                )
            finally:
                loop.close()


# Global email service instance
email_service = EmailService()


def send_verification_code_email(email: str, code: str, user_name: str) -> bool:
    """
    Send email verification code to user.

    Args:
        email: User's email address
        code: 6-digit verification code
        user_name: User's full name

    Returns:
        bool: True if email was sent successfully, False otherwise
    """
    subject = "Your Zentropy verification code"

    # HTML version of the email (escape user input for security)
    escaped_user_name = html.escape(user_name)
    html_content = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #6A8BA7;">Welcome to Zentropy!</h2>
            <p>Hello {escaped_user_name},</p>
            <p>Thank you for registering with Zentropy. Please enter the
                verification code below in the app to verify your email address:</p>

            <div style="text-align: center; margin: 30px 0;">
                <div style="background-color: #f8f9fa; border: 2px dashed #6A8BA7;
                           border-radius: 8px; padding: 20px; display: inline-block;">
                    <h1 style="font-size: 32px; letter-spacing: 4px; margin: 0;
                              color: #6A8BA7; font-weight: bold;">{code}</h1>
                    <p style="margin: 10px 0 0 0; font-size: 14px; color: #666;">
                        Verification Code
                    </p>
                </div>
            </div>

            <p><strong>This code expires in 15 minutes.</strong></p>
            <p>If you didn't create an account with Zentropy, please ignore
                this email.</p>
            <br>
            <p>Best regards,<br>The Zentropy Team</p>
        </div>
    </body>
    </html>
    """

    # Plain text version
    text_content = f"""
    Welcome to Zentropy!

    Hello {user_name},

    Thank you for registering with Zentropy. Please enter the verification code
    below in the app to verify your email address:

    Verification Code: {code}

    This code expires in 15 minutes.

    If you didn't create an account with Zentropy, please ignore this email.

    Best regards,
    The Zentropy Team
    """

    return email_service.send_email_sync(
        to_email=email,
        subject=subject,
        html_content=html_content,
        text_content=text_content,
    )


def send_verification_email(email: str, token: str, user_name: str) -> bool:
    """
    DEPRECATED: Send email verification email to user with URL token.
    Use send_verification_code_email() instead.

    Args:
        email: User's email address
        token: Verification token
        user_name: User's full name

    Returns:
        bool: True if email was sent successfully, False otherwise
    """
    subject = "Please verify your email address"

    # HTML version of the email (escape user input for security)
    escaped_user_name = html.escape(user_name)
    html_content = f"""
    <html>
    <body>
        <h2>Welcome to Zentropy!</h2>
        <p>Hello {escaped_user_name},</p>
        <p>Thank you for registering with Zentropy. Please click the link below to
           verify your email address:</p>
        <p>
            <a href="http://localhost:5173/verify-email/{token}"
               style="background-color: #4CAF50; color: white; padding: 10px 20px;
                      text-decoration: none; border-radius: 5px;">
                Verify Email Address
            </a>
        </p>
        <p>If the button doesn't work, you can copy and paste this link into
           your browser:</p>
        <p><a href="http://localhost:5173/verify-email/{token}">
           http://localhost:5173/verify-email/{token}</a></p>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't create an account with Zentropy, please ignore this email.</p>
        <br>
        <p>Best regards,<br>The Zentropy Team</p>
    </body>
    </html>
    """

    # Plain text version
    text_content = f"""
    Welcome to Zentropy!

    Hello {user_name},

    Thank you for registering with Zentropy. Please click the link below to
    verify your email address:

    http://localhost:5173/verify-email/{token}

    This link will expire in 24 hours.

    If you didn't create an account with Zentropy, please ignore this email.

    Best regards,
    The Zentropy Team
    """

    return email_service.send_email_sync(
        to_email=email,
        subject=subject,
        html_content=html_content,
        text_content=text_content,
    )


def send_password_reset_email(email: str, token: str, user_name: str) -> bool:
    """
    Send password reset email to user.

    Args:
        email: User's email address
        token: Password reset token
        user_name: User's full name

    Returns:
        bool: True if email was sent successfully, False otherwise
    """
    subject = "Reset your Zentropy password"

    # HTML version of the email
    html_content = f"""
    <html>
    <body>
        <h2>Password Reset Request</h2>
        <p>Hello {user_name},</p>
        <p>We received a request to reset your password for your Zentropy account.
           Click the link below to reset your password:</p>
        <p>
            <a href="http://localhost:5173/reset-password/{token}"
               style="background-color: #2196F3; color: white; padding: 10px 20px;
                      text-decoration: none; border-radius: 5px;">
                Reset Password
            </a>
        </p>
        <p>If the button doesn't work, you can copy and paste this link into
           your browser:</p>
        <p><a href="http://localhost:5173/reset-password/{token}">
           http://localhost:5173/reset-password/{token}</a></p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request a password reset, please ignore this email or
           contact support if you have concerns.</p>
        <br>
        <p>Best regards,<br>The Zentropy Team</p>
    </body>
    </html>
    """

    # Plain text version
    text_content = f"""
    Password Reset Request

    Hello {user_name},

    We received a request to reset your password for your Zentropy account.
    Click the link below to reset your password:

    http://localhost:5173/reset-password/{token}

    This link will expire in 1 hour.

    If you didn't request a password reset, please ignore this email or
    contact support if you have concerns.

    Best regards,
    The Zentropy Team
    """

    return email_service.send_email_sync(
        to_email=email,
        subject=subject,
        html_content=html_content,
        text_content=text_content,
    )
