# app/auth_api.py
"""
Authentication API endpoints: login, signup, logout, Google OAuth
"""
from fastapi import APIRouter, Depends, HTTPException, status, Cookie
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
from typing import Optional
import re

from app.database import get_db, User, SubscriptionPlan, init_db, Session as SessionModel
from app.auth import (
    verify_password,
    get_password_hash,
    create_session,
    delete_session,
    get_current_user,
    get_current_active_user,
)
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/auth", tags=["authentication"])


# Pydantic models
class UserSignUp(BaseModel):
    email: EmailStr
    username: str
    password: str
    full_name: Optional[str] = None


class UserLogin(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    """Simple login response - no tokens!"""
    user: dict
    message: str = "Login successful"


class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    full_name: Optional[str]
    subscription_plan: str
    is_admin: bool
    profile_picture_url: Optional[str]


class RefreshTokenRequest(BaseModel):
    refresh_token: str


# Validation helpers
def validate_password(password: str) -> bool:
    """Validate password strength"""
    if len(password) < 8:
        return False
    if not re.search(r"[A-Z]", password):
        return False
    if not re.search(r"[a-z]", password):
        return False
    if not re.search(r"\d", password):
        return False
    return True


def validate_username(username: str) -> bool:
    """Validate username"""
    if len(username) < 3 or len(username) > 20:
        return False
    if not re.match(r"^[a-zA-Z0-9_]+$", username):
        return False
    return True


@router.post("/signup", response_model=LoginResponse)
async def signup(user_data: UserSignUp, db: Session = Depends(get_db)):
    """User registration"""
    # Validate username
    if not validate_username(user_data.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username must be 3-20 characters and contain only letters, numbers, and underscores"
        )
    
    # Validate password
    if not validate_password(user_data.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters with uppercase, lowercase, and numbers"
        )
    
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check if username already exists
    existing_username = db.query(User).filter(User.username == user_data.username).first()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    # Create new user - ALWAYS set hashed_password (required for login)
    hashed_password = get_password_hash(user_data.password)
    
    # Verify password was hashed successfully
    if not hashed_password or not hashed_password.strip():
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to hash password. Please try again."
        )
    
    # Verify hash looks valid (bcrypt format)
    if not (hashed_password.startswith("$2a$") or hashed_password.startswith("$2b$") or hashed_password.startswith("$2y$")):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password hashing failed. Please try again."
        )
    
    new_user = User(
        email=user_data.email,
        username=user_data.username,
        hashed_password=hashed_password,  # REQUIRED - users without this cannot login
        full_name=user_data.full_name or user_data.username,
        subscription_plan=SubscriptionPlan.FREE,
        is_active=True
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Double-check user was created with password
    if not new_user.hashed_password:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user with password. Please try again."
        )
    
    # Create session - SIMPLE!
    session_id = create_session(new_user.id, db)
    
    # Create response
    response_data = LoginResponse(
        user={
            "id": new_user.id,
            "email": new_user.email,
            "username": new_user.username,
            "full_name": new_user.full_name,
            "subscription_plan": new_user.subscription_plan.value,
            "is_admin": new_user.is_admin,
            "profile_picture_url": new_user.profile_picture_url,
            "subscription_start_date": new_user.subscription_start_date.isoformat() if new_user.subscription_start_date else None,
            "subscription_end_date": new_user.subscription_end_date.isoformat() if new_user.subscription_end_date else None
        }
    )
    
    # Set session cookie
    response = JSONResponse(content=response_data.model_dump())
    # Set cookie - for localhost/127.0.0.1 with different ports, we need SameSite=None
    # But SameSite=None requires Secure=True (HTTPS), which we don't have in dev
    # So we'll use SameSite="lax" and hope it works, or we'll need to use a different approach
    # Actually, for localhost, browsers are more lenient - let's try without explicit domain
    # With Vite proxy, requests are same-origin, so we can use SameSite="lax"
    response.set_cookie(
        key="session_id",
        value=session_id,
        httponly=True,
        secure=False,  # Set to True in production with HTTPS
        samesite="lax",  # Works for same-origin requests (via Vite proxy)
        path="/",  # Make cookie available for all paths
        max_age=60 * 60 * 24  # 24 hours
        # Don't set domain - let browser handle it for localhost/127.0.0.1
    )
    
    # Log cookie setting for debugging
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Setting session cookie for user {new_user.id}, session_id: {session_id[:10]}...")
    
    return response


