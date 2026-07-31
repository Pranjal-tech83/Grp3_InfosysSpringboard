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
    return crud.create_ticket(db, ticket)


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
def set_ticket_status(ticket_id: int, update: schemas.TicketStatusUpdate, db: Session = Depends(get_db)):
    ticket = crud.get_ticket(db, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return crud.update_ticket_status(db, ticket, update.status)


@router.get("/{ticket_id}/logs", response_model=list[schemas.ActivityLogOut])
def get_ticket_activity(ticket_id: int, db: Session = Depends(get_db)):
    ticket = crud.get_ticket(db, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return crud.list_activity_logs(db, ticket_id)
