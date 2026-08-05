"""
SupportPilot Backend — FastAPI entrypoint.

Run locally with:
    uvicorn app.main:app --reload

Then open http://127.0.0.1:8000/docs for interactive Swagger UI that the
frontend team can use to see every endpoint and try requests live.
"""

from datetime import datetime, timezone
from typing import List, Dict, Any
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
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
app.include_router(analytics.dashboard_router)
app.include_router(email.router)


# ---------------------------------------------------------------------------
# WEBSOCKET REAL-TIME BROADCAST MANAGER FOR DASHBOARD
# ---------------------------------------------------------------------------
class DashboardConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                self.disconnect(connection)

ws_manager = DashboardConnectionManager()


@app.websocket("/ws/dashboard")
async def websocket_dashboard_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        await websocket.send_json({"type": "connected", "message": "SupportPilot Real-time Dashboard Connected"})
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_json({"type": "pong", "timestamp": datetime.now(timezone.utc).isoformat()})
            elif data == "refresh":
                await ws_manager.broadcast({"type": "ticketsUpdated", "timestamp": datetime.now(timezone.utc).isoformat()})
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)


# In-memory storage for email automation logs
email_logs_db: List[Dict[str, Any]] = []


class EmailPayload(BaseModel):
    to: str
    subject: str
    body: str


@app.get("/", tags=["Health"])
def health_check():
    return {"status": "ok", "service": "SupportPilot API"}

