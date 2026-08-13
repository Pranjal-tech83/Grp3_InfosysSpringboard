from fastapi import Request, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app.crud import get_user_by_email
from app.security.authorization import decode_access_token
from app.security.rbac import Role, has_permission, Permission
from app.security.risk_scanner import risk_scanner
from app.security.session_guard import session_guard
from app.security.audit_logger import audit_logger

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/employee/auth/login", auto_error=False)

def get_current_user_token_data(request: Request, token: str = Depends(oauth2_scheme)):
    if not token:
        # Check cookie fallback (if implemented in frontend)
        token = request.cookies.get("access_token")
        if token and token.startswith("Bearer "):
            token = token.split(" ")[1]

    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    
    if not session_guard.is_token_valid(token):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session invalidated")

    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    
    return payload, token

def get_current_user(payload_and_token: tuple = Depends(get_current_user_token_data), db: Session = Depends(get_db)):
    payload, _ = payload_and_token
    email: str = payload.get("sub")
    if email is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    
    user = get_user_by_email(db, email=email)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    
    return user

def require_role(required_role: Role):
    def role_checker(request: Request, user = Depends(get_current_user)):
        # Run risk scanner on authenticated request
        risk_result = risk_scanner.scan_request(request, user_id=user.user_id)
        if not risk_result["allowed"]:
            audit_logger.log_event("Risk_Blocked", user.email, request.client.host, risk_result)
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Request blocked by risk scanner")

        if user.role.upper() != required_role.value:
            audit_logger.log_event("Role_Violation", user.email, request.client.host, {"required": required_role.value, "actual": user.role})
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role privileges")
        return user
    return role_checker

def require_permission(required_permission: Permission):
    def permission_checker(request: Request, user = Depends(get_current_user)):
        if not has_permission(user.role, required_permission):
            audit_logger.log_event("Permission_Violation", user.email, request.client.host, {"required": required_permission.value})
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Missing required permission")
        return user
    return permission_checker
