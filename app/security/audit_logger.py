import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class AuditLogger:
    @staticmethod
    def log_event(event_type: str, user_email: str, ip_address: str, details: dict):
        """
        Logs security-relevant events without storing sensitive data (passwords, tokens).
        In production, this would write to a secure, append-only database or SIEM.
        """
        # Ensure no secrets in details
        safe_details = details.copy()
        if "password" in safe_details:
            safe_details["password"] = "***"
        if "token" in safe_details:
            safe_details["token"] = "***"

        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "event_type": event_type,
            "user_email": user_email,
            "ip_address": ip_address,
            "details": safe_details
        }
        
        logger.info(f"AUDIT_LOG: {log_entry}")
        
        # Additionally log to DB if required, but for this implementation
        # standard stdout logging or a dedicated file is sufficient.

audit_logger = AuditLogger()
