"""
Populates the database with realistic demo data so the frontend team has
something to build against immediately, and so the /api/analytics/dashboard
endpoint returns non-empty numbers.

Run with:
    python seed_data.py
"""

from datetime import datetime, timedelta

from app.database import SessionLocal, engine
from app import models

models.Base.metadata.create_all(bind=engine)

db = SessionLocal()

try:
    # ---- Users ----
    john = models.User(name="John Doe", email="john.doe@company.com", department="IT", role="employee")
    priya = models.User(name="Priya Nair", email="priya.nair@company.com", department="Finance", role="employee")
    agent = models.User(name="Sam Rivera", email="sam.rivera@company.com", department="IT Support", role="agent")
    db.add_all([john, priya, agent])
    db.commit()

    # ---- Knowledge Base ----
    kb1 = models.KnowledgeBase(
        title="VPN Troubleshooting Guide",
        content="Step-by-step instructions for resolving VPN connection issues including timeout errors. "
                "Verify corporate firewall settings allow VPN traffic on ports 500 and 4500, check VPN "
                "client configuration for correct server address and authentication method, restart the "
                "VPN service, and clear cached credentials.",
        category="Network",  # Modified to align with the AI Engine taxonomy bounds
        embedding_id="emb_vpn_001",
    )
    kb2 = models.KnowledgeBase(
        title="Network Firewall Configuration",
        content="Firewall settings that may block VPN connections on corporate networks and how to "
                "identify and correct them.",
        category="IT Policies",
        embedding_id="emb_fw_002",
    )
    kb3 = models.KnowledgeBase(
        title="Password Reset Self-Service",
        content="How employees can reset their own passwords via the self-service portal, and escalation "
                "steps if the portal is unavailable.",
        category="Access",  # Modified to match taxonomy system strings
        embedding_id="emb_pwd_003",
    )
    db.add_all([kb1, kb2, kb3])
    db.commit()

    # ---- Tickets ----
    t1 = models.Ticket(
        user_id=john.user_id,
        subject="VPN Connection Failing on Corporate Network",
        description='Unable to connect to VPN since this morning. Error message: "Connection timed out. '
                    'Please check your network settings and try again." Tried restarting the client but '
                    'issue persists.',
        category="Network",  # Modified to mirror the exact live classification endpoint stream output
        sub_category="VPN Access",
        priority=models.TicketPriority.p1_critical.value,
        severity=models.TicketSeverity.high.value,
        classification_confidence=0.92,
        status=models.TicketStatus.in_progress.value,
        created_at=datetime.utcnow() - timedelta(hours=2),
    )
    t2 = models.Ticket(
        user_id=priya.user_id,
        subject="Software Installation Error",
        description="Getting an error code 0x80070005 while installing the finance reporting tool.",
        category="Software",
        sub_category="Installation",
        priority=models.TicketPriority.p3_medium.value,
        severity=models.TicketSeverity.medium.value,
        classification_confidence=0.88,
        status=models.TicketStatus.resolved.value,
        created_at=datetime.utcnow() - timedelta(hours=5),
        updated_at=datetime.utcnow() - timedelta(hours=4),
    )
    t3 = models.Ticket(
        user_id=john.user_id,
        subject="Password Reset Required",
        description="Locked out of my account after too many failed login attempts.",
        category="Access",
        sub_category="Account",
        priority=models.TicketPriority.p2_high.value,
        severity=models.TicketSeverity.medium.value,
        classification_confidence=0.95,
        status=models.TicketStatus.resolved.value,
        created_at=datetime.utcnow() - timedelta(hours=6),
        updated_at=datetime.utcnow() - timedelta(hours=5, minutes=40),
    )
    t4 = models.Ticket(
        user_id=priya.user_id,
        subject="Printer Not Responding",
        description="3rd floor printer isn't responding to print jobs since yesterday.",
        category="Hardware",
        sub_category="Printer",
        status=models.TicketStatus.open.value,
        created_at=datetime.utcnow() - timedelta(hours=1),
    )
    db.add_all([t1, t2, t3, t4])
    db.commit()

    # ---- Ticket Responses ----
    db.add(models.TicketResponse(
        ticket_id=t1.ticket_id,
        generated_response="1) Verify corporate firewall allows VPN traffic on ports 500/4500. "
                           "2) Check VPN client server address and auth method. "
                           "3) Restart the VPN service. 4) Clear cached credentials.",
        confidence_score=0.87,
    ))
    db.add(models.TicketResponse(
        ticket_id=t2.ticket_id,
        generated_response="Error 0x80070005 indicates a permissions issue — reinstall using an admin "
                           "account or grant write access to the install directory.",
        confidence_score=0.91,
    ))
    db.commit()

    # ---- Escalation (t1 was tough, went to network team) ----
    db.add(models.Escalation(
        ticket_id=t1.ticket_id,
        assigned_team="Network Team",
        escalation_reason="Automated resolution attempted but issue persisted after 15 minutes.",
        status="in_review",
    ))
    db.commit()

    # ---- Jira tickets ----
    db.add(models.JiraTicket(ticket_id=t1.ticket_id, jira_issue_key="IT-2023-4521", jira_status="In Progress"))
    db.add(models.JiraTicket(ticket_id=t4.ticket_id, jira_issue_key="IT-2023-4524", jira_status="Open"))
    db.commit()

    # ---- Activity logs ----
    db.add_all([
        models.ActivityLog(ticket_id=t1.ticket_id, action="Ticket submitted", performed_by=john.email),
        models.ActivityLog(ticket_id=t1.ticket_id, action="Classified as Network/VPN Access, P1-Critical",
                           performed_by="AI Classification Engine"),
        models.ActivityLog(ticket_id=t1.ticket_id, action="Escalated to Network Team", performed_by="Escalation Agent"),
    ])
    db.commit()

    print("Seed data created successfully:")
    print(f"  Users: {db.query(models.User).count()}")
    print(f"  Tickets: {db.query(models.Ticket).count()}")
    print(f"  Knowledge Base articles: {db.query(models.KnowledgeBase).count()}")
    print(f"  Ticket Responses: {db.query(models.TicketResponse).count()}")
    print(f"  Escalations: {db.query(models.Escalation).count()}")
    print(f"  Jira Tickets: {db.query(models.JiraTicket).count()}")

finally:
    db.close()