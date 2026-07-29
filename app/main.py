"""
SupportPilot Backend — FastAPI entrypoint.

Run locally with:
    uvicorn app.main:app --reload

Then open http://127.0.0.1:8000/docs for interactive Swagger UI that the
frontend team can use to see every endpoint and try requests live.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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


@app.get("/", tags=["Health"])
def health_check():
    return {"status": "ok", "service": "SupportPilot API"}
