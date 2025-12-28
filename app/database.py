# app/database.py
"""
Database models and setup for user authentication and subscriptions
"""
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, Enum as SQLEnum, Float, Text, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import enum
import json
from pathlib import Path
from typing import Optional, Dict, Any

# Database path
DB_PATH = Path(__file__).parent.parent / "data" / "ai_pyq.db"
DB_URL = f"sqlite:///{DB_PATH}"

# Create database directory if it doesn't exist
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

engine = create_engine(DB_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class SubscriptionPlan(str, enum.Enum):
    FREE = "free"
    PREMIUM = "premium"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True)  # Nullable for OAuth users
    full_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    subscription_plan = Column(SQLEnum(SubscriptionPlan), default=SubscriptionPlan.FREE)
    subscription_start_date = Column(DateTime, nullable=True)
    subscription_end_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # OAuth fields
    google_id = Column(String, unique=True, nullable=True, index=True)
    profile_picture_url = Column(String, nullable=True)


class Session(Base):
    """Simple session storage - no JWT tokens needed!"""
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, unique=True, index=True, nullable=False)
    user_id = Column(Integer, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)


class SubscriptionPlanTemplate(Base):
    """Subscription plan templates for admin management"""
    __tablename__ = "subscription_plan_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)  # e.g., "Monthly Premium", "Yearly Premium"
    plan_type = Column(SQLEnum(SubscriptionPlan), nullable=False)  # free or premium
    price = Column(Float, nullable=False)  # Price in rupees
    duration_months = Column(Integer, nullable=False)  # Duration in months
    is_active = Column(Boolean, default=True)  # Whether this template is active
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class NoteType(str, enum.Enum):
    QUESTION = "question"
    EXPLANATION = "explanation"


class UserNote(Base):
    """User saved notes - questions and explanations"""
    __tablename__ = "user_notes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    note_type = Column(SQLEnum(NoteType), nullable=False)
    
    # Question reference
    question_id = Column(Integer, nullable=True, index=True)  # References question from CSV
    
    # Question data stored as JSON string
    question_data = Column(Text, nullable=True)  # JSON string of full question data
    
    # Explanation data
    explanation_text = Column(Text, nullable=True)  # Full explanation text
    explanation_type = Column(String, nullable=True)  # "concept" | "option"
    option_letter = Column(String, nullable=True)  # A, B, C, D
    is_correct = Column(Boolean, nullable=True)
    
    # Metadata
    exam = Column(String, nullable=True, index=True)
    subject = Column(String, nullable=True, index=True)
    topic = Column(String, nullable=True)
    year = Column(Integer, nullable=True, index=True)
    
    # User customization
    tags = Column(Text, nullable=True)  # JSON array of tags
    custom_notes = Column(Text, nullable=True)  # User's personal notes
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    user = relationship("User", backref="notes")
    
    def get_question_data(self) -> Optional[Dict[str, Any]]:
        """Parse and return question_data as dict"""
        if not self.question_data:
            return None
        try:
            return json.loads(self.question_data)
        except (json.JSONDecodeError, TypeError):
            return None
    
    def set_question_data(self, data: Dict[str, Any]):
        """Store question_data as JSON string"""
        self.question_data = json.dumps(data) if data else None
    
    def get_tags(self) -> list:
        """Parse and return tags as list"""
        if not self.tags:
            return []
        try:
            return json.loads(self.tags)
        except (json.JSONDecodeError, TypeError):
            return []
    
    def set_tags(self, tags: list):
        """Store tags as JSON array"""
        self.tags = json.dumps(tags) if tags else None


def init_db():
    """Initialize database tables"""
    Base.metadata.create_all(bind=engine)


def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

