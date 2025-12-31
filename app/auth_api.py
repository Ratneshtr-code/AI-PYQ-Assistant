# app/auth_api.py
"""
Authentication API endpoints: login, signup, logout, Google OAuth
"""
from fastapi import APIRouter, Depends, HTTPException, status, Cookie, Request
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import RedirectResponse, JSONResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
from typing import Optional
import re
import os
import secrets
from urllib.parse import urlencode
import httpx
from dotenv import load_dotenv

load_dotenv()

from app.database import get_db, User, SubscriptionPlan, init_db, Session as SessionModel, EmailVerification, PasswordResetToken
from app.email_service import send_otp_email, send_password_reset_email
from app.auth import (
    verify_password,
    get_password_hash,
    create_session,
    delete_session,
    get_current_user,
    get_current_active_user,
)

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
    mobile_number: Optional[str] = None
    preferred_language: Optional[str] = "en"
    subscription_plan: str
    is_admin: bool
    profile_picture_url: Optional[str]
    current_subscription_plan_template_id: Optional[int] = None  # ID of the current active plan template
    email_verified: bool = False


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
        is_active=True,
        email_verified=False,  # Email not verified yet
        email_verification_sent_at=datetime.utcnow()
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
    
    # Generate and send OTP
    import random
    otp_code = str(random.randint(100000, 999999))  # 6-digit OTP
    
    # Store OTP in database
    expires_at = datetime.utcnow() + timedelta(minutes=15)
    email_verification = EmailVerification(
        user_id=new_user.id,
        email=new_user.email,
        otp_code=otp_code,
        expires_at=expires_at
    )
    db.add(email_verification)
    db.commit()
    
    # Send OTP email
    import logging
    logger = logging.getLogger(__name__)
    email_sent = send_otp_email(new_user.email, otp_code, new_user.username)
    if not email_sent:
        logger.warning(f"Failed to send OTP email to {new_user.email}, but user was created")
    
    # Return response indicating email verification is required
    return JSONResponse(
        status_code=status.HTTP_201_CREATED,
        content={
            "message": "Account created successfully. Please verify your email address.",
            "user_id": new_user.id,
            "email": new_user.email,
            "requires_verification": True
        }
    )


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
    
    # Check if email is verified (only for password-based accounts)
    if user.hashed_password and not user.email_verified:
        logger.warning(f"Login attempt with unverified email: {email[:20]}...")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email address before logging in. Check your inbox for the verification code."
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
            "current_subscription_plan_template_id": user.current_subscription_plan_template_id,
            "subscription_start_date": user.subscription_start_date.isoformat() if user.subscription_start_date else None,
            "subscription_end_date": user.subscription_end_date.isoformat() if user.subscription_end_date else None,
            "email_verified": user.email_verified
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
        mobile_number=current_user.mobile_number,
        preferred_language=current_user.preferred_language,
        subscription_plan=current_user.subscription_plan.value,
        is_admin=current_user.is_admin,
        profile_picture_url=current_user.profile_picture_url,
        current_subscription_plan_template_id=current_user.current_subscription_plan_template_id,
        subscription_start_date=current_user.subscription_start_date,
        subscription_end_date=current_user.subscription_end_date,
        email_verified=current_user.email_verified
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
    mobile_number: Optional[str] = None
    preferred_language: Optional[str] = None


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
    
    # Update mobile_number if provided
    if profile_update.mobile_number is not None:
        mobile_number = profile_update.mobile_number.strip() if profile_update.mobile_number.strip() else None
        # Basic validation: should be digits only, 10-15 digits (international format)
        if mobile_number and not re.match(r"^\+?[1-9]\d{9,14}$", mobile_number):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mobile number must be 10-15 digits (international format with + prefix allowed)"
            )
        current_user.mobile_number = mobile_number
    
    # Update preferred_language if provided
    if profile_update.preferred_language is not None:
        # Validate language code - currently only English and Hindi are supported
        valid_languages = ["en", "hi"]
        language = profile_update.preferred_language.strip().lower()
        if language and language not in valid_languages:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid language code. Supported languages: English (en), Hindi (hi)"
            )
        current_user.preferred_language = language if language else "en"
    
    current_user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(current_user)
    
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        full_name=current_user.full_name,
        mobile_number=current_user.mobile_number,
        preferred_language=current_user.preferred_language,
        subscription_plan=current_user.subscription_plan.value,
        is_admin=current_user.is_admin,
        profile_picture_url=current_user.profile_picture_url,
        current_subscription_plan_template_id=current_user.current_subscription_plan_template_id,
        email_verified=current_user.email_verified
    )


