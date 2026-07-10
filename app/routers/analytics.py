from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..database import get_db

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/dashboard", response_model=schemas.DashboardStats)
def dashboard_stats(db: Session = Depends(get_db)):
    """
    Powers the Dashboard & Analytics screen (Milestone 4): total tickets,
    tickets today, AI resolution rate, avg resolution time, and breakdowns
    by status/category.
    """
    return crud.get_dashboard_stats(db)
