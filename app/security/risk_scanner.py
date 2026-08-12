from fastapi import Request
import logging

logger = logging.getLogger(__name__)

class RiskScanner:
    @staticmethod
    def scan_request(request: Request, user_id: int = None, payload: dict = None) -> dict:
        """
        Scans an incoming request for suspicious activity.
        In a real application, this would integrate with rate limiting, geo-IP,
        WAF, and anomaly detection models.
        """
        risk_score = 0
        risk_level = "LOW"
        reasons = []

        # Example check: excessive request frequency (mocked)
        # Example check: strange headers
        user_agent = request.headers.get("user-agent", "")
        if "sqlmap" in user_agent.lower() or "curl" in user_agent.lower():
            risk_score += 5
            reasons.append("Suspicious User-Agent")

        # Example payload check
        if payload:
            for k, v in payload.items():
                if isinstance(v, str) and ("<script>" in v or "UNION SELECT" in v.upper()):
                    risk_score += 10
                    reasons.append("Possible Injection/XSS Payload")

        if risk_score > 8:
            risk_level = "CRITICAL"
        elif risk_score > 4:
            risk_level = "MEDIUM"

        result = {
            "allowed": risk_score < 10,
            "risk_level": risk_level,
            "risk_score": risk_score,
            "reasons": reasons
        }

        if not result["allowed"]:
            logger.warning(f"Risk Scanner Blocked Request: {result}")

        return result

    @staticmethod
    def scan_file(contents: bytes, filename: str) -> dict:
        """
        Scans an uploaded file for embedded malicious payloads.
        In a real application, this would integrate with ClamAV or similar.
        """
        risk_score = 0
        reasons = []

        try:
            # Check for embedded script tags in binary/text
            content_str = contents.decode("utf-8", errors="ignore").lower()
            if "<script" in content_str or "javascript:" in content_str:
                risk_score += 10
                reasons.append("Malicious code (script) detected in file")
            
            if "eval(" in content_str or "base64_decode" in content_str:
                risk_score += 5
                reasons.append("Suspicious obfuscated payload detected")
        except Exception:
            pass

        result = {
            "allowed": risk_score < 10,
            "risk_score": risk_score,
            "reasons": reasons
        }

        if not result["allowed"]:
            logger.warning(f"Risk Scanner Blocked File Upload ({filename}): {result}")

        return result

risk_scanner = RiskScanner()
