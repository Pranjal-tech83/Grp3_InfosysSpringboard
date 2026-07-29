"""
Real Email Sending Endpoint — POST /api/email/send
=====================================================

WHY THIS FILE EXISTS
---------------------
The frontend "Email Outbox & Delivery Status" screen currently shows a
SIMULATED email (dummy data), not a real one — nothing actually reaches an
inbox. This router adds a real endpoint that sends an actual email via
SMTP, so the frontend (or the email_service/notifier.py module) can call
it and have the message really delivered.

HOW TO WIRE THIS INTO THE APP
--------------------------------
1. Save this file as: app/routers/email.py
2. In app/main.py, add these two lines near the other router imports/includes:

       from .routers import email as email_router
       app.include_router(email_router.router, prefix="/api/email", tags=["email"])

   (Look at how the existing routers like `tickets`, `escalations`, etc. are
   imported/included in main.py, and add this the same way, right next to them.)

REAL SMTP CREDENTIALS — REQUIRED FOR THIS TO ACTUALLY SEND
--------------------------------------------------------------
This endpoint reads SMTP credentials from environment variables (never
hardcode a real password in code / GitHub). Before starting the backend,
set these in the same terminal window:

    set SMTP_HOST=smtp.gmail.com
    set SMTP_PORT=587
    set SMTP_USERNAME=your-email@gmail.com
    set SMTP_PASSWORD=your-16-character-app-password
    set SMTP_FROM=your-email@gmail.com

IMPORTANT — Gmail requires an "App Password", not your normal login password:
1. Turn on 2-Step Verification on the Gmail account: myaccount.google.com/security
2. Go to myaccount.google.com/apppasswords
3. Generate an app password for "Mail" — copy the 16-character code
4. Use THAT as SMTP_PASSWORD above (not the real Gmail password)

If these env vars are not set, this endpoint returns a clear error instead
of silently failing, so you'll always know why an email didn't go out.
"""

import os
import smtplib
import ssl
from email.mime.text import MIMEText

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr

router = APIRouter()


class EmailSendRequest(BaseModel):
    to: EmailStr
    subject: str
    body: str


class EmailSendResponse(BaseModel):
    status: str
    detail: str


@router.post("/send", response_model=EmailSendResponse)
def send_email(payload: EmailSendRequest):
    smtp_host = os.environ.get("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.environ.get("SMTP_PORT", "587"))
    smtp_username = os.environ.get("SMTP_USERNAME", "")
    smtp_password = os.environ.get("SMTP_PASSWORD", "")
    from_address = os.environ.get("SMTP_FROM", smtp_username)

    if not smtp_username or not smtp_password:
        raise HTTPException(
            status_code=500,
            detail=(
                "SMTP credentials are not configured. Set SMTP_USERNAME and "
                "SMTP_PASSWORD environment variables before starting the "
                "backend (see the docstring in app/routers/email.py)."
            ),
        )

    try:
        msg = MIMEText(payload.body, "plain")
        msg["Subject"] = payload.subject
        msg["From"] = from_address
        msg["To"] = payload.to

        context = ssl.create_default_context()
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls(context=context)
            server.login(smtp_username, smtp_password)
            server.sendmail(from_address, [payload.to], msg.as_string())

        return EmailSendResponse(status="sent", detail=f"Email delivered to {payload.to}.")

    except smtplib.SMTPAuthenticationError:
        raise HTTPException(
            status_code=401,
            detail="SMTP authentication failed — check SMTP_USERNAME/SMTP_PASSWORD (use an app password for Gmail).",
        )
    except Exception as exc:  # noqa: BLE001 — surface any SMTP error clearly to the caller
        raise HTTPException(status_code=502, detail=f"Failed to send email: {exc}")
