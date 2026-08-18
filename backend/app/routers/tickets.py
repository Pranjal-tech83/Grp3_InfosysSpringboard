from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..database import get_db

router = APIRouter(prefix="/api/tickets", tags=["Tickets"])


@router.post("", response_model=schemas.TicketOut, status_code=201)
def submit_ticket(ticket: schemas.TicketCreate, db: Session = Depends(get_db)):
    """
    Ticket intake endpoint. Used by the web portal, email-intake service,
    or the service desk connector (Milestone 1). Creates the requesting
    user automatically if they don't exist yet.
    """
    created_ticket = crud.create_ticket(db, ticket)
    
    # Automatically log and dispatch confirmation email to Email Automation Outbox
    try:
        from .email import send_automated_email, EmailSendRequest
        user = crud.get_user(db, created_ticket.user_id)
        recipient_email = user.email if user else ticket.requester_email
        recipient_name = user.name if user else ticket.requester_name
        
        email_req = EmailSendRequest(
            to=recipient_email or "customer@company.com",
            name=recipient_name or "Customer",
            ticket_id=f"TKT-{created_ticket.ticket_id}",
            ticket_status=created_ticket.status or "Open",
            event_type="created",
            subject=f"RECEIVED: We received your support request - {created_ticket.subject}",
            body=f"Dear {recipient_name or 'Customer'},\n\nThank you for contacting SupportPilot. We have received your support request:\n\n• Ticket ID: TKT-{created_ticket.ticket_id}\n• Subject: {created_ticket.subject}\n• Department: {ticket.department or 'General Support'}\n\nOur AI diagnostic agents are actively analyzing your issue and generating remediation steps. You can monitor live progress directly in the SupportPilot portal.\n\nBest regards,\nSupportPilot Automated Support Team"
        )
        send_automated_email(email_req)
    except Exception as e:
        print(f"[Tickets API] Automated email dispatch on ticket creation: {e}")

    # Automatically create & synchronize corresponding Jira Issue with Intelligent Team Assignment
    try:
        from .jira_tickets import create_jira_issue_record
        user = crud.get_user(db, created_ticket.user_id)
        create_jira_issue_record(
            ticket_id=created_ticket.ticket_id,
            subject=created_ticket.subject,
            description=created_ticket.description or "",
            category=getattr(created_ticket, "category", None) or getattr(ticket, "category", None) or getattr(ticket, "department", None) or "General",
            priority=getattr(created_ticket, "priority", None) or getattr(ticket, "priority", None) or "Medium",
            severity=getattr(created_ticket, "severity", None) or getattr(ticket, "severity", None) or "P3",
            reporter_name=user.name if user else getattr(ticket, "requester_name", None) or "Customer",
            reporter_email=user.email if user else getattr(ticket, "requester_email", None) or "customer@company.com",
            db=db
        )
    except Exception as e:
        print(f"[Tickets API] Automated Jira sync on ticket creation: {e}")

    return created_ticket


@router.get("", response_model=list[schemas.TicketOut])
def list_tickets(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    category: Optional[str] = None,
    priority: Optional[str] = None,
    db: Session = Depends(get_db),
):
    return crud.list_tickets(db, skip, limit, status, category, priority)


@router.get("/{ticket_id}", response_model=schemas.TicketDetailOut)
def get_ticket(ticket_id: int, db: Session = Depends(get_db)):
    ticket = crud.get_ticket(db, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


@router.patch("/{ticket_id}/classification", response_model=schemas.TicketOut)
def classify_ticket(
    ticket_id: int, update: schemas.TicketClassificationUpdate, db: Session = Depends(get_db)
):
    """
    Called by the AI Classification Engine (Milestone 1) once it has scored
    a ticket's category, severity, and priority.
    """
    ticket = crud.get_ticket(db, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return crud.update_ticket_classification(db, ticket, update)


@router.patch("/{ticket_id}/status", response_model=schemas.TicketOut)
@router.put("/{ticket_id}/status", response_model=schemas.TicketOut)
def set_ticket_status(ticket_id: int, update: schemas.TicketStatusUpdate, db: Session = Depends(get_db)):
    ticket = crud.get_ticket(db, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    updated = crud.update_ticket_status(db, ticket, update.status, performed_by=update.performed_by or "Operator")
    
    # Automatically synchronize Jira Issue status
    try:
        from .jira_tickets import sync_jira_ticket_status
        sync_jira_ticket_status(ticket_id, update.status, detail=f"Status set to {update.status} by {update.performed_by or 'Operator'}", db=db)
    except Exception as e:
        print(f"[Tickets API] Jira status sync error: {e}")

    # Email notification for status change → Email Automation Outbox
    try:
        from .email import send_automated_email, EmailSendRequest
        user = crud.get_user(db, updated.user_id)
        recipient_email = getattr(user, "email", None) or "customer@company.com"
        recipient_name  = getattr(user, "name", None) or "Customer"
        status_label = update.status.capitalize()
        send_automated_email(EmailSendRequest(
            to=recipient_email,
            name=recipient_name,
            ticket_id=f"TKT-{ticket_id}",
            ticket_status=update.status,
            event_type=f"status_changed_{update.status.lower()}",
            subject=f"UPDATE [{status_label}]: Your ticket TKT-{ticket_id} status has changed",
            body=(
                f"Dear {recipient_name},\n\n"
                f"Your support ticket has been updated:\n\n"
                f"• Ticket ID : TKT-{ticket_id}\n"
                f"• Subject   : {updated.subject}\n"
                f"• New Status: {status_label}\n"
                f"• Updated by: {update.performed_by or 'SupportPilot System'}\n\n"
                f"You can view full details and progress in the SupportPilot portal.\n\n"
                f"Best regards,\nSupportPilot Automated Support Team"
            ),
        ))
    except Exception as e:
        print(f"[Tickets API] Email outbox on status change: {e}")

    return updated



@router.put("/{ticket_id}", response_model=schemas.TicketOut)
def update_ticket(ticket_id: int, update: schemas.TicketUpdate, db: Session = Depends(get_db)):
    ticket = crud.get_ticket(db, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    updated = crud.update_ticket_full(
        db,
        ticket,
        subject=update.subject,
        description=update.description,
        category=update.category,
        priority=update.priority,
        severity=update.severity,
        status=update.status,
        performed_by=update.performed_by or "Operator"
    )
    
    if update.status:
        try:
            from .jira_tickets import sync_jira_ticket_status
            sync_jira_ticket_status(ticket_id, update.status, detail=f"Ticket full update to {update.status}", db=db)
        except Exception as e:
            print(f"[Tickets API] Jira status sync error on update: {e}")
            
    return updated


@router.get("/{ticket_id}/logs", response_model=list[schemas.ActivityLogOut])
def get_ticket_activity(ticket_id: int, db: Session = Depends(get_db)):
    ticket = crud.get_ticket(db, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return crud.list_activity_logs(db, ticket_id)

@router.delete("/{ticket_id}", status_code=200)
def delete_ticket(ticket_id: int, db: Session = Depends(get_db)):
    ticket = crud.get_ticket(db, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    crud.log_activity(db, ticket_id, f"Ticket #{ticket_id} deleted / archived", performed_by="System Admin")
    db.delete(ticket)
    db.commit()
    return {"status": "success", "message": f"Ticket #{ticket_id} deleted successfully", "ticket_id": ticket_id}
