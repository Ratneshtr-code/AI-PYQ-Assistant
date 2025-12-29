# app/payment_service.py
"""
Payment service for handling Razorpay integration and payment processing
"""
import os
import hashlib
import hmac
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session
from pathlib import Path

from app.database import (
    PaymentOrder, PaymentOrderStatus, PaymentTransaction, 
    PaymentTransactionType, PaymentTransactionStatus,
    User, SubscriptionPlan, SubscriptionPlanTemplate
)

logger = logging.getLogger(__name__)

# Load config.yaml for PAYMENT_MODE
def _load_payment_mode_from_config():
    """Load PAYMENT_MODE from config.yaml, fallback to env"""
    try:
        from utils.config_loader import load_config
        config = load_config()
        payment_config = config.get("payment", {})
        return payment_config.get("mode", os.getenv("PAYMENT_MODE", "test")).lower()
    except Exception as e:
        logger.debug(f"Could not load config.yaml, using env: {e}")
        return os.getenv("PAYMENT_MODE", "test").lower()

# Payment configuration
# Razorpay keys from .env (set when you get Razorpay account)
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")
RAZORPAY_WEBHOOK_SECRET = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")

# PAYMENT_MODE from config.yaml (or .env as fallback)
PAYMENT_MODE = _load_payment_mode_from_config()

# Check if payment gateway is configured
IS_PAYMENT_CONFIGURED = bool(RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET)
IS_TEST_MODE = PAYMENT_MODE == "test" or not IS_PAYMENT_CONFIGURED


def get_razorpay_client():
    """Get Razorpay client instance"""
    if not IS_PAYMENT_CONFIGURED:
        return None
    
    try:
        # Try to import razorpay - optional for test mode
        try:
            import razorpay
        except ImportError:
            if IS_TEST_MODE:
                logger.debug("Razorpay package not installed - OK for test mode")
            else:
                logger.warning("Razorpay package not installed - install with: pip install razorpay")
            return None
        
        client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
        return client
    except Exception as e:
        logger.error(f"Failed to initialize Razorpay client: {e}")
        return None


def generate_order_id() -> str:
    """Generate unique order ID"""
    import uuid
    return f"order_{uuid.uuid4().hex[:16]}"


def create_razorpay_order(
    amount: float,
    currency: str = "INR",
    receipt: Optional[str] = None,
    notes: Optional[Dict[str, Any]] = None
) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    """
    Create Razorpay order
    
    Returns:
        Tuple of (order_data, error_message)
    """
    if IS_TEST_MODE or not IS_PAYMENT_CONFIGURED:
        # Mock order for testing
        mock_order_id = f"order_mock_{generate_order_id()}"
        return {
            "id": mock_order_id,
            "amount": int(amount * 100),  # Amount in paise
            "currency": currency,
            "status": "created",
            "created_at": int(datetime.utcnow().timestamp())
        }, None
    
    client = get_razorpay_client()
    if not client:
        return None, "Payment gateway not configured"
    
    try:
        order_data = client.order.create({
            "amount": int(amount * 100),  # Convert to paise
            "currency": currency,
            "receipt": receipt or generate_order_id(),
            "notes": notes or {}
        })
        return order_data, None
    except Exception as e:
        logger.error(f"Failed to create Razorpay order: {e}")
        return None, str(e)


