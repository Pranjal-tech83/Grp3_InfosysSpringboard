from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta

from app.database import get_db
from app import models, schemas
from app.security.security_gateway import require_role
from app.security.rbac import Role

router = APIRouter(prefix="/api/employee/dashboard", tags=["Employee Dashboard"])

@router.get("/summary", response_model=schemas.DashboardSummaryOut)
def get_employee_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(Role.EMPLOYEE))
):
    """
    Returns statistics specific to the logged-in employee.
    """
    user_id = current_user.user_id

    total_tickets = db.query(func.count(models.Ticket.ticket_id)).filter(models.Ticket.user_id == user_id).scalar() or 0
    total_tickets_today = 0 # simplified for employee
    open_tickets = db.query(func.count(models.Ticket.ticket_id)).filter(
        models.Ticket.user_id == user_id,
        models.Ticket.status.notin_([models.TicketStatus.resolved.value, models.TicketStatus.closed.value])
    ).scalar() or 0
    resolved_tickets = db.query(func.count(models.Ticket.ticket_id)).filter(
        models.Ticket.user_id == user_id,
        models.Ticket.status.in_([models.TicketStatus.resolved.value, models.TicketStatus.closed.value])
    ).scalar() or 0
    ai_resolved_tickets = 0

    return {
        "total_tickets": total_tickets,
        "total_tickets_today": total_tickets_today,
        "open_tickets": open_tickets,
        "resolved_tickets": resolved_tickets,
        "ai_resolved_tickets": ai_resolved_tickets,
        "ai_resolution_rate": 0.0,
        "avg_resolution_time": 0.0,
        "user_satisfaction": 100.0
    }

@router.get("/activity", response_model=schemas.DashboardAnalyticsOut)
def get_employee_dashboard_activity(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(Role.EMPLOYEE))
):
    user_id = current_user.user_id

    # Gather activities
    activities = db.query(models.ActivityLog).join(models.Ticket).filter(
        models.Ticket.user_id == user_id
    ).order_by(models.ActivityLog.timestamp.desc()).limit(10).all()
    
    recent_activities = [
        {"id": a.log_id, "description": f"Ticket #{a.ticket_id}: {a.action}", "timestamp": a.timestamp}
        for a in activities
    ]

    open_t = db.query(func.count(models.Ticket.ticket_id)).filter(
        models.Ticket.user_id == user_id, models.Ticket.status == models.TicketStatus.open.value
    ).scalar() or 0
    resolved_t = db.query(func.count(models.Ticket.ticket_id)).filter(
        models.Ticket.user_id == user_id, models.Ticket.status == models.TicketStatus.resolved.value
    ).scalar() or 0
    escalated_t = db.query(func.count(models.Ticket.ticket_id)).filter(
        models.Ticket.user_id == user_id, models.Ticket.status == models.TicketStatus.escalated.value
    ).scalar() or 0
    in_progress_t = db.query(func.count(models.Ticket.ticket_id)).filter(
        models.Ticket.user_id == user_id, models.Ticket.status == models.TicketStatus.in_progress.value
    ).scalar() or 0

    # Calculate rolling 7-day data for the chart
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    start_date = today - timedelta(days=6)
    
    day_labels = [(start_date + timedelta(days=i)).strftime("%a") for i in range(7)]
    weekly_data = []
    for i in range(7):
        day_date = start_date + timedelta(days=i)
        next_day = day_date + timedelta(days=1)
        day_name = day_labels[i]
        
        created = db.query(func.count(models.Ticket.ticket_id)).filter(
            models.Ticket.user_id == user_id,
            models.Ticket.created_at >= day_date,
            models.Ticket.created_at < next_day
        ).scalar() or 0
        
        resolved = db.query(func.count(models.Ticket.ticket_id)).filter(
            models.Ticket.user_id == user_id,
            models.Ticket.status.in_([models.TicketStatus.resolved.value, models.TicketStatus.closed.value]),
            models.Ticket.updated_at >= day_date,
            models.Ticket.updated_at < next_day
        ).scalar() or 0
        
        weekly_data.append({
            "day": day_name,
            "created": created,
            "resolved": resolved
        })

    return {
        "weekly_data": weekly_data,
        "previous_weekly_data": [],
        "current_week_label": "Last 7 Days",
        "previous_week_label": "Previous 7 Days",
        "workflow_status": {
            "classified_today": open_t,
            "resolved_automatically": resolved_t,
            "escalated": escalated_t,
            "pending_validation": in_progress_t
        },
        "pie_chart_data": {
            "open": open_t,
            "resolved": resolved_t,
            "ai_resolved": 0
        },
        "recent_activities": recent_activities
    }
