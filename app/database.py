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
    custom_heading = Column(Text, nullable=True)  # User's custom heading/title for the note
    comments = Column(Text, nullable=True)  # User's comments on the note
    
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


class LLMExplanation(Base):
    """Production cache for LLM explanations - shared across all users"""
    __tablename__ = "llm_explanations"

    id = Column(Integer, primary_key=True, index=True)
    cache_key = Column(String, unique=True, nullable=False, index=True)  # Unique cache key
    question_id = Column(Integer, nullable=True, index=True)
    explanation_type = Column(String, nullable=False)  # "concept", "correct_option", "wrong_option"
    option_letter = Column(String, nullable=True)  # A, B, C, D
    is_correct = Column(Boolean, nullable=True)
    
    # LLM response data
    response_text = Column(Text, nullable=False)  # The actual explanation text
    model_name = Column(String, nullable=True)  # Model used (e.g., "gemini-2.0-flash-lite-001")
    
    # Metadata
    exam = Column(String, nullable=True, index=True)
    subject = Column(String, nullable=True)
    topic = Column(String, nullable=True)
    year = Column(Integer, nullable=True)
    
    # Usage tracking
    hit_count = Column(Integer, default=0)  # How many times this cache was used
    tokens_saved = Column(Integer, default=0)  # Estimated tokens saved (input + output)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    last_used_at = Column(DateTime, nullable=True, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class LLMUsageLog(Base):
    """Track LLM token usage per user for billing/limits"""
    __tablename__ = "llm_usage_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Request details
    question_id = Column(Integer, nullable=True, index=True)
    explanation_type = Column(String, nullable=False)  # "concept", "correct_option", "wrong_option"
    option_letter = Column(String, nullable=True)
    is_correct = Column(Boolean, nullable=True)
    
    # Token usage
    input_tokens = Column(Integer, default=0)  # Tokens in prompt
    output_tokens = Column(Integer, default=0)  # Tokens in response
    total_tokens = Column(Integer, default=0)  # input + output
    
    # Cost tracking (optional - can calculate from tokens)
    estimated_cost = Column(Float, default=0.0)  # Estimated cost in USD/INR
    
    # Cache status
    from_cache = Column(Boolean, default=False)  # Whether response came from cache
    cache_key = Column(String, nullable=True)  # Cache key if from cache
    
    # Model info
    model_name = Column(String, nullable=True)
    
    # Metadata
    exam = Column(String, nullable=True)
    subject = Column(String, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relationship
    user = relationship("User", backref="llm_usage_logs")


class PaymentOrderStatus(str, enum.Enum):
    """Payment order status"""
    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"
    REFUNDED = "refunded"
    CANCELLED = "cancelled"


class PaymentOrder(Base):
    """Payment orders for subscription purchases"""
    __tablename__ = "payment_orders"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(String, unique=True, nullable=False, index=True)  # Internal order ID
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    subscription_plan_id = Column(Integer, ForeignKey("subscription_plan_templates.id"), nullable=True)
    
    # Payment details
    amount = Column(Float, nullable=False)  # Amount in rupees
    currency = Column(String, default="INR", nullable=False)
    status = Column(SQLEnum(PaymentOrderStatus), default=PaymentOrderStatus.PENDING, nullable=False, index=True)
    
    # Razorpay details
    razorpay_order_id = Column(String, nullable=True, index=True)  # Razorpay order ID
    razorpay_payment_id = Column(String, nullable=True, index=True)  # Razorpay payment ID (after payment)
    razorpay_signature = Column(String, nullable=True)  # Payment signature for verification
    
    # Plan details
    plan_type = Column(SQLEnum(SubscriptionPlan), nullable=False)
    duration_months = Column(Integer, nullable=False)
    
    # Payment method
    payment_method = Column(String, nullable=True)  # "razorpay", "payu", etc.
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    payment_date = Column(DateTime, nullable=True)  # Payment completion time
    
    # Relationships
    user = relationship("User", backref="payment_orders")
    plan_template = relationship("SubscriptionPlanTemplate", backref="payment_orders")


class PaymentTransactionType(str, enum.Enum):
    """Payment transaction types"""
    PAYMENT = "payment"
    REFUND = "refund"


class PaymentTransactionStatus(str, enum.Enum):
    """Payment transaction status"""
    SUCCESS = "success"
    FAILED = "failed"
    PENDING = "pending"


class PaymentTransaction(Base):
    """Payment transactions log"""
    __tablename__ = "payment_transactions"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("payment_orders.id"), nullable=False, index=True)
    
    # Transaction details
    transaction_type = Column(SQLEnum(PaymentTransactionType), nullable=False)
    amount = Column(Float, nullable=False)  # Transaction amount
    status = Column(SQLEnum(PaymentTransactionStatus), nullable=False, index=True)
    
    # Razorpay transaction ID
    razorpay_payment_id = Column(String, nullable=True, index=True)
    
    # Transaction metadata (JSON string for additional data)
    # Note: Named 'transaction_metadata' to avoid conflict with SQLAlchemy's reserved 'metadata' attribute
    transaction_metadata = Column(Text, nullable=True)  # JSON string for additional transaction data
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relationship
    order = relationship("PaymentOrder", backref="transactions")
    
    def get_metadata(self) -> Optional[Dict[str, Any]]:
        """Parse and return metadata as dict"""
        if not self.transaction_metadata:
            return None
        try:
            return json.loads(self.transaction_metadata)
        except (json.JSONDecodeError, TypeError):
            return None
    
    def set_metadata(self, data: Dict[str, Any]):
        """Store metadata as JSON string"""
        self.transaction_metadata = json.dumps(data) if data else None


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

