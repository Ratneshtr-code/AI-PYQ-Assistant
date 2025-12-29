# app/payment_api.py
"""
Payment API endpoints for subscription purchases
"""
from fastapi import APIRouter, Depends, HTTPException, status, Header, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import logging

from app.database import (
    get_db, User, SubscriptionPlan, SubscriptionPlanTemplate,
    PaymentOrder, PaymentOrderStatus
)
from app.auth import get_current_active_user
from app.payment_service import (
    create_payment_order, process_payment_success, process_payment_failure,
    get_payment_order_by_id, get_payment_order_by_razorpay_id,
    verify_payment_signature, verify_webhook_signature,
    IS_TEST_MODE, IS_PAYMENT_CONFIGURED, RAZORPAY_KEY_ID
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payment", tags=["payment"])


# Pydantic models
class CreateOrderRequest(BaseModel):
    plan_id: Optional[int] = None
    plan_type: str = "premium"
    amount: float
    duration_months: int = 1
    payment_method: str = "razorpay"


class CreateOrderResponse(BaseModel):
    order_id: str
    amount: float
    currency: str
    razorpay_order_id: Optional[str] = None
    razorpay_key_id: Optional[str] = None
    test_mode: bool
    coming_soon: bool
    user_name: Optional[str] = None
    user_email: Optional[str] = None


class VerifyPaymentRequest(BaseModel):
    order_id: str
    razorpay_payment_id: str
    razorpay_order_id: str
    razorpay_signature: str


class VerifyPaymentResponse(BaseModel):
    success: bool
    message: str
    order_id: Optional[str] = None
    user: Optional[dict] = None


class OrderStatusResponse(BaseModel):
    order_id: str
    status: str
    amount: float
    currency: str
    created_at: datetime
    payment_date: Optional[datetime] = None
    plan_name: Optional[str] = None


@router.post("/create-order", response_model=CreateOrderResponse)
async def create_order(
    request: CreateOrderRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Create payment order for subscription purchase
    """
    try:
        # Validate plan type
        try:
            plan_type = SubscriptionPlan(request.plan_type.lower())
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid plan type: {request.plan_type}"
            )
        
        # Validate amount
        if request.amount <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Amount must be greater than 0"
            )
        
        # Validate duration
        if request.duration_months < 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Duration must be at least 1 month"
            )
        
        # Get plan template if plan_id provided
        subscription_plan_id = None
        if request.plan_id:
            plan_template = db.query(SubscriptionPlanTemplate).filter(
                SubscriptionPlanTemplate.id == request.plan_id,
                SubscriptionPlanTemplate.is_active == True
            ).first()
            if not plan_template:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Subscription plan not found"
                )
            subscription_plan_id = plan_template.id
            # Use plan template amount if not specified
            if not request.amount or request.amount == 0:
                request.amount = plan_template.price
        
        # Check if user already has active premium subscription
        if current_user.subscription_plan == SubscriptionPlan.PREMIUM:
            if current_user.subscription_end_date and current_user.subscription_end_date > datetime.utcnow():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="You already have an active premium subscription"
                )
        
        # Create payment order
        payment_order, error = create_payment_order(
            db=db,
            user_id=current_user.id,
            amount=request.amount,
            plan_type=plan_type,
            duration_months=request.duration_months,
            subscription_plan_id=subscription_plan_id,
            payment_method=request.payment_method
        )
        
        if error:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create payment order: {error}"
            )
        
        return CreateOrderResponse(
            order_id=payment_order.order_id,
            amount=payment_order.amount,
            currency=payment_order.currency,
            razorpay_order_id=payment_order.razorpay_order_id,
            razorpay_key_id=RAZORPAY_KEY_ID if IS_PAYMENT_CONFIGURED else None,
            test_mode=IS_TEST_MODE,
            coming_soon=not IS_PAYMENT_CONFIGURED,
            user_name=current_user.full_name or current_user.username,
            user_email=current_user.email
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating payment order: {e}", exc_info=True)
        error_message = str(e) if str(e) else "Failed to create payment order"
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create payment order: {error_message}"
        )


@router.post("/verify", response_model=VerifyPaymentResponse)
async def verify_payment(
    request: VerifyPaymentRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Verify payment and update subscription
    """
    try:
        # Get payment order
        payment_order = get_payment_order_by_id(db, request.order_id)
        if not payment_order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment order not found"
            )
        
        # Verify order belongs to current user
        if payment_order.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to verify this payment"
            )
        
        # Process payment success
        success, error = process_payment_success(
            db=db,
            payment_order=payment_order,
            razorpay_payment_id=request.razorpay_payment_id,
            razorpay_signature=request.razorpay_signature
        )
        
        if not success:
            return VerifyPaymentResponse(
                success=False,
                message=error or "Payment verification failed",
                order_id=payment_order.order_id
            )
        
        # Refresh user data
        db.refresh(current_user)
        
        return VerifyPaymentResponse(
            success=True,
            message="Payment verified and subscription activated successfully",
            order_id=payment_order.order_id,
            user={
                "id": current_user.id,
                "email": current_user.email,
                "username": current_user.username,
                "full_name": current_user.full_name,
                "subscription_plan": current_user.subscription_plan.value,
                "is_admin": current_user.is_admin,
                "profile_picture_url": current_user.profile_picture_url,
                "subscription_start_date": current_user.subscription_start_date.isoformat() if current_user.subscription_start_date else None,
                "subscription_end_date": current_user.subscription_end_date.isoformat() if current_user.subscription_end_date else None
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying payment: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to verify payment"
        )


@router.post("/webhook")
async def payment_webhook(
    request: Request,
    db: Session = Depends(get_db),
    x_razorpay_signature: Optional[str] = Header(None, alias="X-Razorpay-Signature")
):
    """
    Handle Razorpay webhook events
    """
    try:
        # Get raw request body
        body = await request.body()
        body_str = body.decode("utf-8")
        
        # Verify webhook signature
        if x_razorpay_signature:
            if not verify_webhook_signature(body_str, x_razorpay_signature):
                logger.warning("Invalid webhook signature")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid webhook signature"
                )
        
        # Parse webhook payload
        import json
        webhook_data = json.loads(body_str)
        
        event = webhook_data.get("event")
        payload = webhook_data.get("payload", {})
        
        logger.info(f"Received webhook event: {event}")
        
        # Handle payment.paid event
        if event == "payment.captured" or event == "payment.authorized":
            payment_data = payload.get("payment", {}).get("entity", {})
            order_id = payment_data.get("order_id")
            
            if order_id:
                payment_order = get_payment_order_by_razorpay_id(db, order_id)
                if payment_order and payment_order.status == PaymentOrderStatus.PENDING:
                    process_payment_success(
                        db=db,
                        payment_order=payment_order,
                        razorpay_payment_id=payment_data.get("id", ""),
                        razorpay_signature=""  # Webhook doesn't include signature
                    )
        
        # Handle payment.failed event
        elif event == "payment.failed":
            payment_data = payload.get("payment", {}).get("entity", {})
            order_id = payment_data.get("order_id")
            
            if order_id:
                payment_order = get_payment_order_by_razorpay_id(db, order_id)
                if payment_order:
                    error_description = payment_data.get("error_description", "Payment failed")
                    process_payment_failure(db, payment_order, error_description)
        
        return {"status": "success"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing webhook: {e}")
        # Don't raise error to avoid webhook retries
        return {"status": "error", "message": str(e)}


class TestModeUpgradeRequest(BaseModel):
    order_id: str


@router.post("/test-mode-upgrade", response_model=VerifyPaymentResponse)
async def test_mode_upgrade(
    request: TestModeUpgradeRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Upgrade user to premium in test mode (bypasses payment gateway)
    Only works when IS_TEST_MODE is True
    """
    from app.payment_service import IS_TEST_MODE
    
    if not IS_TEST_MODE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Test mode upgrade is only available in test mode"
        )
    
    try:
        # Get payment order
        payment_order = get_payment_order_by_id(db, request.order_id)
        if not payment_order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment order not found"
            )
        
        # Verify order belongs to current user
        if payment_order.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to upgrade this order"
            )
        
        # Check if already processed
        if payment_order.status == PaymentOrderStatus.PAID:
            # Already upgraded, just return success
            db.refresh(current_user)
            return VerifyPaymentResponse(
                success=True,
                message="Subscription already active",
                order_id=request.order_id,
                user={
                    "id": current_user.id,
                    "email": current_user.email,
                    "username": current_user.username,
                    "full_name": current_user.full_name,
                    "subscription_plan": current_user.subscription_plan.value,
                    "is_admin": current_user.is_admin,
                    "profile_picture_url": current_user.profile_picture_url,
                    "subscription_start_date": current_user.subscription_start_date.isoformat() if current_user.subscription_start_date else None,
                    "subscription_end_date": current_user.subscription_end_date.isoformat() if current_user.subscription_end_date else None
                }
            )
        
        # Process test mode upgrade (bypass signature verification)
        from datetime import timedelta
        from app.payment_service import process_payment_success
        
        # Create a dummy payment ID for test mode
        test_payment_id = f"test_payment_{payment_order.order_id}"
        
        # Process payment success (but skip signature verification in test mode)
        # We'll modify process_payment_success to handle test mode
        success, error = process_payment_success(
            db=db,
            payment_order=payment_order,
            razorpay_payment_id=test_payment_id,
            razorpay_signature="test_mode_signature"  # Dummy signature for test mode
        )
        
        if not success:
            return VerifyPaymentResponse(
                success=False,
                message=error or "Failed to upgrade subscription",
                order_id=request.order_id
            )
        
        # Refresh user data
        db.refresh(current_user)
        
        return VerifyPaymentResponse(
            success=True,
            message="Subscription upgraded successfully (Test Mode)",
            order_id=request.order_id,
            user={
                "id": current_user.id,
                "email": current_user.email,
                "username": current_user.username,
                "full_name": current_user.full_name,
                "subscription_plan": current_user.subscription_plan.value,
                "is_admin": current_user.is_admin,
                "profile_picture_url": current_user.profile_picture_url,
                "subscription_start_date": current_user.subscription_start_date.isoformat() if current_user.subscription_start_date else None,
                "subscription_end_date": current_user.subscription_end_date.isoformat() if current_user.subscription_end_date else None
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in test mode upgrade: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upgrade subscription"
        )


@router.get("/order-status/{order_id}", response_model=OrderStatusResponse)
async def get_order_status(
    order_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get payment order status
    """
    try:
        payment_order = get_payment_order_by_id(db, order_id)
        if not payment_order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment order not found"
            )
        
        # Verify order belongs to current user
        if payment_order.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to view this order"
            )
        
        # Get plan name if available
        plan_name = None
        if payment_order.subscription_plan_id:
            plan_template = db.query(SubscriptionPlanTemplate).filter(
                SubscriptionPlanTemplate.id == payment_order.subscription_plan_id
            ).first()
            if plan_template:
                plan_name = plan_template.name
        
        return OrderStatusResponse(
            order_id=payment_order.order_id,
            status=payment_order.status.value,
            amount=payment_order.amount,
            currency=payment_order.currency,
            created_at=payment_order.created_at,
            payment_date=payment_order.payment_date,
            plan_name=plan_name
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting order status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get order status"
        )

