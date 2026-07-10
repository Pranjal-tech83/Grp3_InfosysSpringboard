"""
SQLAlchemy models — one class per table in the schema diagram (section 9 of
the project doc): Users, Tickets, Knowledge_Base, Ticket_Responses,
Escalations, Activity_Logs, Jira_Tickets.
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Column, Integer, String, Text, Float, DateTime, ForeignKey, Enum
)
from sqlalchemy.orm import relationship

from .database import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class TicketStatus(str, enum.Enum):
    open = "open"
    classified = "classified"
    in_progress = "in_progress"
    escalated = "escalated"
    resolved = "resolved"
    closed = "closed"


class TicketPriority(str, enum.Enum):
    p1_critical = "P1-Critical"
    p2_high = "P2-High"
    p3_medium = "P3-Medium"
    p4_low = "P4-Low"


class TicketSeverity(str, enum.Enum):
    critical = "Critical"
    high = "High"
    medium = "Medium"
    low = "Low"


class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    department = Column(String(120), nullable=True)
    role = Column(String(50), nullable=False, default="employee")  # employee, agent, admin
    created_at = Column(DateTime, default=datetime.utcnow)

    tickets = relationship("Ticket", back_populates="user")


class Ticket(Base):
    __tablename__ = "tickets"

    ticket_id = Column(Integer, primary_key=True, index=True)
    ticket_ref = Column(String(30), unique=True, index=True, default=lambda: f"T-{uuid.uuid4().hex[:8].upper()}")
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)

    subject = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)

    category = Column(String(100), nullable=True)       # e.g. Network Connectivity
    sub_category = Column(String(100), nullable=True)    # e.g. VPN Access
    priority = Column(String(30), nullable=True)         # TicketPriority values
    severity = Column(String(30), nullable=True)         # TicketSeverity values
    classification_confidence = Column(Float, nullable=True)  # 0-1

    status = Column(String(30), default=TicketStatus.open.value, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="tickets")
    responses = relationship("TicketResponse", back_populates="ticket", cascade="all, delete-orphan")
    escalations = relationship("Escalation", back_populates="ticket", cascade="all, delete-orphan")
    activity_logs = relationship("ActivityLog", back_populates="ticket", cascade="all, delete-orphan")
    jira_ticket = relationship("JiraTicket", back_populates="ticket", uselist=False, cascade="all, delete-orphan")


class KnowledgeBase(Base):
    __tablename__ = "knowledge_base"

    article_id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    category = Column(String(100), nullable=True)
    embedding_id = Column(String(100), nullable=True)  # pointer to vector DB record (FAISS/Chroma)
    created_at = Column(DateTime, default=datetime.utcnow)


class TicketResponse(Base):
    __tablename__ = "ticket_responses"

    response_id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.ticket_id"), nullable=False)
    generated_response = Column(Text, nullable=False)
    confidence_score = Column(Float, nullable=True)
    generated_at = Column(DateTime, default=datetime.utcnow)

    ticket = relationship("Ticket", back_populates="responses")


class Escalation(Base):
    __tablename__ = "escalations"

    escalation_id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.ticket_id"), nullable=False)
    assigned_team = Column(String(100), nullable=True)
    escalation_reason = Column(Text, nullable=True)
    status = Column(String(30), default="pending")  # pending, in_review, resolved
    created_at = Column(DateTime, default=datetime.utcnow)

    ticket = relationship("Ticket", back_populates="escalations")


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    log_id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.ticket_id"), nullable=False)
    action = Column(String(255), nullable=False)
    performed_by = Column(String(100), nullable=False)  # e.g. "AI Agent", "user@company.com"
    timestamp = Column(DateTime, default=datetime.utcnow)

    ticket = relationship("Ticket", back_populates="activity_logs")


class JiraTicket(Base):
    __tablename__ = "jira_tickets"

    jira_id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.ticket_id"), nullable=False, unique=True)
    jira_issue_key = Column(String(30), nullable=False)  # e.g. IT-2023-4521
    jira_status = Column(String(50), default="Open")
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    ticket = relationship("Ticket", back_populates="jira_ticket")
