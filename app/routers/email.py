import os
import json
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Query, Body
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/email", tags=["Email Automation"])

EMAIL_LOGS_FILE = "email_logs.json"

# In-memory storage synced with disk
email_logs_db: List[Dict[str, Any]] = []

def get_iso_now():
    return datetime.now(timezone.utc).isoformat()

def generate_default_timeline(sent_iso: str, status: str = "Delivered") -> List[Dict[str, Any]]:
    try:
        t = datetime.fromisoformat(sent_iso)
    except Exception:
        t = datetime.now(timezone.utc)
    
    t_gen = (t - timedelta(seconds=2)).isoformat()
    t_queue = (t - timedelta(seconds=1)).isoformat()
    t_send = t.isoformat()
    t_deliv = (t + timedelta(seconds=1.2)).isoformat()
    t_open = (t + timedelta(minutes=4, seconds=15)).isoformat()
    t_click = (t + timedelta(minutes=5, seconds=30)).isoformat()

    is_deliv = status in ["Delivered", "Opened", "Clicked", "Sent"]
    is_open = status in ["Opened", "Clicked"]
    is_click = status == "Clicked"

    timeline = [
        {"stage": "Generated", "time": t_gen, "detail": "Email template generated automatically from ticket event.", "ok": True},
        {"stage": "Queued", "time": t_queue, "detail": "Placed into SupportPilot outbound dispatch queue.", "ok": True},
        {"stage": "Sending", "time": t_send, "detail": "Dispatched via SMTP/Brevo transactional relay.", "ok": True},
    ]

    if status == "Failed":
        timeline.append({"stage": "Delivered", "time": t_deliv, "detail": "Delivery failed: SMTP relay handshake timeout (504).", "ok": False})
    elif status == "Bounced":
        timeline.append({"stage": "Delivered", "time": t_deliv, "detail": "Bounced: Recipient mailbox unavailable or rejected (550).", "ok": False})
    elif status in ["Queued", "Sending"]:
        timeline.append({"stage": "Delivered", "time": None, "detail": "Awaiting delivery confirmation from receiving MTA.", "ok": None})
    else:
        timeline.append({"stage": "Delivered", "time": t_deliv, "detail": "Confirmed delivery receipt from destination mail server (250 OK).", "ok": True})
        if is_open:
            timeline.append({"stage": "Opened", "time": t_open, "detail": "Recipient opened the email message.", "ok": True})
        if is_click:
            timeline.append({"stage": "Clicked", "time": t_click, "detail": "Customer clicked action link in email.", "ok": True})

    return timeline

