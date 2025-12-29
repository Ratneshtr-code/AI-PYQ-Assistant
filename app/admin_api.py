# app/admin_api.py
"""
Admin API endpoints for user management, subscription management, etc.
Only accessible to admin users.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, timedelta

from app.database import (
    get_db, User, SubscriptionPlan, Session as SessionModel, SubscriptionPlanTemplate,
    UserNote, LLMUsageLog, PaymentOrder, PaymentTransaction
)
from app.auth import get_current_active_user

router = APIRouter(prefix="/admin", tags=["admin"])


# Pydantic models
class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    full_name: Optional[str] = None
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None
    subscription_plan: Optional[str] = None
    subscription_end_date: Optional[datetime] = None


class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    full_name: Optional[str]
    is_active: bool
    is_admin: bool
    subscription_plan: str
    subscription_start_date: Optional[datetime]
    subscription_end_date: Optional[datetime]
    created_at: datetime
    updated_at: datetime


class UserListResponse(BaseModel):
    users: List[UserResponse]
    total: int
    page: int
    page_size: int


# Admin-only dependency
async def get_admin_user(current_user: User = Depends(get_current_active_user)) -> User:
    """Ensure current user is admin"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


@router.get("/users", response_model=UserListResponse)
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    subscription_plan: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """List all users with pagination and filters"""
    query = db.query(User)
    
    # Apply filters
    if search:
        query = query.filter(
            or_(
                User.email.ilike(f"%{search}%"),
                User.username.ilike(f"%{search}%"),
                User.full_name.ilike(f"%{search}%")
            )
        )
    
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    
    if subscription_plan:
        try:
            plan = SubscriptionPlan(subscription_plan.lower())
            query = query.filter(User.subscription_plan == plan)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid subscription plan: {subscription_plan}"
            )
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    users = query.offset((page - 1) * page_size).limit(page_size).all()
    
    return UserListResponse(
        users=[
            UserResponse(
                id=u.id,
                email=u.email,
                username=u.username,
                full_name=u.full_name,
                is_active=u.is_active,
                is_admin=u.is_admin,
                subscription_plan=u.subscription_plan.value,
                subscription_start_date=u.subscription_start_date,
                subscription_end_date=u.subscription_end_date,
                created_at=u.created_at,
                updated_at=u.updated_at
            )
            for u in users
        ],
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Get user details by ID"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        is_active=user.is_active,
        is_admin=user.is_admin,
        subscription_plan=user.subscription_plan.value,
        subscription_start_date=user.subscription_start_date,
        subscription_end_date=user.subscription_end_date,
        created_at=user.created_at,
        updated_at=user.updated_at
    )


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Update user details"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent admin from removing their own admin status
    if user_id == admin.id and user_update.is_admin is False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove your own admin status"
        )
    
    # Update fields
    if user_update.email is not None:
        # Check if email already exists
        existing = db.query(User).filter(User.email == user_update.email, User.id != user_id).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already in use"
            )
        user.email = user_update.email
    
    if user_update.username is not None:
        # Check if username already exists
        existing = db.query(User).filter(User.username == user_update.username, User.id != user_id).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already in use"
            )
        user.username = user_update.username
    
    if user_update.full_name is not None:
        user.full_name = user_update.full_name
    
    if user_update.is_active is not None:
        user.is_active = user_update.is_active
    
    if user_update.is_admin is not None:
        user.is_admin = user_update.is_admin
    
    if user_update.subscription_plan is not None:
        try:
            plan = SubscriptionPlan(user_update.subscription_plan.lower())
            user.subscription_plan = plan
            if plan == SubscriptionPlan.PREMIUM and not user.subscription_start_date:
                user.subscription_start_date = datetime.utcnow()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid subscription plan: {user_update.subscription_plan}"
            )
    
    if user_update.subscription_end_date is not None:
        user.subscription_end_date = user_update.subscription_end_date
    
    user.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(user)
    
    return UserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        is_active=user.is_active,
        is_admin=user.is_admin,
        subscription_plan=user.subscription_plan.value,
        subscription_start_date=user.subscription_start_date,
        subscription_end_date=user.subscription_end_date,
        created_at=user.created_at,
        updated_at=user.updated_at
    )


