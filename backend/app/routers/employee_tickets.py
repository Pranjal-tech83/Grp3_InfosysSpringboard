from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, crud
from app.security.security_gateway import require_role
from app.security.rbac import Role, verify_resource_ownership
from app.security.audit_logger import audit_logger

router = APIRouter(prefix="/api/employee/tickets", tags=["Employee Tickets"])

@router.get("/", response_model=List[schemas.TicketOut])
def get_my_tickets(
    skip: int = 0, limit: int = 100, status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(Role.EMPLOYEE))
):
    query = db.query(models.Ticket).filter(models.Ticket.user_id == current_user.user_id)
    if status:
        query = query.filter(models.Ticket.status == status)
    
    return query.order_by(models.Ticket.created_at.desc()).offset(skip).limit(limit).all()

@router.get("/{ticket_id}", response_model=schemas.TicketDetailOut)
def get_my_ticket_details(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(Role.EMPLOYEE))
):
    ticket = crud.get_ticket(db, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    # CRITICAL: Verify ownership
    if not verify_resource_ownership(ticket.user_id, current_user.user_id, current_user.role):
        audit_logger.log_event("Unauthorized_Ticket_Access", current_user.email, "unknown", {"ticket_id": ticket_id})
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied. You can only view your own tickets.")

    return ticket

@router.post("/", response_model=schemas.TicketOut)
def create_ticket(
    ticket_in: schemas.TicketCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(Role.EMPLOYEE))
):
    # Override requester email with authenticated user to prevent spoofing
    ticket_in.requester_email = current_user.email
    ticket_in.requester_name = current_user.name
    created_ticket = crud.create_ticket(db, ticket_in)

    # Automatically log and dispatch confirmation email to Email Automation Outbox
    try:
        from .email import send_automated_email, EmailSendRequest
        email_req = EmailSendRequest(
            to=current_user.email or "customer@company.com",
            name=current_user.name or "Customer",
            ticket_id=f"TKT-{created_ticket.ticket_id}",
            ticket_status=created_ticket.status or "Open",
            event_type="created",
            subject=f"RECEIVED: We received your support request - {created_ticket.subject}",
            body=f"Dear {current_user.name or 'Customer'},\n\nThank you for contacting SupportPilot. We have received your support request:\n\n• Ticket ID: TKT-{created_ticket.ticket_id}\n• Subject: {created_ticket.subject}\n• Department: {ticket_in.department or 'General Support'}\n\nOur AI diagnostic agents are actively analyzing your issue and generating remediation steps. You can monitor live progress directly in the SupportPilot portal.\n\nBest regards,\nSupportPilot Automated Support Team"
        )
        send_automated_email(email_req)
    except Exception as e:
        print(f"[Employee Tickets API] Automated email dispatch on ticket creation: {e}")

    # Automatically create & synchronize corresponding Jira Issue with Intelligent Team Assignment
    try:
        from .jira_tickets import create_jira_issue_record
        create_jira_issue_record(
            ticket_id=created_ticket.ticket_id,
            subject=created_ticket.subject,
            description=created_ticket.description or "",
            category=getattr(created_ticket, "category", None) or getattr(ticket_in, "category", None) or getattr(ticket_in, "department", None) or "General",
            priority=getattr(created_ticket, "priority", None) or getattr(ticket_in, "priority", None) or "Medium",
            severity=getattr(created_ticket, "severity", None) or getattr(ticket_in, "severity", None) or "P3",
            reporter_name=current_user.name or "Customer",
            reporter_email=current_user.email or "customer@company.com",
            db=db
        )
    except Exception as e:
        print(f"[Employee Tickets API] Automated Jira sync on ticket creation: {e}")

    return created_ticket