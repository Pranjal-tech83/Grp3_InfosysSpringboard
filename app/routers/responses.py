from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..database import get_db

router = APIRouter(prefix="/api/tickets/{ticket_id}/responses", tags=["Ticket Responses"])


@router.post("", response_model=schemas.TicketResponseOut, status_code=201)
def add_response(ticket_id: int, response_in: schemas.TicketResponseCreate, db: Session = Depends(get_db)):
    """
    Called by the AI Resolution Generator (Milestone 2) to store a generated
    troubleshooting response/resolution for a ticket.
    """
    ticket = crud.get_ticket(db, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return crud.create_ticket_response(db, ticket_id, response_in)


@router.get("", response_model=list[schemas.TicketResponseOut])
def list_responses(ticket_id: int, db: Session = Depends(get_db)):
    ticket = crud.get_ticket(db, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return crud.list_ticket_responses(db, ticket_id)