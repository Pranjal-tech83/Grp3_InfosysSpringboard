from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, crud
from app.security.security_gateway import require_role
from app.security.rbac import Role, verify_resource_ownership

router = APIRouter(prefix="/api/employee/ai", tags=["Employee AI"])

@router.get("/resolution/{ticket_id}")
def get_ai_resolution(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(Role.EMPLOYEE))
):
    ticket = crud.get_ticket(db, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if not verify_resource_ownership(ticket.user_id, current_user.user_id, current_user.role):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    responses = crud.list_ticket_responses(db, ticket_id)
    return {"responses": responses}

from app.triage import derive_ai_triage
from pydantic import BaseModel

class TicketInput(BaseModel):
    title: str
    description: str

@router.post("/triage")
def employee_triage(
    ticket: TicketInput,
    current_user: models.User = Depends(require_role(Role.EMPLOYEE))
):
    # Safe AI classification explicitly requested by an employee.
    triage = derive_ai_triage(
        title=ticket.title,
        description=ticket.description,
        explicit_dept=current_user.department
    )
    return {
        "category": triage["category"],
        "priority": triage["priority"],
        "severity": triage["severity"],
        "confidence_score": triage["confidence_score"],
        "reasoning_summary": "Auto-classified based on employee input."
    }
