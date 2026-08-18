from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..database import get_db

router = APIRouter(tags=["Escalations"])


@router.post("/api/tickets/{ticket_id}/escalations", response_model=schemas.EscalationOut, status_code=201)
def create_escalation(ticket_id: int, escalation_in: schemas.EscalationCreate, db: Session = Depends(get_db)):
    """
    Called when a ticket can't be auto-resolved (Milestone 3) and needs to go
    to a human support team. Automatically flips the ticket's status to
    'escalated'.
    """
    ticket = crud.get_ticket(db, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return crud.create_escalation(db, ticket_id, escalation_in)


@router.get("/api/escalations", response_model=list[schemas.EscalationOut])
def list_escalations(
    skip: int = 0, limit: int = 100, status: Optional[str] = None, db: Session = Depends(get_db)
):
    return crud.list_escalations(db, skip, limit, status)
