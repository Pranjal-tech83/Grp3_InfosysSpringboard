import json
import os
import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/email", tags=["Email Automation Outbox"])

EMAIL_LOGS_PATH = "email_logs.json"

# ---------------------------------------------------------------------------
# Brevo REST API integration (uses httpx — already installed as brevo-python dep)
# ---------------------------------------------------------------------------
def _send_via_brevo(to: str, subject: str, body: str, recipient_name: str = "") -> dict:
    """
    Sends a transactional email via the Brevo REST API (v3).
    Returns a dict: { success: bool, message_id: str|None, error: str|None }
    """
    api_key = os.getenv("BREVO_API_KEY", "")
    from_email = os.getenv("EMAIL_FROM", "noreply@supportpilot.ai")
    from_name = os.getenv("EMAIL_FROM_NAME", "Support Pilot")

    if not api_key:
        return {"success": False, "message_id": None, "error": "BREVO_API_KEY is not set in environment."}

    try:
        import httpx

        payload = {
            "to": [{"email": to, "name": recipient_name or to.split("@")[0]}],
            "sender": {"name": from_name, "email": from_email},
            "subject": subject,
            "htmlContent": (
                "<html><body>"
                "<div style='font-family:sans-serif;max-width:600px;margin:auto'>"
                f"<pre style='white-space:pre-wrap;font-family:inherit'>{body}</pre>"
                "</div></body></html>"
            ),
            "textContent": body,
        }

        resp = httpx.post(
            "https://api.brevo.com/v3/smtp/email",
            headers={"api-key": api_key, "Content-Type": "application/json"},
            json=payload,
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        return {"success": True, "message_id": data.get("messageId", "sent"), "error": None}

    except Exception as e:
        err = str(e)
        try:
            err = f"{e} | Response: {e.response.text}"  # type: ignore
        except Exception:
            pass
        return {"success": False, "message_id": None, "error": err}


# ---------------------------------------------------------------------------
# Payload models
# ---------------------------------------------------------------------------
class EmailPayload(BaseModel):
    to: str = ""
    subject: str = ""
    body: str = ""
    ticket_id: Optional[str] = None
    event_type: Optional[str] = None
    recipient_name: Optional[str] = None


class EmailSendRequest(BaseModel):
    """Used internally by ticket routers to push emails into the outbox."""
    to: str = ""
    name: str = ""
    subject: str = ""
    body: str = ""
    ticket_id: Optional[str] = None
    ticket_status: Optional[str] = None
    event_type: Optional[str] = "ticket_created"


# ---------------------------------------------------------------------------
# Log persistence helpers
# ---------------------------------------------------------------------------
def load_email_logs() -> List[Dict[str, Any]]:
    if os.path.exists(EMAIL_LOGS_PATH):
        try:
            with open(EMAIL_LOGS_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except json.JSONDecodeError:
            return []
    return []


def save_email_logs(logs: List[Dict[str, Any]]):
    with open(EMAIL_LOGS_PATH, "w", encoding="utf-8") as f:
        json.dump(logs, f, indent=2)


# ---------------------------------------------------------------------------
# Internal helper — called by tickets.py & employee_tickets.py
# ---------------------------------------------------------------------------
def send_automated_email(req: EmailSendRequest) -> dict:
    """
    Called internally (not via HTTP) by ticket routers whenever a ticket is
    created or its status changes. Logs the email to the outbox JSON file
    AND dispatches it via Brevo.
    """
    logs = load_email_logs()
    now_iso = datetime.now(timezone.utc).isoformat()
    new_id = f"EML-{uuid.uuid4().hex[:6].upper()}"

    from_email = os.getenv("EMAIL_FROM", "noreply@supportpilot.ai")
    from_name = os.getenv("EMAIL_FROM_NAME", "Support Pilot")

    # Send via Brevo
    result = _send_via_brevo(
        to=req.to,
        subject=req.subject,
        body=req.body,
        recipient_name=req.name,
    )

    status = "Delivered" if result["success"] else "Failed"
    error_msg = result.get("error")

    timeline = [
        {"stage": "Generated", "time": now_iso, "detail": f"Automated email triggered by ticket event: {req.event_type}."},
        {"stage": "Routed",    "time": now_iso, "detail": "Brevo transactional email API called."},
    ]
    if result["success"]:
        timeline.append({
            "stage": "Delivered",
            "time": now_iso,
            "detail": f"Accepted by Brevo. Message ID: {result.get('message_id', 'N/A')}",
        })
    else:
        timeline.append({
            "stage": "Failed",
            "time": now_iso,
            "detail": f"Delivery failed: {error_msg}",
        })

    new_email = {
        "id": new_id,
        "to": req.to or "unknown@example.com",
        "recipient_name": req.name or (req.to.split("@")[0] if req.to else "Unknown"),
        "from": f"{from_name} <{from_email}>",
        "subject": req.subject or "Notification from SupportPilot",
        "ticket_id": req.ticket_id or "N/A",
        "ticket_status": req.ticket_status or "open",
        "event_type": req.event_type or "ticket_created",
        "body": req.body or "",
        "status": status,
        "brevo_message_id": result.get("message_id"),
        "error": error_msg,
        "created_at": now_iso,
        "sent_at": now_iso if result["success"] else None,
        "delivered_at": now_iso if result["success"] else None,
        "opened_at": None,
        "attachments": [],
        "timeline": timeline,
    }

    logs.append(new_email)
    save_email_logs(logs)
    print(f"[Email Outbox] {status} → {req.to} | {req.subject} | Brevo: {result.get('message_id') or error_msg}")
    return new_email


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@router.get("/outbox")
def get_outbox():
    logs = load_email_logs()
    logs.sort(key=lambda x: x.get("created_at", "") or "", reverse=True)
    return {"items": logs}


@router.get("/logs")
def get_logs():
    return get_outbox()


@router.get("/statistics")
def get_statistics():
    logs = load_email_logs()
    total_sent = len(logs)
    failed = sum(1 for log in logs if log.get("status", "").lower() in ["failed", "bounced"])

    today_str = datetime.now(timezone.utc).isoformat()[:10]
    emails_today = sum(
        1 for log in logs
        if log.get("created_at", "") and log.get("created_at", "").startswith(today_str)
    )

    delivered = sum(1 for log in logs if log.get("status", "").lower() in ["delivered", "sent"])
    delivery_rate = 100 if total_sent == 0 else round((delivered / total_sent) * 100)

    return {
        "emails_today": emails_today,
        "delivery_rate": delivery_rate,
        "total_sent": total_sent,
        "failed": failed,
    }


@router.post("/send")
def send_email(payload: EmailPayload):
    """Manual send endpoint (admin-triggered from UI)."""
    req = EmailSendRequest(
        to=payload.to,
        name=payload.recipient_name or "",
        subject=payload.subject,
        body=payload.body,
        ticket_id=payload.ticket_id,
        ticket_status="open",
        event_type=payload.event_type or "manual_send",
    )
    new_email = send_automated_email(req)
    status_str = "success" if new_email["status"] == "Delivered" else "failed"
    return {"status": status_str, "message": f"Email {new_email['status'].lower()} via Brevo", "email": new_email}



@router.post("/resend/{email_id}")
def resend_email(email_id: str):
    logs = load_email_logs()

    for email in logs:
        if email.get("id") == email_id:
            now_iso = datetime.now(timezone.utc).isoformat()

            # Re-send via Brevo
            result = _send_via_brevo(
                to=email.get("to", ""),
                subject=email.get("subject", ""),
                body=email.get("body", ""),
                recipient_name=email.get("recipient_name", ""),
            )

            email["status"] = "Delivered" if result["success"] else "Failed"
            email["sent_at"] = now_iso
            if result["success"]:
                email["delivered_at"] = now_iso
            email["brevo_message_id"] = result.get("message_id")
            email["error"] = result.get("error")

            if not isinstance(email.get("timeline"), list):
                email["timeline"] = []
            email["timeline"].append({
                "stage": "Resent" if result["success"] else "Resend Failed",
                "time": now_iso,
                "detail": (
                    f"Re-dispatched via Brevo. Message ID: {result.get('message_id', 'N/A')}"
                    if result["success"]
                    else f"Resend failed: {result.get('error')}"
                ),
            })

            save_email_logs(logs)
            return {
                "status": "success" if result["success"] else "failed",
                "message": f"Email {email_id} {'resent' if result['success'] else 'resend failed'}.",
                "brevo_result": result,
            }

    raise HTTPException(status_code=404, detail="Email not found")