@router.post("/login", response_model=LoginResponse)
async def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """User login - Only registered users can login"""
    import logging
    logger = logging.getLogger(__name__)
    
    # Validate input - STRICT validation
    if not credentials.email or not credentials.password:
        logger.warning(f"Login attempt with missing credentials: email={bool(credentials.email)}, password={bool(credentials.password)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email and password are required"
        )
    
    # Trim and validate email format
    email = credentials.email.strip()
    if not email or "@" not in email:
        logger.warning(f"Login attempt with invalid email format: {email[:20]}...")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email format"
        )
    
    # Validate password is not empty
    if not credentials.password or len(credentials.password.strip()) == 0:
        logger.warning(f"Login attempt with empty password for email: {email[:20]}...")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password cannot be empty"
        )
    
    # Find user by email (case-insensitive)
    user = db.query(User).filter(User.email.ilike(email)).first()
    
    # Always return same error message for security (don't reveal if email exists)
    if not user:
        logger.warning(f"Login attempt with non-existent email: {email[:20]}...")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Log user found for debugging (without sensitive info)
    logger.info(f"Login attempt for existing user: {email[:20]}... (User ID: {user.id}, has_password: {bool(user.hashed_password)})")
    
    # Check if user is active
    if not user.is_active:
        logger.warning(f"Login attempt for inactive user: {email[:20]}...")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Please contact support."
        )
    
    # Verify user has a password (must be registered user, not OAuth-only)
    # This is CRITICAL - users without hashed_password cannot login via password
    # Check for None, empty string, or whitespace-only
    if not user.hashed_password or not user.hashed_password.strip():
        logger.warning(f"Login attempt for user without password hash: {email[:20]}... (hashed_password is None or empty)")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Additional validation: ensure hashed_password looks like a valid bcrypt hash
    # Bcrypt hashes start with $2a$, $2b$, or $2y$ and are 60 characters long
    hashed_pwd = user.hashed_password.strip()
    if not (hashed_pwd.startswith("$2a$") or hashed_pwd.startswith("$2b$") or hashed_pwd.startswith("$2y$")):
        logger.warning(f"Login attempt for user with invalid password hash format: {email[:20]}... (hash doesn't look like bcrypt)")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Verify password - STRICT validation (this is the final check)
    # This will return False if password doesn't match, or if hash is invalid
    try:
        password_valid = verify_password(credentials.password, user.hashed_password)
    except Exception as e:
        # If password verification fails due to invalid hash format, log and reject
        logger.error(f"Password verification error for user {email[:20]}...: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    if not password_valid:
        logger.warning(f"Login attempt with incorrect password for user: {email[:20]}...")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Log successful login (without sensitive data)
    logger.info(f"Successful login for user: {user.email} (ID: {user.id})")
    
    # Ensure sessions table exists (in case it wasn't created on startup)
    try:
        # Try to query the table - if it fails, the table doesn't exist
        db.query(SessionModel).limit(1).all()
    except Exception as table_error:
        # Table doesn't exist, create it
        logger.warning(f"Sessions table not found, initializing database: {str(table_error)}")
        try:
            init_db()
        except Exception as init_error:
            logger.error(f"Failed to initialize database: {str(init_error)}")
    
    # Create session - SIMPLE!
    try:
        session_id = create_session(user.id, db)
    except Exception as e:
        logger.error(f"Failed to create session for user {user.id}: {str(e)}")
        # Log the full traceback for debugging
        import traceback
        logger.error(f"Session creation traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create session: {str(e)}"
        )
    
    # Create response
    response_data = LoginResponse(
        user={
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "full_name": user.full_name,
            "subscription_plan": user.subscription_plan.value,
            "is_admin": user.is_admin,
            "profile_picture_url": user.profile_picture_url,
            "subscription_start_date": user.subscription_start_date.isoformat() if user.subscription_start_date else None,
            "subscription_end_date": user.subscription_end_date.isoformat() if user.subscription_end_date else None
        }
    )
    
    # Set session cookie
    response = JSONResponse(content=response_data.model_dump())
    # Set cookie - for localhost/127.0.0.1 with different ports, we need SameSite=None
    # But SameSite=None requires Secure=True (HTTPS), which we don't have in dev
    # So we'll use SameSite="lax" and hope it works, or we'll need to use a different approach
    # Actually, for localhost, browsers are more lenient - let's try without explicit domain
    # With Vite proxy, requests are same-origin, so we can use SameSite="lax"
    response.set_cookie(
        key="session_id",
        value=session_id,
        httponly=True,
        secure=False,  # Set to True in production with HTTPS
        samesite="lax",  # Works for same-origin requests (via Vite proxy)
        path="/",  # Make cookie available for all paths
        max_age=60 * 60 * 24  # 24 hours
        # Don't set domain - let browser handle it for localhost/127.0.0.1
    )
    
    # Log cookie setting for debugging
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Setting session cookie for user {user.id}, session_id: {session_id[:10]}...")
    
    return response


# Refresh endpoint removed - sessions are automatically managed via cookies


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    session_id: Optional[str] = Cookie(None, alias="session_id"),
    current_user: User = Depends(get_current_user)
):
    """Get current user information"""
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"/auth/me - session_id received: {bool(session_id)}, user_id: {current_user.id}")
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        full_name=current_user.full_name,
        subscription_plan=current_user.subscription_plan.value,
        is_admin=current_user.is_admin,
        profile_picture_url=current_user.profile_picture_url,
        subscription_start_date=current_user.subscription_start_date,
        subscription_end_date=current_user.subscription_end_date
    )


