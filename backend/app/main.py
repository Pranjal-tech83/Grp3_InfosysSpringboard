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
from fastapi.responses import JSONResponse
import traceback

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
        # Auto-seed default admin and employee accounts if they don't exist
        _seed_accounts = [
            {"name": "Pranjal", "email": "theman838303@gmail.com", "password": "Pranjal@", "role": "ADMIN"},
            {"name": "Roman", "email": "roman838303@gmail.com", "password": "Pranjal@", "role": "EMPLOYEE"},
        ]
        from app.security.authorization import get_password_hash as _hash_pw
        for _acc in _seed_accounts:
            _existing = crud.get_user_by_email(init_db, _acc["email"])
            if not _existing:
                _user = models.User(
                    name=_acc["name"],
                    email=_acc["email"],
                    role=_acc["role"],
                    password_hash=_hash_pw(_acc["password"]),
                    email_verified=True,
                )
                init_db.add(_user)
                print(f"[Startup] Seeded default account: {_acc['email']}")
        init_db.commit()
except Exception as e:
    print(f"[Init Warning] {e}")

# Ensure upload directory exists
os.makedirs("uploads/profiles", exist_ok=True)

app = FastAPI(
    title="SupportPilot API",
    description="Backend API for the SupportPilot AI Ticket Resolution Agent.",
    version="1.0.0",
)

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "traceback": traceback.format_exc()}
    )

# CORS: browsers block allow_origins=["*"] when allow_credentials=True.
# List every frontend origin explicitly instead.
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5500",   # Live Server / VS Code
    "http://localhost:5500",
    # Vercel production & all preview deployment URLs
    "https://grp3-infosys-springboard.vercel.app",
    "https://grp3-infosysspringboard.vercel.app",
    "https://grp3-infosys-springboard-gpuijfc7l-sssnehsinghs-projects.vercel.app",
    "https://grp3-infosysspringboard.onrender.com",
    "null",  # Allows local files opened via file:// protocol in the browser
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"^https://grp3-infosys.*\.vercel\.app$",
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


# Serve the static frontend directly from the backend for easy local testing
if os.path.exists("../frontend"):
    app.mount("/frontend", StaticFiles(directory="../frontend", html=True), name="frontend")
elif os.path.exists("frontend"):
    app.mount("/frontend", StaticFiles(directory="frontend", html=True), name="frontend")