@router.get("/supported-languages")
async def get_supported_languages():
    """
    Get list of supported languages
    Currently supporting: English and Hindi only
    """
    languages = [
        {"code": "en", "name": "English"},
        {"code": "hi", "name": "Hindi"},
    ]
    return {"languages": languages}


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
        mobile_number=current_user.mobile_number,
        preferred_language=current_user.preferred_language,
        subscription_plan=current_user.subscription_plan.value,
        is_admin=current_user.is_admin,
        profile_picture_url=current_user.profile_picture_url,
        current_subscription_plan_template_id=current_user.current_subscription_plan_template_id,
        subscription_start_date=current_user.subscription_start_date,
        subscription_end_date=current_user.subscription_end_date,
        email_verified=current_user.email_verified
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


# Email verification and password reset models
class VerifyEmailRequest(BaseModel):
    user_id: int
    otp_code: str


class ResendOTPRequest(BaseModel):
    email: str


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


@router.post("/verify-email")
async def verify_email(verify_data: VerifyEmailRequest, db: Session = Depends(get_db)):
    """Verify email address with OTP code"""
    import logging
    logger = logging.getLogger(__name__)
    
    # Find user
    user = db.query(User).filter(User.id == verify_data.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user.email_verified:
        return JSONResponse(
            content={"message": "Email already verified", "verified": True}
        )
    
    # Find valid OTP
    verification = db.query(EmailVerification).filter(
        EmailVerification.user_id == verify_data.user_id,
        EmailVerification.otp_code == verify_data.otp_code,
        EmailVerification.expires_at > datetime.utcnow(),
        EmailVerification.verified_at == None
    ).first()
    
    if not verification:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP code"
        )
    
    # Mark as verified
    verification.verified_at = datetime.utcnow()
    user.email_verified = True
    db.commit()
    
    logger.info(f"Email verified for user {user.id}")
    
    # Create session now that email is verified
    session_id = create_session(user.id, db)
    
    response_data = {
        "message": "Email verified successfully",
        "user": {
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "full_name": user.full_name,
            "subscription_plan": user.subscription_plan.value,
            "is_admin": user.is_admin,
            "profile_picture_url": user.profile_picture_url,
            "current_subscription_plan_template_id": user.current_subscription_plan_template_id,
            "subscription_start_date": user.subscription_start_date.isoformat() if user.subscription_start_date else None,
            "subscription_end_date": user.subscription_end_date.isoformat() if user.subscription_end_date else None,
            "email_verified": True
        }
    }
    
    response = JSONResponse(content=response_data)
    response.set_cookie(
        key="session_id",
        value=session_id,
        httponly=True,
        secure=False,
        samesite="lax",
        path="/",
        max_age=60 * 60 * 24
    )
    
    return response


@router.post("/resend-otp")
async def resend_otp(resend_data: ResendOTPRequest, db: Session = Depends(get_db)):
    """Resend OTP verification code"""
    import logging
    logger = logging.getLogger(__name__)
    
    # Find user by email
    user = db.query(User).filter(User.email == resend_data.email).first()
    if not user:
        # Don't reveal if email exists
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "If the email exists, a new OTP has been sent."}
        )
    
    if user.email_verified:
        return JSONResponse(
            content={"message": "Email already verified"}
        )
    
    # Rate limiting: Check how many OTPs sent in last hour
    one_hour_ago = datetime.utcnow() - timedelta(hours=1)
    recent_otps = db.query(EmailVerification).filter(
        EmailVerification.user_id == user.id,
        EmailVerification.created_at > one_hour_ago
    ).count()
    
    if recent_otps >= 3:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many OTP requests. Please wait before requesting another."
        )
    
    # Generate new OTP
    import random
    otp_code = str(random.randint(100000, 999999))
    
    # Invalidate old OTPs
    db.query(EmailVerification).filter(
        EmailVerification.user_id == user.id,
        EmailVerification.verified_at == None
    ).update({"verified_at": datetime.utcnow()})  # Mark as used
    
    # Create new OTP
    expires_at = datetime.utcnow() + timedelta(minutes=15)
    email_verification = EmailVerification(
        user_id=user.id,
        email=user.email,
        otp_code=otp_code,
        expires_at=expires_at
    )
    db.add(email_verification)
    user.email_verification_sent_at = datetime.utcnow()
    db.commit()
    
    # Send OTP email
    email_sent = send_otp_email(user.email, otp_code, user.username)
    if not email_sent:
        logger.warning(f"Failed to send OTP email to {user.email}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send OTP email. Please try again later."
        )
    
    return JSONResponse(
        content={"message": "OTP code has been sent to your email address"}
    )


