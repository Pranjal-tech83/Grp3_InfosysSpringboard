from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..database import get_db

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])
dashboard_router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/dashboard/summary", response_model=schemas.DashboardSummaryOut)
@dashboard_router.get("/summary", response_model=schemas.DashboardSummaryOut)
def dashboard_summary(db: Session = Depends(get_db)):
    """
    Returns KPIs for the top of the dashboard.
    """
    return crud.get_dashboard_summary(db)


@router.get("/dashboard/analytics", response_model=schemas.DashboardAnalyticsOut)
@dashboard_router.get("/analytics", response_model=schemas.DashboardAnalyticsOut)
def dashboard_analytics(db: Session = Depends(get_db)):
    """
    Returns data for charts, workflows, and recent activities.
    """
    return crud.get_dashboard_analytics_data(db)