@router.post("/users/{user_id}/deactivate")
async def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Deactivate a user (soft delete - user remains in database but cannot login)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent admin from deactivating themselves
    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate your own account"
        )
    
    # Toggle activation status (allows reactivation)
    user.is_active = not user.is_active
    user.updated_at = datetime.utcnow()
    
    # If deactivating, also delete all their sessions (force logout)
    if not user.is_active:
        db.query(SessionModel).filter(SessionModel.user_id == user_id).delete()
    
    db.commit()
    
    action = "deactivated" if not user.is_active else "reactivated"
    return {"message": f"User {action} successfully"}


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Permanently delete a user (hard delete - user is completely removed from database)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent admin from deleting themselves
    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    try:
        # Delete all related records first (in order to avoid foreign key constraints)
        
        # 1. Delete payment transactions (they reference payment_orders)
        payment_orders = db.query(PaymentOrder).filter(PaymentOrder.user_id == user_id).all()
        payment_order_ids = [po.id for po in payment_orders]
        if payment_order_ids:
            db.query(PaymentTransaction).filter(PaymentTransaction.order_id.in_(payment_order_ids)).delete()
        
        # 2. Delete payment orders
        db.query(PaymentOrder).filter(PaymentOrder.user_id == user_id).delete()
        
        # 3. Delete user notes
        db.query(UserNote).filter(UserNote.user_id == user_id).delete()
        
        # 4. Delete LLM usage logs
        db.query(LLMUsageLog).filter(LLMUsageLog.user_id == user_id).delete()
        
        # 5. Delete user sessions
        db.query(SessionModel).filter(SessionModel.user_id == user_id).delete()
        
        # 6. Finally, delete the user
        db.delete(user)
        db.commit()
        
        return {"message": "User permanently deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete user: {str(e)}"
        )


@router.post("/users/{user_id}/subscription")
async def update_subscription(
    user_id: int,
    plan: str = Query(..., description="Subscription plan: free or premium"),
    days: int = Query(30, ge=1, description="Subscription duration in days"),
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Update user subscription"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    try:
        subscription_plan = SubscriptionPlan(plan.lower())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid subscription plan: {plan}"
        )
    
    user.subscription_plan = subscription_plan
    user.subscription_start_date = datetime.utcnow()
    user.subscription_end_date = datetime.utcnow() + timedelta(days=days)
    user.updated_at = datetime.utcnow()
    
    db.commit()
    
    return {
        "message": "Subscription updated successfully",
        "plan": subscription_plan.value,
        "end_date": user.subscription_end_date
    }