@router.post("/forgot-password")
async def forgot_password(forgot_data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Request password reset"""
    import logging
    logger = logging.getLogger(__name__)
    
    # Find user by email
    user = db.query(User).filter(User.email == forgot_data.email).first()
    if not user:
        # Don't reveal if email exists (security best practice)
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "If the email exists, a password reset link has been sent."}
        )
    
    # Check if user has a password (not OAuth-only)
    if not user.hashed_password:
        # Don't reveal if email exists
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "If the email exists, a password reset link has been sent."}
        )
    
    # Rate limiting: Check how many reset tokens created in last hour
    one_hour_ago = datetime.utcnow() - timedelta(hours=1)
    recent_tokens = db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.created_at > one_hour_ago
    ).count()
    
    if recent_tokens >= 3:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many password reset requests. Please wait before requesting another."
        )
    
    # Generate secure reset token
    reset_token = secrets.token_urlsafe(32)
    
    # Invalidate old unused tokens
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used_at == None
    ).update({"used_at": datetime.utcnow()})
    
    # Create new reset token
    expires_at = datetime.utcnow() + timedelta(hours=1)
    reset_token_obj = PasswordResetToken(
        user_id=user.id,
        token=reset_token,
        expires_at=expires_at
    )
    db.add(reset_token_obj)
    db.commit()
    
    # Send reset email
    email_sent = send_password_reset_email(user.email, reset_token, user.username)
    if not email_sent:
        logger.warning(f"Failed to send password reset email to {user.email}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send password reset email. Please try again later."
        )
    
    return JSONResponse(
        content={"message": "If the email exists, a password reset link has been sent."}
    )


@router.post("/reset-password")
async def reset_password(reset_data: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Reset password with token"""
    import logging
    logger = logging.getLogger(__name__)
    
    # Find valid reset token
    reset_token_obj = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == reset_data.token,
        PasswordResetToken.expires_at > datetime.utcnow(),
        PasswordResetToken.used_at == None
    ).first()
    
    if not reset_token_obj:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    # Get user
    user = db.query(User).filter(User.id == reset_token_obj.user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reset token"
        )
    
    # Validate new password
    if not validate_password(reset_data.new_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters with uppercase, lowercase, and numbers"
        )
    
    # Check that new password is different from current
    if verify_password(reset_data.new_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from current password"
        )
    
    # Update password
    user.hashed_password = get_password_hash(reset_data.new_password)
    user.updated_at = datetime.utcnow()
    
    # Mark token as used
    reset_token_obj.used_at = datetime.utcnow()
    
    db.commit()
    
    logger.info(f"Password reset successful for user {user.id}")
    
    return JSONResponse(
        content={"message": "Password reset successfully. You can now login with your new password."}
    )


# Google OAuth configuration
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/google/callback")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"


@router.get("/google")
async def google_auth():
    """Initiate Google OAuth flow"""
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google OAuth not configured. Please set GOOGLE_CLIENT_ID environment variable."
        )
    
    # Generate state for CSRF protection
    state = secrets.token_urlsafe(32)
    
    # Store state in session (in production, use Redis or similar)
    # For now, we'll pass it in the redirect and verify it in callback
    
    # Build authorization URL
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "online",
        "prompt": "select_account"
    }
    
    auth_url = f"{GOOGLE_AUTH_URL}?{urlencode(params)}"
    
    # Redirect to Google
    response = RedirectResponse(url=auth_url)
    # Store state in cookie for verification
    response.set_cookie(
        key="oauth_state",
        value=state,
        httponly=True,
        secure=False,  # Set to True in production with HTTPS
        samesite="lax",
        max_age=600  # 10 minutes
    )
    return response


