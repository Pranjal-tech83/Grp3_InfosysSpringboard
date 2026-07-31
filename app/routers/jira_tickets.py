from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..database import get_db

router = APIRouter(tags=["Jira Integration"])


@router.post("/api/tickets/{ticket_id}/jira", response_model=schemas.JiraTicketOut, status_code=201)
def upsert_jira_ticket(ticket_id: int, jira_in: schemas.JiraTicketCreate, db: Session = Depends(get_db)):
    """
    Creates or updates the linked Jira issue for a support ticket
    (Milestone 3). The actual call to Jira's REST API happens in the
    integrations module — this endpoint just persists the resulting
    issue key/status so the dashboard and ticket detail view can show it.
    """
    ticket = crud.get_ticket(db, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return crud.create_or_update_jira_ticket(db, ticket_id, jira_in)