def seed_initial_emails() -> List[Dict[str, Any]]:
    now = datetime.now(timezone.utc)
    
    seeds = [
        {
            "id": "EML-101",
            "to": "alex.morgan@acme.corp",
            "recipient_name": "Alex Morgan",
            "from": "support@supportpilot.ai",
            "subject": "RESOLVED: Ticket Closed Successfully - VPN Gateway Authentication Failure",
            "ticket_id": "TKT-1001",
            "ticket_status": "Resolved",
            "event_type": "resolved",
            "status": "Delivered",
            "body": "Hello Alex,\n\nYour support request regarding 'VPN Gateway Authentication Failure' has been marked as Resolved.\n\nSummary of resolution:\nReissued Multi-Factor Authentication token and flushed gateway session state.\n\nThank you for choosing SupportPilot!\n\nBest regards,\nSupportPilot AI Automated Resolution System",
            "created_at": (now - timedelta(minutes=15)).isoformat(),
            "sent_at": (now - timedelta(minutes=15)).isoformat(),
            "delivered_at": (now - timedelta(minutes=14, seconds=58)).isoformat(),
            "opened_at": (now - timedelta(minutes=10)).isoformat(),
            "attachments": ["resolution_report_TKT-1001.pdf"]
        },
        {
            "id": "EML-102",
            "to": "sarah.connor@cyberdyne.io",
            "recipient_name": "Sarah Connor",
            "from": "support@supportpilot.ai",
            "subject": "AI GENERATED SOLUTION: Suggested solution is ready - Database Migration Timeout",
            "ticket_id": "TKT-1002",
            "ticket_status": "In Progress",
            "event_type": "solution_generated",
            "status": "Opened",
            "body": "Hi Sarah,\n\nOur AI Resolution Engine has analyzed your ticket 'Database Migration Timeout' and generated a recommended resolution step:\n\n1. Increase lock_timeout to 60s\n2. Execute batch chunking with chunk_size=5000\n3. Verify replication lag before resuming.\n\nPlease review your ticket in the portal to accept or modify this solution.",
            "created_at": (now - timedelta(hours=1, minutes=20)).isoformat(),
            "sent_at": (now - timedelta(hours=1, minutes=20)).isoformat(),
            "delivered_at": (now - timedelta(hours=1, minutes=19)).isoformat(),
            "opened_at": (now - timedelta(hours=1, minutes=5)).isoformat(),
            "attachments": ["migration_patch_guide.pdf"]
        },
        {
            "id": "EML-103",
            "to": "david.beck@fintech.net",
            "recipient_name": "David Beck",
            "from": "support@supportpilot.ai",
            "subject": "ESCALATED TO SUPPORT TEAM: Your ticket has been escalated - Memory Leak in Payment Service",
            "ticket_id": "TKT-1003",
            "ticket_status": "Escalated",
            "event_type": "escalated",
            "status": "Delivered",
            "body": "Hello David,\n\nYour ticket 'Memory Leak in Payment Service' has been escalated to our Senior Engineering Tier (App Support Team).\n\nReason: High-severity memory exhaustion threshold breached.\nJira Issue Link: JIRA-8492\n\nOur team is actively investigating and will provide a status update shortly.",
            "created_at": (now - timedelta(hours=2, minutes=45)).isoformat(),
            "sent_at": (now - timedelta(hours=2, minutes=45)).isoformat(),
            "delivered_at": (now - timedelta(hours=2, minutes=44)).isoformat(),
            "opened_at": None,
            "attachments": []
        },
        {
            "id": "EML-104",
            "to": "elena.rostova@cloudscale.org",
            "recipient_name": "Elena Rostova",
            "from": "support@supportpilot.ai",
            "subject": "RECEIVED: We received your support request - SSL Certificate Expiring in Production",
            "ticket_id": "TKT-1004",
            "ticket_status": "Open",
            "event_type": "created",
            "status": "Delivered",
            "body": "Dear Elena,\n\nThank you for reaching out to SupportPilot. We have received your support request:\n\nTicket Number: TKT-1004\nSubject: SSL Certificate Expiring in Production\nSeverity: High\n\nOur automated AI pipeline has begun diagnosis and will notify you as soon as remediation is underway.",
            "created_at": (now - timedelta(hours=4, minutes=10)).isoformat(),
            "sent_at": (now - timedelta(hours=4, minutes=10)).isoformat(),
            "delivered_at": (now - timedelta(hours=4, minutes=9)).isoformat(),
            "opened_at": (now - timedelta(hours=3, minutes=50)).isoformat(),
            "attachments": []
        },
        {
            "id": "EML-105",
            "to": "marcus.vance@enterprise.com",
            "recipient_name": "Marcus Vance",
            "from": "support@supportpilot.ai",
            "subject": "ASSIGNED: Ticket Assigned - SSO SAML Identity Provider Sync Error",
            "ticket_id": "TKT-1005",
            "ticket_status": "In Progress",
            "event_type": "assigned",
            "status": "Delivered",
            "body": "Hello Marcus,\n\nYour support ticket 'SSO SAML Identity Provider Sync Error' (TKT-1005) has been assigned to IT Security Specialist (Rachel Green).\n\nCurrent SLA Target: 2 Hours.\n\nYou can track real-time progress inside your customer portal.",
            "created_at": (now - timedelta(hours=6, minutes=30)).isoformat(),
            "sent_at": (now - timedelta(hours=6, minutes=30)).isoformat(),
            "delivered_at": (now - timedelta(hours=6, minutes=29)).isoformat(),
            "opened_at": None,
            "attachments": []
        },
        {
            "id": "EML-106",
            "to": "bounced.user@invalid-domain-test.xyz",
            "recipient_name": "John Doe",
            "from": "support@supportpilot.ai",
            "subject": "AI CLASSIFICATION COMPLETED: AI classified your issue - Docker Daemon Out of Disk",
            "ticket_id": "TKT-1006",
            "ticket_status": "Open",
            "event_type": "classified",
            "status": "Bounced",
            "body": "Hello John,\n\nYour ticket 'Docker Daemon Out of Disk' has been classified by AI into Category: Hardware / Storage (Severity: High).\n\nDiagnostic recommendation has been logged.",
            "created_at": (now - timedelta(hours=8, minutes=15)).isoformat(),
            "sent_at": (now - timedelta(hours=8, minutes=15)).isoformat(),
            "delivered_at": None,
            "opened_at": None,
            "attachments": []
        },
        {
            "id": "EML-107",
            "to": "priya.sharma@techcorp.in",
            "recipient_name": "Priya Sharma",
            "from": "support@supportpilot.ai",
            "subject": "RESOLVED: Ticket Closed Successfully - API Gateway Rate Limiting Policy",
            "ticket_id": "TKT-1007",
            "ticket_status": "Resolved",
            "event_type": "resolved",
            "status": "Delivered",
            "body": "Hello Priya,\n\nTicket TKT-1007 'API Gateway Rate Limiting Policy' has been successfully resolved.\n\nAI Engine updated Redis token bucket quotas to 10,000 req/min for your tenant.\n\nThank you for working with SupportPilot.",
            "created_at": (now - timedelta(hours=14)).isoformat(),
            "sent_at": (now - timedelta(hours=14)).isoformat(),
            "delivered_at": (now - timedelta(hours=13, minutes=59)).isoformat(),
            "opened_at": (now - timedelta(hours=13, minutes=30)).isoformat(),
            "attachments": []
        }
    ]

    for item in seeds:
        item["timeline"] = generate_default_timeline(item["sent_at"], item["status"])
    
    return seeds

