from datetime import datetime, timezone
from typing import Dict, Any

from fastapi import APIRouter, HTTPException, status, Depends
from bson import ObjectId

from .models_auth import UserRegisterRequest, UserLoginRequest, TokenResponse, UserResponse, BootstrapAdminRequest
from .auth import hash_password, verify_password, create_access_token, get_current_user, ADMIN_EMAIL, ADMIN_BOOTSTRAP_SECRET
from .database import users_collection, admin_logs_collection

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


# ============================================================
# REGISTER
# ============================================================

@router.post("/register", response_model=TokenResponse)
def register(request: UserRegisterRequest):
    if users_collection is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection is currently unavailable. Please try again in a few moments."
        )

    clean_email = request.email.strip().lower()
    clean_name = request.name.strip()

    if len(clean_name) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Name must be at least 2 characters."
        )

    if len(request.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters."
        )

    # Check for existing email
    existing = users_collection.find_one({"email": clean_email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists. Please log in."
        )

    # Assign role: Account matching ADMIN_EMAIL becomes admin; otherwise standard user
    role = "admin" if (clean_email == ADMIN_EMAIL) else "user"

    password_hash = hash_password(request.password)
    now = datetime.now(timezone.utc)

    user_doc = {
        "name": clean_name,
        "email": clean_email,
        "password_hash": password_hash,
        "role": role,
        "is_active": True,
        "created_at": now,
        "updated_at": now
    }

    insert_res = users_collection.insert_one(user_doc)
    user_id = str(insert_res.inserted_id)

    # Log registration in admin logs
    if admin_logs_collection is not None:
        try:
            admin_logs_collection.insert_one({
                "action": "user_registered",
                "user_id": user_id,
                "email": clean_email,
                "role": role,
                "created_at": now
            })
        except Exception:
            pass

    user_obj = UserResponse(
        id=user_id,
        name=clean_name,
        email=clean_email,
        role=role,
        created_at=now.isoformat(),
        is_active=True
    )

    access_token = create_access_token(data={"sub": user_id, "name": clean_name, "email": clean_email, "role": role})

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=user_obj
    )


# ============================================================
# LOGIN
# ============================================================

@router.post("/login", response_model=TokenResponse)
def login(request: UserLoginRequest):
    if users_collection is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection is currently unavailable. Please try again shortly."
        )

    clean_email = request.email.strip().lower()

    user = users_collection.find_one({"email": clean_email})
    if not user or not verify_password(request.password, user.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password. Please check your credentials.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated. Please contact an administrator."
        )

    user_id = str(user["_id"])
    role = user.get("role", "user")
    name = user.get("name", "User")
    created_at = user.get("created_at")
    created_at_str = created_at.isoformat() if isinstance(created_at, datetime) else str(created_at or "")

    user_obj = UserResponse(
        id=user_id,
        name=name,
        email=clean_email,
        role=role,
        created_at=created_at_str,
        is_active=True
    )

    access_token = create_access_token(data={"sub": user_id, "name": name, "email": clean_email, "role": role})

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=user_obj
    )


# ============================================================
# GET CURRENT USER PROFILE
# ============================================================

@router.get("/me", response_model=UserResponse)
def get_me(current_user: Dict[str, Any] = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        name=current_user["name"],
        email=current_user["email"],
        role=current_user.get("role", "user"),
        created_at=current_user.get("created_at"),
        is_active=current_user.get("is_active", True)
    )


# ============================================================
# BOOTSTRAP ADMIN (SECURE SERVER-SIDE PROMOTION)
# ============================================================

@router.post("/bootstrap-admin", response_model=UserResponse)
def bootstrap_admin(request: BootstrapAdminRequest):
    if users_collection is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection unavailable."
        )

    if not ADMIN_BOOTSTRAP_SECRET or request.secret.strip() != ADMIN_BOOTSTRAP_SECRET:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid bootstrap authorization secret."
        )

    clean_email = request.email.strip().lower()
    user = users_collection.find_one({"email": clean_email})

    now = datetime.now(timezone.utc)

    if user:
        users_collection.update_one(
            {"_id": user["_id"]},
            {"$set": {"role": "admin", "updated_at": now}}
        )
        return UserResponse(
            id=str(user["_id"]),
            name=user.get("name", "Admin"),
            email=clean_email,
            role="admin",
            created_at=user.get("created_at").isoformat() if isinstance(user.get("created_at"), datetime) else str(user.get("created_at", "")),
            is_active=True
        )
    else:
        if not request.password or len(request.password) < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password of at least 6 characters required to create new admin account."
            )

        password_hash = hash_password(request.password)
        new_admin = {
            "name": "System Administrator",
            "email": clean_email,
            "password_hash": password_hash,
            "role": "admin",
            "is_active": True,
            "created_at": now,
            "updated_at": now
        }
        res = users_collection.insert_one(new_admin)
        return UserResponse(
            id=str(res.inserted_id),
            name="System Administrator",
            email=clean_email,
            role="admin",
            created_at=now.isoformat(),
            is_active=True
        )
