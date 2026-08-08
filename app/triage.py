"""
AI Triage Module for SupportPilot.
Determines intelligent category, department, priority (P1-P4), severity, and confidence score.
"""

from typing import Optional, Dict, Any, List


def derive_ai_triage(title: str, description: str = "", explicit_dept: Optional[str] = None) -> Dict[str, Any]:
    """
    Analyzes ticket subject and description and returns taxonomy and SLA priority classifications.
    """
    text = f"{title or ''} {description or ''}".lower()

    # 1. Critical / Database / Connection Exhaustion (P1 Urgent)
    if any(k in text for k in [
        "database", "sql", "postgres", "mysql", "deadlock", "query", "redis",
        "table lock", "exhaustion", "pool exhaustion", "data loss", "data corruption"
    ]):
        return {
            "category": "Database Performance",
            "department": "Engineering",
            "priority": "P1 Urgent",
            "severity": "Critical",
            "confidence_score": 0.97,
            "suggested_team": "Database Reliability Engineering (DBA)",
            "suggested_tags": ["#database", "#deadlock", "#query-tuning", "#high-severity"],
            "suggested_resolution": "1. Inspect pg_stat_activity for blocked locks and terminate offending orphan PID.\n2. Enable connection pooling threshold buffers in PgBouncer.\n3. Optimize index on affected query predicate.",
            "reasoning_summary": "Critical relational locking or connection pool exhaustion detected requiring immediate DBA intervention."
        }

    # 2. Outages / Production Down (P1 Urgent)
    elif any(k in text for k in [
        "outage", "production down", "prod down", "system failure", "p0", "p1",
        "loop failure", "critacal", "critical failure", "service crash"
    ]):
        return {
            "category": "Network",
            "department": "Engineering",
            "priority": "P1 Urgent",
            "severity": "Critical",
            "confidence_score": 0.98,
            "suggested_team": "Site Reliability Engineering (SRE)",
            "suggested_tags": ["#outage", "#production-incident", "#sre-urgent"],
            "suggested_resolution": "1. Declare incident response channel.\n2. Fail over traffic to secondary cluster or alternate gateway.\n3. Pull application error logs and triage root cause.",
            "reasoning_summary": "High-impact production outage or critical loop failure requiring immediate SRE response."
        }

    # 3. Network / VPN / Gateway issues (P2 High)
    elif any(k in text for k in [
        "vpn", "wifi", "dns", "gateway", "network", "bandwidth", "firewall",
        "connection timeout", "latency", "packet loss"
    ]):
        return {
            "category": "Network",
            "department": "Engineering",
            "priority": "P2 High",
            "severity": "High",
            "confidence_score": 0.96,
            "suggested_team": "Network Operations (NetOps)",
            "suggested_tags": ["#network", "#vpn-gateway", "#connectivity", "#latency"],
            "suggested_resolution": "1. Reset local network adapter and verify routing table.\n2. Reconnect through alternate VPN gateway cluster (gw-east-02).\n3. Flush DNS cache via `ipconfig /flushdns`.",
            "reasoning_summary": "Network interface timeout or gateway congestion detected in corporate network pipeline."
        }

    # 4. Authentication / Security / Access / SSO / Passwords (P2 High or P3 Medium)
    elif any(k in text for k in [
        "password", "mfa", "2fa", "sso", "login", "locked", "auth",
        "permission", "access denied", "oauth", "token expired", "unauthorized"
    ]):
        is_high = any(k in text for k in ["locked", "mfa", "2fa", "expired", "oauth", "production", "api gateway"])
        return {
            "category": "Authentication",
            "department": "Customer Support",
            "priority": "P2 High" if is_high else "P3 Medium",
            "severity": "High" if is_high else "Medium",
            "confidence_score": 0.94,
            "suggested_team": "Identity & Access Management (IAM)",
            "suggested_tags": ["#auth", "#sso-login", "#access-management", "#mfa"],
            "suggested_resolution": "1. Verify active directory user status in Okta/ActiveDirectory.\n2. Invalidate expired session tokens and issue temporary bypass token.\n3. Guide user through self-service identity verification portal.",
            "reasoning_summary": "Identity verification or session credential expiry detected in Single Sign-On pipeline."
        }

    # 5. Payment / Invoices / Billing (P3 Medium)
    elif any(k in text for k in [
        "payment", "invoice", "stripe", "billing", "charge", "refund",
        "subscription", "credit card", "deducted twice", "double charge"
    ]):
        return {
            "category": "Payment Issues",
            "department": "Billing",
            "priority": "P3 Medium",
            "severity": "Medium",
            "confidence_score": 0.93,
            "suggested_team": "Billing Operations Team",
            "suggested_tags": ["#billing", "#invoice-dispute", "#stripe", "#subscription"],
            "suggested_resolution": "1. Query payment processor webhook logs for duplicate authorization intent.\n2. Void duplicate capture or issue automated reversal refund.\n3. Update customer invoice ledger and send receipt.",
            "reasoning_summary": "Discrepancy in automated payment gateway webhook or double billing report."
        }

    # 6. Hardware / Peripherals / Printers (P4 Low)
    elif any(k in text for k in [
        "printer", "laptop", "monitor", "battery", "hardware", "cpu",
        "fan", "keyboard", "docking", "mouse", "screen", "cable"
    ]):
        return {
            "category": "Hardware",
            "department": "Customer Support",
            "priority": "P4 Low",
            "severity": "Low",
            "confidence_score": 0.91,
            "suggested_team": "IT Desktop Support",
            "suggested_tags": ["#hardware", "#peripherals", "#device-health", "#workstation"],
            "suggested_resolution": "1. Perform hardware power cycle (30-second capacitive discharge).\n2. Update peripheral firmware drivers via device update utility.\n3. Provision replacement loaner hardware if hardware diagnostics fail.",
            "reasoning_summary": "Physical asset malfunction requiring hardware diagnostic checks or peripheral replacement."
        }

    # 7. Default Software (P3 Medium)
    else:
        return {
            "category": "Software",
            "department": explicit_dept or "Customer Support",
            "priority": "P3 Medium",
            "severity": "Medium",
            "confidence_score": 0.92,
            "suggested_team": "Customer Support Team",
            "suggested_tags": ["#software", "#app-crash", "#cache-clear", "#triage"],
            "suggested_resolution": "1. Clear local application cache directory and restart the client process.\n2. Verify system requirements and ensure client version is up to date.\n3. Collect application crash stack trace for developer investigation.",
            "reasoning_summary": "Application software execution anomaly. Recommended standard cache flush and diagnostic log collection."
        }