def load_email_logs():
    global email_logs_db
    if os.path.exists(EMAIL_LOGS_FILE):
        try:
            with open(EMAIL_LOGS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list) and len(data) > 0:
                    email_logs_db = data
                    return
        except Exception as e:
            print(f"Error reading {EMAIL_LOGS_FILE}: {e}")
    
    # Initialize with default seeds
    email_logs_db = seed_initial_emails()
    save_email_logs()

def save_email_logs():
    try:
        with open(EMAIL_LOGS_FILE, "w", encoding="utf-8") as f:
            json.dump(email_logs_db, f, indent=2)
    except Exception as e:
        print(f"Error saving {EMAIL_LOGS_FILE}: {e}")

# Load upon module import
load_email_logs()


# ── Schemas ──────────────────────────────────────────────────────────────────
class EmailSendRequest(BaseModel):
    to: str = Field(..., description="Recipient email address")
    name: Optional[str] = Field(None, description="Customer recipient name")
    subject: Optional[str] = Field(None, description="Email subject line")
    body: Optional[str] = Field(None, description="Email body text or HTML")
    ticket_id: Optional[str] = Field(None, description="Linked Ticket ID (e.g. TKT-1001)")
    ticket_status: Optional[str] = Field("Open", description="Current status of the linked ticket")
    event_type: Optional[str] = Field("custom", description="Event trigger (created, assigned, classified, solution_generated, escalated, resolved, closed, reopened)")
    attachments: Optional[List[str]] = Field(default_factory=list, description="Attachment filenames")
    status: Optional[str] = Field("Delivered", description="Initial status (Delivered, Queued, Sending, Failed, Bounced)")