@router.post("/logout")
async def logout(
    session_id: Optional[str] = Cookie(None, alias="session_id"),
    db: Session = Depends(get_db)
):
    """Logout user - delete session"""
    if session_id:
        delete_session(session_id, db)
    
    # Clear cookie
    response = JSONResponse(content={"message": "Successfully logged out"})
    response.delete_cookie(key="session_id", path="/")
    return response


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    username: Optional[str] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


@router.put("/profile", response_model=UserResponse)
async def update_profile(
    profile_update: ProfileUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update current user's profile"""
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Profile update request for user {current_user.id}")
    # Update full_name if provided
    if profile_update.full_name is not None:
        current_user.full_name = profile_update.full_name.strip() if profile_update.full_name.strip() else None
    
    # Update username if provided
    if profile_update.username is not None:
        username = profile_update.username.strip()
        # Validate username
        if not validate_username(username):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username must be 3-20 characters and contain only letters, numbers, and underscores"
            )
        # Check if username already exists
        existing = db.query(User).filter(User.username == username, User.id != current_user.id).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already in use"
            )
        current_user.username = username
    
    current_user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(current_user)
    
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        full_name=current_user.full_name,
        subscription_plan=current_user.subscription_plan.value,
        is_admin=current_user.is_admin,
        profile_picture_url=current_user.profile_picture_url
    )


@router.put("/change-password")
async def change_password(
    password_change: PasswordChange,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Change user's password"""
    # Verify current password
    if not current_user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password cannot be changed for OAuth-only accounts"
        )
    
    if not verify_password(password_change.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect"
        )
    
    # Validate new password
    if not validate_password(password_change.new_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters with uppercase, lowercase, and numbers"
        )
    
    # Check that new password is different from current
    if verify_password(password_change.new_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from current password"
        )
    
    # Update password
    current_user.hashed_password = get_password_hash(password_change.new_password)
    current_user.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Password changed successfully"}


class SubscriptionUpgrade(BaseModel):
    plan: str  # "premium" or "free"
    months: int = 1  # Number of months for subscription


@router.put("/subscription", response_model=UserResponse)
async def upgrade_subscription(
    subscription: SubscriptionUpgrade,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Upgrade or downgrade user subscription"""
    from datetime import timedelta
    
    # Validate plan
    try:
        plan = SubscriptionPlan(subscription.plan.lower())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid subscription plan: {subscription.plan}"
        )
    
    # Update subscription
    current_user.subscription_plan = plan
    
    if plan == SubscriptionPlan.PREMIUM:
        # Set subscription dates
        current_user.subscription_start_date = datetime.utcnow()
        current_user.subscription_end_date = datetime.utcnow() + timedelta(days=subscription.months * 30)
    else:
        # Downgrade to free
        current_user.subscription_start_date = None
        current_user.subscription_end_date = None
    
    current_user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(current_user)
    
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        full_name=current_user.full_name,
        subscription_plan=current_user.subscription_plan.value,
        is_admin=current_user.is_admin,
        profile_picture_url=current_user.profile_picture_url,
        subscription_start_date=current_user.subscription_start_date,
        subscription_end_date=current_user.subscription_end_date
    )


# Google OAuth endpoints (placeholder - requires Google OAuth setup)
# Test endpoint to check cookie handling
@router.get("/test-cookie")
async def test_cookie(session_id: Optional[str] = Cookie(None, alias="session_id")):
    """Test endpoint to verify cookies are being sent"""
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Test cookie endpoint - session_id received: {bool(session_id)}")
    return {
        "cookie_received": bool(session_id),
        "session_id_preview": session_id[:10] + "..." if session_id else None
    }


@router.get("/google")
async def google_auth():
    """Initiate Google OAuth flow"""
    # TODO: Implement Google OAuth
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Google OAuth not yet implemented"
    )


@router.get("/google/callback")
async def google_callback():
    """Google OAuth callback"""
    # TODO: Implement Google OAuth callback
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Google OAuth not yet implemented"
    )