@router.get("/stats")
async def get_admin_stats(
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Get admin dashboard statistics"""
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True).count()
    premium_users = db.query(User).filter(User.subscription_plan == SubscriptionPlan.PREMIUM).count()
    admin_users = db.query(User).filter(User.is_admin == True).count()
    
    return {
        "total_users": total_users,
        "active_users": active_users,
        "inactive_users": total_users - active_users,
        "premium_users": premium_users,
        "free_users": total_users - premium_users,
        "admin_users": admin_users,
        "regular_users": total_users - admin_users
    }


# Subscription Plan Template Models
class SubscriptionPlanTemplateCreate(BaseModel):
    name: str
    plan_type: str  # "free" or "premium"
    price: float
    duration_months: int
    is_active: bool = True


class SubscriptionPlanTemplateUpdate(BaseModel):
    name: Optional[str] = None
    plan_type: Optional[str] = None
    price: Optional[float] = None
    duration_months: Optional[int] = None
    is_active: Optional[bool] = None


class SubscriptionPlanTemplateResponse(BaseModel):
    id: int
    name: str
    plan_type: str
    price: float
    duration_months: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


@router.get("/subscription-plans", response_model=List[SubscriptionPlanTemplateResponse])
async def list_subscription_plans(
    is_active: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """List all subscription plan templates"""
    query = db.query(SubscriptionPlanTemplate)
    
    if is_active is not None:
        query = query.filter(SubscriptionPlanTemplate.is_active == is_active)
    
    templates = query.order_by(SubscriptionPlanTemplate.created_at.desc()).all()
    
    return [
        SubscriptionPlanTemplateResponse(
            id=t.id,
            name=t.name,
            plan_type=t.plan_type.value,
            price=t.price,
            duration_months=t.duration_months,
            is_active=t.is_active,
            created_at=t.created_at,
            updated_at=t.updated_at
        )
        for t in templates
    ]


@router.post("/subscription-plans", response_model=SubscriptionPlanTemplateResponse)
async def create_subscription_plan(
    plan_data: SubscriptionPlanTemplateCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Create a new subscription plan template"""
    # Validate plan_type
    try:
        plan_type = SubscriptionPlan(plan_data.plan_type.lower())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid plan_type: {plan_data.plan_type}. Must be 'free' or 'premium'"
        )
    
    # Validate price
    if plan_data.price < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Price cannot be negative"
        )
    
    # Validate duration
    if plan_data.duration_months < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Duration must be at least 1 month"
        )
    
    # Create new template
    template = SubscriptionPlanTemplate(
        name=plan_data.name,
        plan_type=plan_type,
        price=plan_data.price,
        duration_months=plan_data.duration_months,
        is_active=plan_data.is_active
    )
    
    db.add(template)
    db.commit()
    db.refresh(template)
    
    return SubscriptionPlanTemplateResponse(
        id=template.id,
        name=template.name,
        plan_type=template.plan_type.value,
        price=template.price,
        duration_months=template.duration_months,
        is_active=template.is_active,
        created_at=template.created_at,
        updated_at=template.updated_at
    )


@router.get("/subscription-plans/{plan_id}", response_model=SubscriptionPlanTemplateResponse)
async def get_subscription_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Get subscription plan template by ID"""
    template = db.query(SubscriptionPlanTemplate).filter(SubscriptionPlanTemplate.id == plan_id).first()
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription plan template not found"
        )
    
    return SubscriptionPlanTemplateResponse(
        id=template.id,
        name=template.name,
        plan_type=template.plan_type.value,
        price=template.price,
        duration_months=template.duration_months,
        is_active=template.is_active,
        created_at=template.created_at,
        updated_at=template.updated_at
    )


@router.put("/subscription-plans/{plan_id}", response_model=SubscriptionPlanTemplateResponse)
async def update_subscription_plan(
    plan_id: int,
    plan_update: SubscriptionPlanTemplateUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Update subscription plan template"""
    template = db.query(SubscriptionPlanTemplate).filter(SubscriptionPlanTemplate.id == plan_id).first()
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription plan template not found"
        )
    
    # Update fields
    if plan_update.name is not None:
        template.name = plan_update.name
    
    if plan_update.plan_type is not None:
        try:
            template.plan_type = SubscriptionPlan(plan_update.plan_type.lower())
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid plan_type: {plan_update.plan_type}. Must be 'free' or 'premium'"
            )
    
    if plan_update.price is not None:
        if plan_update.price < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Price cannot be negative"
            )
        template.price = plan_update.price
    
    if plan_update.duration_months is not None:
        if plan_update.duration_months < 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Duration must be at least 1 month"
            )
        template.duration_months = plan_update.duration_months
    
    if plan_update.is_active is not None:
        template.is_active = plan_update.is_active
    
    template.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(template)
    
    return SubscriptionPlanTemplateResponse(
        id=template.id,
        name=template.name,
        plan_type=template.plan_type.value,
        price=template.price,
        duration_months=template.duration_months,
        is_active=template.is_active,
        created_at=template.created_at,
        updated_at=template.updated_at
    )


@router.delete("/subscription-plans/{plan_id}")
async def delete_subscription_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user)
):
    """Delete subscription plan template (soft delete by setting is_active=False)"""
    template = db.query(SubscriptionPlanTemplate).filter(SubscriptionPlanTemplate.id == plan_id).first()
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription plan template not found"
        )
    
    # Soft delete - set is_active to False
    template.is_active = False
    template.updated_at = datetime.utcnow()
    
    db.commit()
    
    return {"message": "Subscription plan template deactivated successfully"}