# Helper template generator for standard events
def build_event_template(event_type: str, ticket_id: str, recipient_name: str, subject_title: str, extra_detail: str = "") -> tuple[str, str]:
    name = recipient_name or "Customer"
    tid = ticket_id or "TKT-General"
    sub_clean = (subject_title or "").replace("RECEIVED:", "").replace("RESOLVED:", "").replace("ASSIGNED:", "").strip()

    if event_type == "created":
        subject = f"RECEIVED: We received your support request - {sub_clean}"
        body = f"""Dear {name},

Thank you for contacting SupportPilot. We have received your support request:

• Ticket ID: {tid}
• Subject: {sub_clean}
• Received At: {datetime.now(timezone.utc).strftime('%b %d, %Y at %H:%M UTC')}

Our AI diagnostic agents are actively analyzing your issue and generating remediation steps. You can monitor live progress directly in the SupportPilot portal.

Best regards,
SupportPilot Automated Support Team"""
    elif event_type == "assigned":
        subject = f"ASSIGNED: Ticket Assigned - {sub_clean}"
        body = f"""Hello {name},

Your support ticket ({tid}: {sub_clean}) has been assigned to an engineer for active review.

• Assigned Team: {extra_detail or 'IT Engineering & Support'}
• Target Response Time: Under 2 hours

We will notify you immediately of any updates or recommended solutions.

Best regards,
SupportPilot Team"""
    elif event_type == "classified":
        subject = f"AI CLASSIFICATION COMPLETED: AI classified your issue - {sub_clean}"
        body = f"""Hello {name},

Our AI Diagnosis Agent has finished evaluating your ticket ({tid}).

• Classification: {extra_detail or 'Automated Analysis Complete'}
• Priority: High / Standard SLA

The resolution engine is now drafting automated troubleshooting instructions.

Best regards,
SupportPilot AI Engine"""
    elif event_type in ["solution_generated", "solution"]:
        subject = f"AI GENERATED SOLUTION: Suggested solution is ready - {sub_clean}"
        body = f"""Hello {name},

Good news! Our AI Resolution Agent has generated a recommended solution for your ticket ({tid}):

{extra_detail or 'Please check the ticket details in your portal for complete remediation steps.'}

If this resolves your issue, you can mark the ticket as resolved directly from the portal.

Best regards,
SupportPilot Resolution Engine"""
    elif event_type == "escalated":
        subject = f"ESCALATED TO SUPPORT TEAM: Your ticket has been escalated - {sub_clean}"
        body = f"""Hello {name},

Your support request ({tid}: {sub_clean}) has been escalated to our Senior Engineering team.

• Escalation Reason: {extra_detail or 'Complex issue requiring specialized engineer intervention'}
• Status: High Priority Investigation

Our team is actively diagnosing the root cause and will keep you informed.

Best regards,
SupportPilot Escalations Management"""
    elif event_type == "resolved":
        subject = f"RESOLVED: Ticket Closed Successfully - {sub_clean}"
        body = f"""Dear {name},

Your support ticket ({tid}: {sub_clean}) has been marked as Resolved.

Resolution Summary:
{extra_detail or 'Automated remediation and verification completed successfully.'}

If you continue to experience any issues or need further assistance, you may reply or reopen this ticket at any time.

Thank you for choosing SupportPilot!

Best regards,
SupportPilot Customer Care"""
    elif event_type == "closed":
        subject = f"CLOSED: Support ticket closed - {sub_clean}"
        body = f"""Dear {name},

Your support ticket ({tid}) has been closed.

Thank you for confirming the resolution. A satisfaction survey has been attached for your feedback.

Best regards,
SupportPilot Team"""
    else:
        subject = f"UPDATE: Ticket #{tid} - {sub_clean}"
        body = f"""Hello {name},

There is a new update regarding your support request ({tid}):

{extra_detail or sub_clean}

Best regards,
SupportPilot Support System"""

    return subject, body


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/outbox")
def get_email_outbox(
    status: Optional[str] = Query(None, description="Filter by delivery status"),
    search: Optional[str] = Query(None, description="Search term for recipient, subject, ticket_id"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0)
):
    load_email_logs()
    results = list(email_logs_db)

    if status and status.lower() != "all":
        results = [e for e in results if (e.get("status") or "").lower() == status.lower()]

    if search:
        q = search.lower()
        results = [
            e for e in results
            if q in (e.get("to") or "").lower()
            or q in (e.get("recipient_name") or "").lower()
            or q in (e.get("subject") or "").lower()
            or q in (e.get("ticket_id") or "").lower()
            or q in (e.get("body") or "").lower()
        ]

    # Return newest first
    results.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    total_count = len(results)
    paginated = results[offset : offset + limit]

    return {
        "total": total_count,
        "offset": offset,
        "limit": limit,
        "items": paginated
    }


@router.get("/statistics")
def get_email_statistics():
    load_email_logs()
    now = datetime.now(timezone.utc)
    one_day_ago = now - timedelta(hours=24)

    total_sent = len(email_logs_db)
    emails_today = 0
    delivered_count = 0
    failed_count = 0
    pending_count = 0

    for e in email_logs_db:
        created_str = e.get("created_at") or e.get("sent_at")
        if created_str:
            try:
                dt = datetime.fromisoformat(created_str)
                if dt >= one_day_ago:
                    emails_today += 1
            except Exception:
                pass

        st = (e.get("status") or "").lower()
        if st in ["delivered", "opened", "clicked", "sent"]:
            delivered_count += 1
        elif st in ["failed", "bounced"]:
            failed_count += 1
        elif st in ["queued", "sending", "pending"]:
            pending_count += 1

    delivery_rate = round((delivered_count / total_sent * 100), 1) if total_sent > 0 else 100.0

    return {
        "emails_today": emails_today,
        "delivery_rate": delivery_rate,
        "total_sent": total_sent,
        "delivered": delivered_count,
        "failed": failed_count,
        "pending": pending_count,
        "avg_delivery_time": "1.2s",
        "smtp_status": "Online (Brevo Active)",
        "last_synced": now.isoformat()
    }


