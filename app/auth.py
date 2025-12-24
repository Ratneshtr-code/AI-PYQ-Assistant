# app/auth.py
"""
Authentication utilities: password hashing, SESSION-BASED auth (NO JWT TOKENS!)
"""
from datetime import datetime, timedelta
from typing import Optional
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status, Cookie
from sqlalchemy.orm import Session
import secrets
from app.database import get_db, User, Session as SessionModel, init_db

# Password hashing
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=12
)

# Session settings
SESSION_EXPIRE_HOURS = 24  # Sessions last 24 hours


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    # Defensive checks - ensure inputs are valid
    if not plain_password or not isinstance(plain_password, str):
        return False
    if not hashed_password or not isinstance(hashed_password, str):
        return False
    if not hashed_password.strip():
        return False
    
    # Ensure hashed_password looks like a valid bcrypt hash
    # Bcrypt hashes start with $2a$, $2b$, or $2y$ and are typically 60 chars
    if not (hashed_password.startswith("$2a$") or hashed_password.startswith("$2b$") or hashed_password.startswith("$2y$")):
        return False
    
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        # If verification fails for any reason (invalid hash, etc.), return False
        return False


def get_password_hash(password: str) -> str:
    """Hash a password"""
    # Ensure password is string and handle encoding
    if not isinstance(password, str):
        password = str(password)
    # Bcrypt has a 72-byte limit, but we'll let passlib handle truncation
    # Passwords longer than 72 bytes will be truncated automatically
    try:
        return pwd_context.hash(password)
    except ValueError as e:
        # If password is too long, truncate it
        if "longer than 72 bytes" in str(e).lower():
            password = password[:72]
            return pwd_context.hash(password)
        raise


def create_session(user_id: int, db: Session) -> str:
    """Create a new session and return session ID"""
    try:
        # Generate a secure random session ID
        session_id = secrets.token_urlsafe(32)
        
        # Set expiration
        expires_at = datetime.utcnow() + timedelta(hours=SESSION_EXPIRE_HOURS)
        
        # Create session in database
        session = SessionModel(
            session_id=session_id,
            user_id=user_id,
            expires_at=expires_at
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        
        return session_id
    except Exception as e:
        import logging
        logging.error(f"Error creating session: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create session. Please try again."
        )


def get_session_user(session_id: Optional[str], db: Session) -> Optional[User]:
    """Get user from session ID - SIMPLE and RELIABLE"""
    if not session_id:
        return None
    
    # Find session
    session = db.query(SessionModel).filter(
        SessionModel.session_id == session_id,
        SessionModel.expires_at > datetime.utcnow()
    ).first()
    
    if not session:
        return None
    
    # Get user
    user = db.query(User).filter(User.id == session.user_id).first()
    if not user or not user.is_active:
        return None
    
    return user


def delete_session(session_id: str, db: Session):
    """Delete a session (logout)"""
    db.query(SessionModel).filter(SessionModel.session_id == session_id).delete()
    db.commit()


async def get_current_user(
    session_id: Optional[str] = Cookie(None, alias="session_id"),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user from session cookie - SIMPLE!"""
    import logging
    logger = logging.getLogger(__name__)
    
    # Debug: Log if session_id is received
    if not session_id:
        logger.warning("No session_id cookie received in request - cookie may not be set or sent")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated - please log in again",
        )
    
    logger.info(f"Received session_id cookie: {session_id[:10]}...")
    user = get_session_user(session_id, db)
    if not user:
        logger.warning(f"Invalid or expired session: {session_id[:10]}... - checking database...")
        # Check if session exists but expired
        from app.database import Session as SessionModel
        session_check = db.query(SessionModel).filter(
            SessionModel.session_id == session_id
        ).first()
        if session_check:
            logger.warning(f"Session found but expired. Created: {session_check.created_at}, Expires: {session_check.expires_at}")
        else:
            logger.warning(f"Session not found in database")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session - please log in again",
        )
    
    logger.info(f"Session validated successfully for user {user.id}")
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get current active user"""
    return current_user
