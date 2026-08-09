"""
Pydantic schemas — define the shape of API requests/responses.
Kept separate from SQLAlchemy models (models.py) so the DB layer and the
API contract can evolve independently.
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, ConfigDict


# ---------- Users ----------

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    department: Optional[str] = None
    role: str = "Support Agent"
    phone: Optional[str] = None
    bio: Optional[str] = None
    profile_image: Optional[str] = None
    email_verified: bool = True


class UserUpdate(BaseModel):
    name: Optional[str] = None
    department: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    role: Optional[str] = None


class ChangeEmailRequest(BaseModel):
    new_email: EmailStr
    confirm_email: EmailStr


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: int
    id: Optional[int] = None
    name: str
    email: EmailStr
    department: Optional[str] = None
    role: str
    phone: Optional[str] = None
    bio: Optional[str] = None
    profile_image: Optional[str] = None
    profileImage: Optional[str] = None
    email_verified: bool = True
    emailVerified: bool = True
    created_at: Optional[datetime] = None


# ---------- Tickets ----------

class TicketCreate(BaseModel):
    """What the frontend/service-desk/email-intake sends when a new ticket comes in."""
    subject: str
    description: str
    requester_email: EmailStr
    requester_name: Optional[str] = None
    department: Optional[str] = None


class TicketClassificationUpdate(BaseModel):
    """What the AI Agent module PATCHes in once it has classified a ticket."""
    category: Optional[str] = None
    sub_category: Optional[str] = None
    priority: Optional[str] = None
    severity: Optional[str] = None
    classification_confidence: Optional[float] = None
    status: Optional[str] = None


class TicketStatusUpdate(BaseModel):
    status: str
    performed_by: Optional[str] = "Operator"


class TicketUpdate(BaseModel):
    subject: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = None
    performed_by: Optional[str] = "Operator"


class TicketOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    ticket_id: int
    ticket_ref: str
    user_id: int
    user: Optional["UserOut"] = None
    subject: str
    description: str
    category: Optional[str]
    sub_category: Optional[str]
    priority: Optional[str]
    severity: Optional[str]
    classification_confidence: Optional[float]
    status: str
    created_at: datetime
    updated_at: datetime


class TicketDetailOut(TicketOut):
    """Ticket plus its related records, for a single-ticket detail view."""
    responses: List["TicketResponseOut"] = []
    escalations: List["EscalationOut"] = []
    jira_ticket: Optional["JiraTicketOut"] = None


# ---------- Knowledge Base ----------

class KnowledgeBaseCreate(BaseModel):
    title: str
    content: str
    category: Optional[str] = None
    embedding_id: Optional[str] = None


class KnowledgeBaseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    article_id: int
    title: str
    content: str
    category: Optional[str]
    embedding_id: Optional[str]
    created_at: datetime


# ---------- Ticket Responses (AI-generated resolutions) ----------

class TicketResponseCreate(BaseModel):
    generated_response: str
    confidence_score: Optional[float] = None


class TicketResponseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    response_id: int
    ticket_id: int
    generated_response: str
    confidence_score: Optional[float]
    generated_at: datetime


# ---------- Escalations ----------

class EscalationCreate(BaseModel):
    assigned_team: Optional[str] = None
    escalation_reason: Optional[str] = None


class EscalationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    escalation_id: int
    ticket_id: int
    assigned_team: Optional[str]
    escalation_reason: Optional[str]
    status: str
    created_at: datetime


# ---------- Jira Tickets ----------

class JiraTicketCreate(BaseModel):
    jira_issue_key: str
    jira_status: str = "Open"


class JiraTicketOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    jira_id: int
    ticket_id: int
    jira_issue_key: str
    jira_status: str
    last_updated: datetime


# ---------- Activity Logs ----------

class ActivityLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    log_id: int
    ticket_id: int
    action: str
    performed_by: str
    timestamp: datetime


# ---------- Analytics ----------

class DashboardSummaryOut(BaseModel):
    total_tickets: Optional[int] = None
    total_tickets_today: int
    open_tickets: int
    resolved_tickets: int
    ai_resolved_tickets: int
    ai_resolution_rate: float
    avg_resolution_time: Optional[float]
    user_satisfaction: float

class WeeklyData(BaseModel):
    day: str
    created: int
    resolved: int

class WorkflowStatus(BaseModel):
    classified_today: int
    resolved_automatically: int
    escalated: int
    pending_validation: int

class PieChartData(BaseModel):
    open: int
    resolved: int
    ai_resolved: int

class RecentActivity(BaseModel):
    id: int
    description: str
    timestamp: datetime

class DashboardAnalyticsOut(BaseModel):
    weekly_data: List[WeeklyData]
    workflow_status: WorkflowStatus
    pie_chart_data: PieChartData
    recent_activities: List[RecentActivity]

class DashboardStats(BaseModel):
    total_tickets: int
    tickets_today: int
    ai_resolution_rate: float
    avg_resolution_time_hours: Optional[float]
    tickets_by_status: dict
    tickets_by_category: dict

TicketDetailOut.model_rebuild()