@router.get("/google/callback")
async def google_callback(
    request: Request,
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Google OAuth callback"""
    import logging
    logger = logging.getLogger(__name__)
    
    if error:
        logger.error(f"Google OAuth error: {error}")
        return RedirectResponse(url=f"{FRONTEND_URL}/login?error=oauth_error")
    
    if not code:
        logger.error("No authorization code received from Google")
        return RedirectResponse(url=f"{FRONTEND_URL}/login?error=no_code")
    
    # Verify state (CSRF protection)
    oauth_state = request.cookies.get("oauth_state")
    if not oauth_state or oauth_state != state:
        logger.error("Invalid OAuth state - possible CSRF attack")
        return RedirectResponse(url=f"{FRONTEND_URL}/login?error=invalid_state")
    
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        logger.error("Google OAuth credentials not configured")
        return RedirectResponse(url=f"{FRONTEND_URL}/login?error=config_error")
    
    try:
        # Exchange authorization code for access token
        token_data = {
            "code": code,
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri": GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code"
        }
        
        async with httpx.AsyncClient() as client:
            token_response = await client.post(GOOGLE_TOKEN_URL, data=token_data)
            token_response.raise_for_status()
            tokens = token_response.json()
        
        access_token = tokens.get("access_token")
        if not access_token:
            logger.error("No access token received from Google")
            return RedirectResponse(url=f"{FRONTEND_URL}/login?error=no_token")
        
        # Get user info from Google
        headers = {"Authorization": f"Bearer {access_token}"}
        async with httpx.AsyncClient() as client:
            userinfo_response = await client.get(GOOGLE_USERINFO_URL, headers=headers)
            userinfo_response.raise_for_status()
            userinfo = userinfo_response.json()
        
        google_id = userinfo.get("id")
        email = userinfo.get("email")
        name = userinfo.get("name", "")
        picture = userinfo.get("picture")
        
        if not google_id or not email:
            logger.error("Invalid user info from Google")
            return RedirectResponse(url=f"{FRONTEND_URL}/login?error=invalid_userinfo")
        
        # Check if user exists with this Google ID
        user = db.query(User).filter(User.google_id == google_id).first()
        
        if not user:
            # Check if user exists with this email (account linking)
            user = db.query(User).filter(User.email == email).first()
            
            if user:
                # Link Google account to existing user
                user.google_id = google_id
                user.profile_picture_url = picture
                if not user.full_name and name:
                    user.full_name = name
                db.commit()
                logger.info(f"Linked Google account to existing user {user.id}")
            else:
                # Create new user
                # Generate username from email
                username_base = email.split("@")[0]
                username = username_base
                counter = 1
                while db.query(User).filter(User.username == username).first():
                    username = f"{username_base}{counter}"
                    counter += 1
                
                user = User(
                    email=email,
                    username=username,
                    full_name=name or username,
                    google_id=google_id,
                    profile_picture_url=picture,
                    subscription_plan=SubscriptionPlan.FREE,
                    is_active=True,
                    email_verified=True,  # Google emails are pre-verified
                    hashed_password=None  # OAuth-only user
                )
                db.add(user)
                db.commit()
                db.refresh(user)
                logger.info(f"Created new user via Google OAuth: {user.id}")
        
        # Check if user is active
        if not user.is_active:
            logger.warning(f"Login attempt for inactive user: {user.id}")
            return RedirectResponse(url=f"{FRONTEND_URL}/login?error=inactive_account")
        
        # Create session
        session_id = create_session(user.id, db)
        
        # Redirect to frontend with success
        response = RedirectResponse(url=f"{FRONTEND_URL}/exam-dashboard")
        response.set_cookie(
            key="session_id",
            value=session_id,
            httponly=True,
            secure=False,  # Set to True in production with HTTPS
            samesite="lax",
            path="/",
            max_age=60 * 60 * 24  # 24 hours
        )
        # Clear OAuth state cookie
        response.delete_cookie(key="oauth_state", path="/")
        
        return response
    
    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error during Google OAuth: {str(e)}")
        return RedirectResponse(url=f"{FRONTEND_URL}/login?error=oauth_error")
    except Exception as e:
        logger.error(f"Error during Google OAuth callback: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return RedirectResponse(url=f"{FRONTEND_URL}/login?error=oauth_error")

