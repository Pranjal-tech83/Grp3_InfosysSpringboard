"""
SupportPilot Backend — FastAPI entrypoint.

Run locally with:
    uvicorn app.main:app --reload

Then open http://127.0.0.1:8000/docs for interactive Swagger UI that the
frontend team can use to see every endpoint and try requests live.
"""

from datetime import datetime, timezone
from dotenv import load_dotenv
load_dotenv()

from typing import List, Dict, Any
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
import os
from pydantic import BaseModel
from fastapi.staticfiles import StaticFiles

from . import models, database, crud
from .database import engine, SessionLocal
from .security.security_gateway import require_role
from .security.rbac import Role
from .routers import (
    users,
    tickets,
    knowledge_base,
    responses,
    escalations,
    jira_tickets,
    analytics,
    email,
    triage_router,
    employee_auth,
    admin_auth,
    employee_dashboard,
    employee_tickets,
    employee_ai,
    employee_profile,
)

# Creates all tables that don't exist yet. Safe to call on every startup.
models.Base.metadata.create_all(bind=engine)

# Safely check and add any extended columns to existing SQLite DB
try:
    with SessionLocal() as init_db:
        crud.ensure_user_schema_columns(init_db)
        crud.get_or_create_authenticated_user(init_db)
        crud.triage_all_unclassified_tickets(init_db)
except Exception as e:
    print(f"[Init Warning] {e}")

# Ensure upload directory exists
os.makedirs("uploads/profiles", exist_ok=True)

app = FastAPI(
    title="SupportPilot API",
    description="Backend API for the SupportPilot AI Ticket Resolution Agent.",
    version="1.0.0",
)

# CORS: browsers block allow_origins=["*"] when allow_credentials=True.
# List every frontend origin explicitly instead.
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5500",   # Live Server / VS Code
    "http://localhost:5500",
    # ⬇️  Replace this with your actual Vercel deployment URL
    "https://grp3-infosys-springboard.vercel.app",
    "https://grp3-infosysspringboard.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

admin_deps = [Depends(require_role(Role.ADMIN))]

app.include_router(users.router, dependencies=admin_deps)
app.include_router(tickets.router, dependencies=admin_deps)
app.include_router(knowledge_base.router, dependencies=admin_deps)
app.include_router(responses.router, dependencies=admin_deps)
app.include_router(escalations.router, dependencies=admin_deps)
app.include_router(jira_tickets.router, dependencies=admin_deps)
app.include_router(analytics.router, dependencies=admin_deps)
app.include_router(analytics.dashboard_router, dependencies=admin_deps)
app.include_router(email.router, dependencies=admin_deps)
app.include_router(triage_router.router, dependencies=admin_deps)
app.include_router(employee_auth.router)
app.include_router(admin_auth.router)
app.include_router(employee_dashboard.router)
app.include_router(employee_tickets.router)
app.include_router(employee_ai.router)
app.include_router(employee_profile.router)


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
