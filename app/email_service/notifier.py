"""
SupportPilot — Email Automation Pipeline (Member 4: Milestone 3)
==================================================================

WHAT THIS FILE DOES
--------------------
This is the automated email communication system for SupportPilot. It sends
users an email whenever something happens to their ticket (an AI resolution
was generated, or the ticket was escalated to a human team), and it keeps
an audit log of every email that was attempted, so we can always answer
"did the user actually get notified, and when?".

Three responsibilities (matching the assigned scope):
1. SMTP background service to send resolution suggestions / status emails.
2. Notification triggers — call `notify_ticket_event(...)` whenever a ticket
   updates (resolved, escalated, etc.) and it composes + sends the right email.
3. Delivery audit logs — every send attempt (success or failure) is appended
   to `email_audit_log.jsonl` so there's a full outbox history to inspect.

HOW IT PLUGS INTO THE REST OF THE TEAM
---------------------------------------
- Member 1/2 (LangGraph orchestrator + agent nodes): after their graph saves
  a response or creates an escalation, they can call this module's
  `notify_ticket_event(ticket_id, event_type)` as the final step — same
  pattern as the Resolution Agent I already built for Milestone 1/2.
- Member 2 (backend/API, from Milestone 1): this module reads ticket info
  from `GET /api/tickets/{id}`, same as before — no direct DB access.
- Member 3 (Jira integration): when a Jira ticket is created for an
  escalation, that's a separate "escalated" event this module can email
  about too.

DRY-RUN MODE (IMPORTANT — lets you demo without a real email account)
-----------------------------------------------------------------------
By default `DRY_RUN = True`. In dry-run mode, no real email is sent — the
module builds the email content and logs it exactly as if it had sent it,
so you can test/demo the whole pipeline today without needing SMTP
credentials. When your team is ready to send real emails, set
`DRY_RUN = False` and fill in real SMTP credentials via environment
variables (see CONFIG section below).

HOW TO RUN THIS FILE STANDALONE (for testing/demo)
-----------------------------------------------------
    # Dry-run demo with mock data — no backend, no SMTP account needed:
    python app/email_service/notifier.py --demo

    # Against a real ticket (requires backend running):
    python app/email_service/notifier.py --ticket-id 1 --event resolved
    python app/email_service/notifier.py --ticket-id 1 --event escalated

    # View the audit log so far:
    python app/email_service/notifier.py --show-log
"""

from __future__ import annotations

import argparse
import json
import os
import smtplib
import ssl
from datetime import datetime
from email.mime.text import MIMEText
from pathlib import Path
from typing import Optional

import requests

# ---------------------------------------------------------------------------
# CONFIG
# ---------------------------------------------------------------------------
API_BASE_URL = "http://127.0.0.1:8000"          # Member 2's FastAPI server

# Flip to False once you have a real SMTP account to test with.
DRY_RUN = os.environ.get("EMAIL_DRY_RUN", "true").lower() != "false"

SMTP_HOST = os.environ.get("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USERNAME = os.environ.get("SMTP_USERNAME", "")   # e.g. supportpilot@company.com
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")   # app password, never hardcode this
FROM_ADDRESS = os.environ.get("SMTP_FROM", SMTP_USERNAME or "supportpilot@example.com")

# Audit log lives next to this file so it's easy to find and inspect.
AUDIT_LOG_PATH = Path(__file__).parent / "email_audit_log.jsonl"


# ---------------------------------------------------------------------------
# 1. EMAIL CONTENT — one template per event type
# ---------------------------------------------------------------------------
def build_email_content(event_type: str, ticket: dict, extra: Optional[dict] = None) -> tuple[str, str]:
    """Returns (subject, body) for the given event type."""
    extra = extra or {}
    ticket_id = ticket.get("ticket_id")
    subject_line = ticket.get("subject", "your support ticket")

    if event_type == "resolved":
        resolution_text = extra.get("generated_response", "A resolution has been generated for your ticket.")
        subject = f"[SupportPilot] Ticket #{ticket_id} — Resolution suggestion ready"
        body = (
            f"Hi,\n\n"
            f"We've analyzed your ticket \"{subject_line}\" and generated a suggested resolution:\n\n"
            f"{resolution_text}\n\n"
            f"If this resolves your issue, no further action is needed. If not, please reply and "
            f"we'll escalate this to our support team.\n\n"
            f"— SupportPilot"
        )

    elif event_type == "escalated":
        team = extra.get("assigned_team", "our support team")
        reason = extra.get("escalation_reason", "this needs a human specialist to resolve.")
        subject = f"[SupportPilot] Ticket #{ticket_id} — Escalated to {team}"
        body = (
            f"Hi,\n\n"
            f"Your ticket \"{subject_line}\" has been escalated to {team}.\n"
            f"Reason: {reason}\n\n"
            f"A support engineer will follow up with you shortly. You can track progress "
            f"in the SupportPilot dashboard.\n\n"
            f"— SupportPilot"
        )

    elif event_type == "status_update":
        new_status = extra.get("status", "updated")
        subject = f"[SupportPilot] Ticket #{ticket_id} — Status changed to '{new_status}'"
        body = (
            f"Hi,\n\n"
            f"Your ticket \"{subject_line}\" status has changed to: {new_status}.\n\n"
            f"— SupportPilot"
        )

    else:
        subject = f"[SupportPilot] Ticket #{ticket_id} — Update"
        body = f"Hi,\n\nThere's an update on your ticket \"{subject_line}\".\n\n— SupportPilot"

    return subject, body


# ---------------------------------------------------------------------------
# 2. SEND EMAIL (SMTP) — or simulate it, in dry-run mode
# ---------------------------------------------------------------------------
def send_email(to_address: str, subject: str, body: str) -> tuple[bool, str]:
    """
    Returns (success, detail_message). In DRY_RUN mode, no real network call
    is made — this always "succeeds" so the rest of the pipeline (logging,
    triggers) can be fully tested without an SMTP account.
    """
    if DRY_RUN:
        return True, "DRY_RUN: email not actually sent, simulated success."

    if not SMTP_USERNAME or not SMTP_PASSWORD:
        return False, "SMTP credentials not configured (set SMTP_USERNAME / SMTP_PASSWORD env vars)."

    try:
        msg = MIMEText(body, "plain")
        msg["Subject"] = subject
        msg["From"] = FROM_ADDRESS
        msg["To"] = to_address

        context = ssl.create_default_context()
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls(context=context)
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.sendmail(FROM_ADDRESS, [to_address], msg.as_string())
        return True, "Sent successfully."
    except Exception as exc:  # noqa: BLE001 — we want to log any failure, not crash the pipeline
        return False, f"SMTP error: {exc}"


# ---------------------------------------------------------------------------
# 3. AUDIT LOG — append-only outbox history (JSON Lines file)
# ---------------------------------------------------------------------------
def log_delivery(ticket_id: int, to_address: str, event_type: str, subject: str,
                  success: bool, detail: str) -> None:
    entry = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "ticket_id": ticket_id,
        "to": to_address,
        "event_type": event_type,
        "subject": subject,
        "status": "sent" if success else "failed",
        "detail": detail,
        "dry_run": DRY_RUN,
    }
    with open(AUDIT_LOG_PATH, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry) + "\n")
    print(f"[Email Pipeline] {'✅' if success else '❌'} {event_type} email for ticket "
          f"#{ticket_id} -> {to_address} ({'dry-run' if DRY_RUN else 'live'})")