def verify_payment_signature(
    razorpay_order_id: str,
    razorpay_payment_id: str,
    razorpay_signature: str
) -> bool:
    """
    Verify Razorpay payment signature
    
    Args:
        razorpay_order_id: Razorpay order ID
        razorpay_payment_id: Razorpay payment ID
        razorpay_signature: Payment signature from Razorpay
    
    Returns:
        True if signature is valid, False otherwise
    """
    if IS_TEST_MODE or not IS_PAYMENT_CONFIGURED:
        # In test mode, accept mock signatures
        if razorpay_signature.startswith("mock_"):
            return True
        # For testing, accept any signature if we're in test mode
        return True
    
    if not RAZORPAY_KEY_SECRET:
        logger.warning("Razorpay key secret not configured, cannot verify signature")
        return False
    
    try:
        message = f"{razorpay_order_id}|{razorpay_payment_id}"
        generated_signature = hmac.new(
            RAZORPAY_KEY_SECRET.encode(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(generated_signature, razorpay_signature)
    except Exception as e:
        logger.error(f"Error verifying payment signature: {e}")
        return False


def verify_webhook_signature(
    payload: str,
    signature: str
) -> bool:
    """
    Verify Razorpay webhook signature
    
    Args:
        payload: Webhook payload (as string)
        signature: Webhook signature from headers
    
    Returns:
        True if signature is valid, False otherwise
    """
    if IS_TEST_MODE or not IS_PAYMENT_CONFIGURED:
        return True  # Accept in test mode
    
    if not RAZORPAY_WEBHOOK_SECRET:
        logger.warning("Webhook secret not configured")
        return False
    
    try:
        generated_signature = hmac.new(
            RAZORPAY_WEBHOOK_SECRET.encode(),
            payload.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(generated_signature, signature)
    except Exception as e:
        logger.error(f"Error verifying webhook signature: {e}")
        return False


def create_payment_order(
    db: Session,
    user_id: int,
    amount: float,
    plan_type: SubscriptionPlan,
    duration_months: int,
    subscription_plan_id: Optional[int] = None,
    payment_method: str = "razorpay"
) -> Tuple[Optional[PaymentOrder], Optional[str]]:
    """
    Create payment order in database and Razorpay
    
    Returns:
        Tuple of (payment_order, error_message)
    """
    try:
        # Generate internal order ID
        order_id = generate_order_id()
        
        # Create Razorpay order
        notes = {
            "user_id": str(user_id),
            "plan_type": plan_type.value,
            "duration_months": str(duration_months)
        }
        razorpay_order, error = create_razorpay_order(
            amount=amount,
            currency="INR",
            receipt=order_id,
            notes=notes
        )
        
        if error and not IS_TEST_MODE:
            return None, error
        
        # Create payment order in database
        payment_order = PaymentOrder(
            order_id=order_id,
            user_id=user_id,
            subscription_plan_id=subscription_plan_id,
            amount=amount,
            currency="INR",
            status=PaymentOrderStatus.PENDING,
            razorpay_order_id=razorpay_order.get("id") if razorpay_order else None,
            plan_type=plan_type,
            duration_months=duration_months,
            payment_method=payment_method
        )
        
        db.add(payment_order)
        db.commit()
        db.refresh(payment_order)
        
        logger.info(f"Payment order created successfully: {payment_order.order_id}")
        return payment_order, None
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create payment order: {e}", exc_info=True)
        return None, f"Database error: {str(e)}"


def process_payment_success(
    db: Session,
    payment_order: PaymentOrder,
    razorpay_payment_id: str,
    razorpay_signature: str
) -> Tuple[bool, Optional[str]]:
    """
    Process successful payment
    
    Returns:
        Tuple of (success, error_message)
    """
    try:
        # Verify signature (skip in test mode)
        if not IS_TEST_MODE:
            if not verify_payment_signature(
                payment_order.razorpay_order_id or "",
                razorpay_payment_id,
                razorpay_signature
            ):
                return False, "Invalid payment signature"
        else:
            # In test mode, log that we're skipping signature verification
            logger.info(f"Test mode: Skipping signature verification for order {payment_order.order_id}")
        
        # Check if already processed
        if payment_order.status == PaymentOrderStatus.PAID:
            logger.warning(f"Payment order {payment_order.order_id} already processed")
            return True, None
        
        # Update payment order
        payment_order.status = PaymentOrderStatus.PAID
        payment_order.razorpay_payment_id = razorpay_payment_id
        payment_order.razorpay_signature = razorpay_signature
        payment_order.payment_date = datetime.utcnow()
        
        # Create transaction record
        transaction = PaymentTransaction(
            order_id=payment_order.id,
            transaction_type=PaymentTransactionType.PAYMENT,
            amount=payment_order.amount,
            status=PaymentTransactionStatus.SUCCESS,
            razorpay_payment_id=razorpay_payment_id
        )
        db.add(transaction)
        
        # Update user subscription
        user = db.query(User).filter(User.id == payment_order.user_id).first()
        if user:
            user.subscription_plan = payment_order.plan_type
            user.subscription_start_date = datetime.utcnow()
            user.subscription_end_date = datetime.utcnow() + timedelta(days=payment_order.duration_months * 30)
            # Store the plan template ID so we can identify which specific plan (Quarterly, Half Yearly, etc.)
            user.current_subscription_plan_template_id = payment_order.subscription_plan_id
            user.updated_at = datetime.utcnow()
        
        db.commit()
        
        logger.info(f"Payment processed successfully for order {payment_order.order_id}")
        return True, None
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to process payment success: {e}")
        return False, str(e)


def process_payment_failure(
    db: Session,
    payment_order: PaymentOrder,
    error_message: Optional[str] = None
) -> bool:
    """
    Process failed payment
    
    Returns:
        True if processed successfully
    """
    try:
        if payment_order.status == PaymentOrderStatus.FAILED:
            return True  # Already marked as failed
        
        payment_order.status = PaymentOrderStatus.FAILED
        
        # Create transaction record
        transaction = PaymentTransaction(
            order_id=payment_order.id,
            transaction_type=PaymentTransactionType.PAYMENT,
            amount=payment_order.amount,
            status=PaymentTransactionStatus.FAILED
        )
        transaction.set_metadata({"error": error_message or "Payment failed"})
        db.add(transaction)
        
        db.commit()
        return True
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to process payment failure: {e}")
        return False


def get_payment_order_by_id(db: Session, order_id: str) -> Optional[PaymentOrder]:
    """Get payment order by order ID"""
    return db.query(PaymentOrder).filter(PaymentOrder.order_id == order_id).first()


def get_payment_order_by_razorpay_id(db: Session, razorpay_order_id: str) -> Optional[PaymentOrder]:
    """Get payment order by Razorpay order ID"""
    return db.query(PaymentOrder).filter(PaymentOrder.razorpay_order_id == razorpay_order_id).first()

