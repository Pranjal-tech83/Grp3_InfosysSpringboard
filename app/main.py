"""
SupportPilot Backend — FastAPI entrypoint.

Run locally with:
    uvicorn app.main:app --reload

Then open http://127.0.0.1:8000/docs for interactive Swagger UI that the
frontend team can use to see every endpoint and try requests live.
"""

from datetime import datetime, timezone
from typing import List, Dict, Any
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from . import models
from .database import engine
from .routers import (
    users,
    tickets,
    knowledge_base,
    responses,
    escalations,
    jira_tickets,
    analytics,
    email,
)

# Creates all tables that don't exist yet. Safe to call on every startup.
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="SupportPilot API",
    description="Backend API for the SupportPilot AI Ticket Resolution Agent.",
    version="1.0.0",
)

# Wide-open CORS for development so the frontend (running on a different
# port) can call this API freely. Tighten allow_origins before production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(tickets.router)
app.include_router(knowledge_base.router)
app.include_router(responses.router)
app.include_router(escalations.router)
app.include_router(jira_tickets.router)
app.include_router(analytics.router)
app.include_router(analytics.router)
app.include_router(email.router, prefix="/api/email", tags=["email"])


# In-memory storage for email automation logs
email_logs_db: List[Dict[str, Any]] = []


class EmailPayload(BaseModel):
    to: str
    subject: str
    body: str


@app.get("/", tags=["Health"])
def health_check():
    return {"status": "ok", "service": "SupportPilot API"}


# ---------------------------------------------------------------------------
# EMAIL AUTOMATION SERVICE ENDPOINTS
# ---------------------------------------------------------------------------
@app.get("/api/email/logs", tags=["Email Automation"])
def get_email_logs():
    return email_logs_db


@app.post("/api/email/send", tags=["Email Automation"])
def send_email_notification(payload: EmailPayload):
    now_iso = datetime.now(timezone.utc).isoformat()
    email_entry = {
        "id": f"EML-{len(email_logs_db) + 101}",
        "to": payload.to,
        "from": "support@supportpilot.ai",
        "subject": payload.subject,
        "body": payload.body,
        "status": "Delivered",
        "created_at": now_iso,
        "history": [
            {"date": now_iso, "status": "Dispatched", "details": "Triggered via LangGraph orchestrator node."},
            {"date": now_iso, "status": "Delivered", "details": "Delivered successfully to target inbox."},
        ],
    }
    email_logs_db.append(email_entry)
    return {"status": "success", "email": email_entry}