from typing import Dict, Any
import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, crud, schemas
from app.security.security_gateway import require_role
from app.security.rbac import Role
from app.security.risk_scanner import risk_scanner
from pydantic import BaseModel

router = APIRouter(prefix="/api/employee/profile", tags=["Employee Profile"])

UPLOAD_DIR = os.path.join(os.getcwd(), "uploads", "profiles")
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_FILE_SIZE = 5 * 1024 * 1024

@router.get("")
def get_employee_profile(
    current_user: models.User = Depends(require_role(Role.EMPLOYEE))
) -> Dict[str, Any]:
    serialized = crud.serialize_user_profile(current_user)
    return {
        "user": serialized,
        **serialized,
    }

@router.patch("")
def update_employee_profile(
    profile_data: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(Role.EMPLOYEE))
) -> Dict[str, Any]:
    # Prevent employees from escalating their role
    profile_data.role = None 
    updated_user = crud.update_user_profile(db, current_user, profile_data)
    serialized = crud.serialize_user_profile(updated_user)
    return {
        "message": "Profile updated successfully",
        "user": serialized,
        **serialized,
    }

@router.post("/image")
async def update_profile_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(Role.EMPLOYEE))
) -> Dict[str, Any]:
    # Validate Content-Type
    content_type = (file.content_type or "").lower()
    filename = file.filename or "avatar.png"
    ext = os.path.splitext(filename)[1].lower()

    if ext not in ALLOWED_EXTENSIONS or (content_type and content_type not in ALLOWED_MIME_TYPES):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image format. Supported formats: JPG, PNG, WEBP.",
        )

    # Read and validate file size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Profile image exceeds maximum size of 5 MB.",
        )

    # Malware scanning layer
    scan_result = risk_scanner.scan_file(contents, filename)
    if not scan_result["allowed"]:
         raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Security scan failed: {', '.join(scan_result['reasons'])}"
         )

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    # Generate secure random filename
    unique_filename = f"avatar_{uuid.uuid4().hex[:12]}{ext if ext else '.png'}"
    target_path = os.path.join(UPLOAD_DIR, unique_filename)

    try:
        with open(target_path, "wb") as f:
            f.write(contents)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unable to write image file: {str(e)}",
        )

    relative_url = f"/uploads/profiles/{unique_filename}"
    crud.update_user_profile_image(db, current_user, relative_url)
    
    serialized = crud.serialize_user_profile(current_user)
    return {
        "message": "Profile image updated successfully.",
        "profileImage": relative_url,
        "profile_image": relative_url,
        "user": serialized,
        **serialized,
    }

@router.delete("/image")
def delete_profile_image(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(Role.EMPLOYEE))
) -> Dict[str, Any]:
    crud.update_user_profile_image(db, current_user, None)
    serialized = crud.serialize_user_profile(current_user)
    return {
        "message": "Profile image removed successfully",
        "profileImage": None,
        "profile_image": None,
        "user": serialized,
        **serialized,
    }