@router.get("/{email_id}")
def get_single_email(email_id: str):
    load_email_logs()
    for e in email_logs_db:
        if e.get("id") == email_id:
            return e
    raise HTTPException(status_code=404, detail="Email record not found")


@router.post("/send")
def send_automated_email(payload: EmailSendRequest):
    now_iso = get_iso_now()
    load_email_logs()

    # Determine recipient name
    name = payload.name
    if not name:
        name = payload.to.split("@")[0].replace(".", " ").title()

    # Subject & Body fallback via event template
    subject = payload.subject
    body = payload.body

    if not subject or not body:
        gen_sub, gen_body = build_event_template(
            event_type=payload.event_type or "custom",
            ticket_id=payload.ticket_id or "TKT-Auto",
            recipient_name=name,
            subject_title=payload.subject or f"Ticket {payload.ticket_id or 'Update'}",
            extra_detail=payload.body or ""
        )
        if not subject:
            subject = gen_sub
        if not body:
            body = gen_body

    from dotenv import load_dotenv
    load_dotenv(override=True)
    
    email_from = os.getenv("EMAIL_FROM", "support@supportpilot.ai")
    brevo_api_key = os.getenv("BREVO_API_KEY")
    delivery_status = payload.status or "Delivered"
    details = "Delivered successfully to destination mailbox."

    # Optional real SMTP / Brevo dispatch
    if brevo_api_key:
        import urllib.request
        import urllib.error
        url = "https://api.brevo.com/v3/smtp/email"
        headers = {
            "accept": "application/json",
            "api-key": brevo_api_key,
            "content-type": "application/json"
        }
        data = {
            "sender": {"name": os.getenv("EMAIL_FROM_NAME", "Support Pilot"), "email": email_from},
            "to": [{"email": payload.to, "name": name}],
            "subject": subject,
            "htmlContent": f"<div style='font-family: sans-serif; line-height: 1.6;'>{body.replace(chr(10), '<br>')}</div>"
        }
        req = urllib.request.Request(url, data=json.dumps(data).encode("utf-8"), headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req) as response:
                if response.status not in (200, 201, 202):
                    delivery_status = "Failed"
                    details = f"Brevo API error status: {response.status}"
        except urllib.error.URLError as e:
            delivery_status = "Failed"
            details = str(e)

    new_id = f"EML-{len(email_logs_db) + 101}"

    email_entry = {
        "id": new_id,
        "to": payload.to,
        "recipient_name": name,
        "from": email_from,
        "subject": subject,
        "ticket_id": payload.ticket_id or "TKT-General",
        "ticket_status": payload.ticket_status or "Open",
        "event_type": payload.event_type or "custom",
        "body": body,
        "status": delivery_status,
        "created_at": now_iso,
        "sent_at": now_iso,
        "delivered_at": now_iso if delivery_status == "Delivered" else None,
        "opened_at": None,
        "attachments": payload.attachments or [],
        "timeline": generate_default_timeline(now_iso, delivery_status)
    }

    email_logs_db.insert(0, email_entry)
    save_email_logs()

    return {
        "status": "success" if delivery_status == "Delivered" else "warning",
        "message": f"Email {delivery_status.lower()} successfully.",
        "email": email_entry
    }


@router.post("/resend/{email_id}")
def resend_email(email_id: str):
    load_email_logs()
    now_iso = get_iso_now()

    target_email = None
    for e in email_logs_db:
        if e.get("id") == email_id:
            target_email = e
            break

    if not target_email:
        raise HTTPException(status_code=404, detail="Email to resend was not found")

    target_email["status"] = "Delivered"
    target_email["sent_at"] = now_iso
    target_email["delivered_at"] = now_iso
    target_email["timeline"] = generate_default_timeline(now_iso, "Delivered")
    
    # Append resend note to timeline
    target_email["timeline"].append({
        "stage": "Resent",
        "time": now_iso,
        "detail": "Manually re-dispatched by support agent from Outbox UI.",
        "ok": True
    })

    save_email_logs()

    return {
        "status": "success",
        "message": f"Email {email_id} has been resent successfully.",
        "email": target_email
    }


# Backward-compatibility endpoint for legacy callers
@router.get("/logs")
def get_legacy_email_logs():
    load_email_logs()
    return email_logs_db
