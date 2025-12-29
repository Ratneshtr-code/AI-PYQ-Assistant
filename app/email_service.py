# app/email_service.py
"""
Email service for sending OTP and password reset emails via Gmail SMTP
"""
import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import logging
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Gmail SMTP configuration
GMAIL_SMTP_SERVER = "smtp.gmail.com"
GMAIL_SMTP_PORT = 587
GMAIL_USER = os.getenv("GMAIL_USER")
GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


def send_email(
    to_email: str,
    subject: str,
    html_body: str,
    text_body: Optional[str] = None
) -> bool:
    """
    Send an email via Gmail SMTP
    
    Args:
        to_email: Recipient email address
        subject: Email subject
        html_body: HTML email body
        text_body: Plain text email body (optional)
    
    Returns:
        True if email sent successfully, False otherwise
    """
    if not GMAIL_USER or not GMAIL_APP_PASSWORD:
        logger.error("Gmail credentials not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD environment variables.")
        return False
    
    try:
        # Create message
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = GMAIL_USER
        msg["To"] = to_email
        
        # Add text and HTML parts
        if text_body:
            text_part = MIMEText(text_body, "plain")
            msg.attach(text_part)
        
        html_part = MIMEText(html_body, "html")
        msg.attach(html_part)
        
        # Connect to SMTP server and send
        with smtplib.SMTP(GMAIL_SMTP_SERVER, GMAIL_SMTP_PORT) as server:
            server.starttls()
            server.login(GMAIL_USER, GMAIL_APP_PASSWORD)
            server.send_message(msg)
        
        logger.info(f"Email sent successfully to {to_email}")
        return True
    
    except smtplib.SMTPAuthenticationError as e:
        logger.error(f"SMTP authentication failed: {str(e)}")
        return False
    except smtplib.SMTPException as e:
        logger.error(f"SMTP error while sending email: {str(e)}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error while sending email: {str(e)}")
        return False


def send_otp_email(email: str, otp_code: str, username: str) -> bool:
    """
    Send OTP verification email
    
    Args:
        email: Recipient email address
        otp_code: 6-digit OTP code
        username: User's username
    
    Returns:
        True if email sent successfully, False otherwise
    """
    subject = "Verify Your Email - AI PYQ Assistant"
    
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
            }}
            .container {{
                background-color: #f9f9f9;
                border-radius: 10px;
                padding: 30px;
                border: 1px solid #e0e0e0;
            }}
            .header {{
                text-align: center;
                margin-bottom: 30px;
            }}
            .logo {{
                font-size: 24px;
                font-weight: bold;
                color: #2563eb;
            }}
            .otp-box {{
                background-color: #ffffff;
                border: 2px solid #2563eb;
                border-radius: 8px;
                padding: 20px;
                text-align: center;
                margin: 30px 0;
            }}
            .otp-code {{
                font-size: 32px;
                font-weight: bold;
                color: #2563eb;
                letter-spacing: 5px;
                font-family: 'Courier New', monospace;
            }}
            .footer {{
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e0e0e0;
                font-size: 12px;
                color: #666;
                text-align: center;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">AI PYQ Assistant</div>
            </div>
            <h2>Hello {username}!</h2>
            <p>Thank you for signing up. Please verify your email address by entering the OTP code below:</p>
            <div class="otp-box">
                <div class="otp-code">{otp_code}</div>
            </div>
            <p>This code will expire in 15 minutes.</p>
            <p>If you didn't create an account, please ignore this email.</p>
            <div class="footer">
                <p>This is an automated email. Please do not reply.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    text_body = f"""
    Hello {username}!
    
    Thank you for signing up for AI PYQ Assistant.
    
    Please verify your email address by entering the OTP code below:
    
    {otp_code}
    
    This code will expire in 15 minutes.
    
    If you didn't create an account, please ignore this email.
    """
    
    return send_email(email, subject, html_body, text_body)


def send_password_reset_email(email: str, reset_token: str, username: str) -> bool:
    """
    Send password reset email with reset link
    
    Args:
        email: Recipient email address
        reset_token: Password reset token
        username: User's username
    
    Returns:
        True if email sent successfully, False otherwise
    """
    reset_url = f"{FRONTEND_URL}/reset-password?token={reset_token}"
    subject = "Reset Your Password - AI PYQ Assistant"
    
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
            }}
            .container {{
                background-color: #f9f9f9;
                border-radius: 10px;
                padding: 30px;
                border: 1px solid #e0e0e0;
            }}
            .header {{
                text-align: center;
                margin-bottom: 30px;
            }}
            .logo {{
                font-size: 24px;
                font-weight: bold;
                color: #2563eb;
            }}
            .button {{
                display: inline-block;
                background-color: #2563eb;
                color: #ffffff;
                padding: 12px 30px;
                text-decoration: none;
                border-radius: 5px;
                margin: 20px 0;
                font-weight: bold;
            }}
            .button:hover {{
                background-color: #1d4ed8;
            }}
            .footer {{
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e0e0e0;
                font-size: 12px;
                color: #666;
                text-align: center;
            }}
            .warning {{
                background-color: #fef3c7;
                border-left: 4px solid #f59e0b;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">AI PYQ Assistant</div>
            </div>
            <h2>Hello {username}!</h2>
            <p>We received a request to reset your password. Click the button below to reset it:</p>
            <div style="text-align: center;">
                <a href="{reset_url}" class="button">Reset Password</a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #2563eb;">{reset_url}</p>
            <div class="warning">
                <strong>⚠️ Security Notice:</strong> This link will expire in 1 hour. If you didn't request a password reset, please ignore this email and your password will remain unchanged.
            </div>
            <div class="footer">
                <p>This is an automated email. Please do not reply.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    text_body = f"""
    Hello {username}!
    
    We received a request to reset your password for AI PYQ Assistant.
    
    Click the link below to reset your password:
    
    {reset_url}
    
    This link will expire in 1 hour.
    
    If you didn't request a password reset, please ignore this email and your password will remain unchanged.
    """
    
    return send_email(email, subject, html_body, text_body)

