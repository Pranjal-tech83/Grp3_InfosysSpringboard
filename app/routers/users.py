import os
import uuid
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..database import get_db

router = APIRouter(prefix="/api/users", tags=["Users"])

UPLOAD_DIR = os.path.join(os.getcwd(), "uploads", "profiles")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


# ---------- Current Authenticated User Endpoints (/me) ----------

@router.get("/me")
def get_current_user_profile(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Fetch the currently authenticated user's profile information.
    Auto-creates default Support Agent if database is fresh.
    """
    user = crud.get_or_create_authenticated_user(db)
    return crud.serialize_user_profile(user)


@router.patch("/me")
def update_current_user_profile(
    payload: schemas.UserUpdate,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Update profile details (name, department, phone, bio) for authenticated user.
    """
    user = crud.get_or_create_authenticated_user(db)
    updated_user = crud.update_user_profile(db, user, payload)
    return {
        "message": "Profile updated successfully",
        "user": crud.serialize_user_profile(updated_user),
        **crud.serialize_user_profile(updated_user),
    }


@router.post("/me/profile-image")
async def upload_profile_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Upload and attach a new profile avatar image for the authenticated user.
    Validates format, size, securely persists to disk, and updates database record.
    """
    user = crud.get_or_create_authenticated_user(db)

    # Validate Content-Type
    content_type = (file.content_type or "").lower()
    filename = file.filename or "avatar.png"
    ext = os.path.splitext(filename)[1].lower()

    if ext not in ALLOWED_EXTENSIONS or (content_type and content_type not in ALLOWED_MIME_TYPES):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image format. Supported formats: JPG, PNG, WebP, GIF.",
        )

    # Read and validate file size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Profile image exceeds maximum size of 5 MB.",
        )

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
    crud.update_user_profile_image(db, user, relative_url)

    serialized = crud.serialize_user_profile(user)
    return {
        "message": "Profile image updated successfully.",
        "profileImage": relative_url,
        "profile_image": relative_url,
        "user": serialized,
        **serialized,
    }


@router.delete("/me/profile-image")
def remove_profile_image(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Remove the authenticated user's custom profile avatar and revert to initials.
    """
    user = crud.get_or_create_authenticated_user(db)
    
    # Try deleting previous file if exists on disk
    if user.profile_image and user.profile_image.startswith("/uploads/profiles/"):
        fname = os.path.basename(user.profile_image)
        fpath = os.path.join(UPLOAD_DIR, fname)
        if os.path.exists(fpath):
            try:
                os.remove(fpath)
            except Exception:
                pass

    crud.update_user_profile_image(db, user, None)
    serialized = crud.serialize_user_profile(user)
    return {
        "message": "Profile image removed successfully.",
        "profileImage": None,
        "profile_image": None,
        "user": serialized,
        **serialized,
    }


@router.post("/me/change-email")
def change_account_email(
    payload: schemas.ChangeEmailRequest,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Validate and update primary account email for the authenticated user.
    """
    new_em = payload.new_email.strip().lower()
    conf_em = payload.confirm_email.strip().lower()

    if new_em != conf_em:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New email address and confirmation email do not match.",
        )

    user = crud.get_or_create_authenticated_user(db)

    # Check if another user with this email already exists
    existing = crud.get_user_by_email(db, new_em)
    if existing and existing.user_id != user.user_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user account with this email address already exists.",
        )

    crud.update_user_email(db, user, new_em)
    serialized = crud.serialize_user_profile(user)
    return {
        "message": "Email verification confirmed. Account email updated successfully.",
        "email": new_em,
        "emailVerified": True,
        "email_verified": True,
        "user": serialized,
        **serialized,
    }


# ---------- Standard User CRUD Endpoints ----------

@router.post("", response_model=schemas.UserOut, status_code=201)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    if crud.get_user_by_email(db, user.email):
        raise HTTPException(status_code=409, detail="A user with this email already exists")
    return crud.create_user(db, user)


@router.get("", response_model=list[schemas.UserOut])
def list_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.list_users(db, skip, limit)


@router.get("/{user_id}", response_model=schemas.UserOut)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = crud.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