def show_audit_log(limit: int = 20) -> None:
    if not AUDIT_LOG_PATH.exists():
        print("No emails logged yet.")
        return
    lines = AUDIT_LOG_PATH.read_text(encoding="utf-8").strip().splitlines()
    print(f"--- Last {min(limit, len(lines))} of {len(lines)} logged email(s) ---")
    for line in lines[-limit:]:
        entry = json.loads(line)
        print(f"{entry['timestamp']} | ticket #{entry['ticket_id']} | {entry['event_type']:<14} "
              f"| {entry['status']:<6} | to={entry['to']} | {entry['detail']}")


# ---------------------------------------------------------------------------
# 4. MAIN TRIGGER — call this whenever a ticket event happens
# ---------------------------------------------------------------------------
def notify_ticket_event(ticket_id: int, event_type: str, extra: Optional[dict] = None) -> None:
    """
    event_type: "resolved" | "escalated" | "status_update"
    extra: event-specific details, e.g. {"generated_response": "...", "confidence_score": 0.8}
           or {"assigned_team": "Network Ops", "escalation_reason": "..."}
    """
    resp = requests.get(f"{API_BASE_URL}/api/tickets/{ticket_id}", timeout=10)
    resp.raise_for_status()
    ticket = resp.json()

    to_address = ticket.get("requester_email") or ticket.get("email")
    if not to_address:
        log_delivery(ticket_id, "UNKNOWN", event_type, "", False, "No requester email found on ticket.")
        return

    subject, body = build_email_content(event_type, ticket, extra)
    success, detail = send_email(to_address, subject, body)
    log_delivery(ticket_id, to_address, event_type, subject, success, detail)


# ---------------------------------------------------------------------------
# 5. DEMO — mock data, no backend or SMTP account required
# ---------------------------------------------------------------------------
def run_demo() -> None:
    mock_ticket = {
        "ticket_id": 0,
        "subject": "Cannot connect to office VPN",
        "requester_email": "demo.user@example.com",
    }

    print("\n=== Demo 1: Resolution email ===")
    subject, body = build_email_content(
        "resolved", mock_ticket,
        {"generated_response": "1. Switch off personal VPN.\n2. Restart RRAS service.\n3. Reconnect using VPN client v4.2+."},
    )
    success, detail = send_email(mock_ticket["requester_email"], subject, body)
    log_delivery(mock_ticket["ticket_id"], mock_ticket["requester_email"], "resolved", subject, success, detail)
    print(f"Subject: {subject}\n\n{body}")

    print("\n=== Demo 2: Escalation email ===")
    subject, body = build_email_content(
        "escalated", mock_ticket,
        {"assigned_team": "Network Ops", "escalation_reason": "Confidence too low for auto-resolution."},
    )
    success, detail = send_email(mock_ticket["requester_email"], subject, body)
    log_delivery(mock_ticket["ticket_id"], mock_ticket["requester_email"], "escalated", subject, success, detail)
    print(f"Subject: {subject}\n\n{body}")

    print("\n=== Audit log so far ===")
    show_audit_log()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SupportPilot Email Automation Pipeline (Member 4)")
    parser.add_argument("--demo", action="store_true", help="Run with mock data, no backend/SMTP needed")
    parser.add_argument("--ticket-id", type=int, help="Real ticket id to notify about")
    parser.add_argument("--event", choices=["resolved", "escalated", "status_update"],
                         help="Event type to trigger (used with --ticket-id)")
    parser.add_argument("--show-log", action="store_true", help="Print the email audit log")
    args = parser.parse_args()

    if args.demo:
        run_demo()
    elif args.show_log:
        show_audit_log()
    elif args.ticket_id is not None and args.event:
        notify_ticket_event(args.ticket_id, args.event)
    else:
        print("Usage:\n  python notifier.py --demo\n  python notifier.py --ticket-id 1 --event resolved\n"
              "  python notifier.py --show-log")
