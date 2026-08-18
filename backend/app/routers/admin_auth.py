from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app import crud
from app.database import get_db
from app.security.authorization import verify_password, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES, get_password_hash
from app.security.rbac import Role
from app.models import User
from pydantic import BaseModel, EmailStr
from typing import Optional
from app.security.audit_logger import audit_logger
from app.security.session_guard import session_guard
from app.security.security_gateway import get_current_user_token_data

class AdminRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None

router = APIRouter(prefix="/api/admin/auth", tags=["Admin Auth"])

@router.post("/register")
def register_admin(payload: AdminRegister, db: Session = Depends(get_db)):
    if crud.get_user_by_email(db, payload.email):
        raise HTTPException(status_code=409, detail="Email already registered")
    
    hashed_pw = get_password_hash(payload.password)
    user = User(
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
        role=Role.ADMIN.value,
        password_hash=hashed_pw,
        email_verified=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"message": "Admin registered successfully"}

@router.post("/login")
def login_for_access_token(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, email=form_data.username)
    client_ip = request.client.host if request.client else "unknown"
    if not user:
        audit_logger.log_event("Failed_Admin_Login", form_data.username, client_ip, {"reason": "User not found"})
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or password", headers={"WWW-Authenticate": "Bearer"})

    if user.role.upper() != Role.ADMIN.value:
        audit_logger.log_event("Failed_Admin_Login", form_data.username, client_ip, {"reason": "Invalid role for admin portal", "role": user.role})
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied. Admin privileges required.")

    if user.password_hash:
        if not verify_password(form_data.password, user.password_hash):
            audit_logger.log_event("Failed_Admin_Login", form_data.username, client_ip, {"reason": "Incorrect password"})
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or password", headers={"WWW-Authenticate": "Bearer"})
    else:
        # Default mock acceptance for unhashed seed accounts
        pass

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role}, expires_delta=access_token_expires
    )
    
    audit_logger.log_event("Admin_Login", user.email, client_ip, {})
    return {"access_token": access_token, "token_type": "bearer", "user": {"id": user.user_id, "name": user.name, "email": user.email, "role": user.role}}

@router.post("/logout")
def logout(payload_and_token: tuple = Depends(get_current_user_token_data)):
    payload, token = payload_and_token
    session_guard.invalidate_token(token)
    audit_logger.log_event("Admin_Logout", payload.get("sub"), "unknown", {})
    return {"message": "Successfully logged out"}

@router.get("/session")
def check_session(payload_and_token: tuple = Depends(get_current_user_token_data)):
    payload, _ = payload_and_token
    return {"valid": True, "user": payload.get("sub"), "role": payload.get("role")}
