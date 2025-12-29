# app/plan_utils.py
"""
Utility functions for checking subscription plan templates and restricting features
"""
from sqlalchemy.orm import Session
from typing import Optional, List
from app.database import User, SubscriptionPlanTemplate, SubscriptionPlan
from datetime import datetime


def get_user_plan_template(
    user: User,
    db: Session
) -> Optional[SubscriptionPlanTemplate]:
    """
    Get the user's current active subscription plan template
    
    Args:
        user: User object
        db: Database session
        
    Returns:
        SubscriptionPlanTemplate if user has an active premium plan, None otherwise
    """
    # Check if user has premium subscription
    if user.subscription_plan != SubscriptionPlan.PREMIUM:
        return None
    
    # Check if subscription is expired
    if user.subscription_end_date and user.subscription_end_date < datetime.utcnow():
        return None
    
    # Get plan template from users table (preferred)
    if user.current_subscription_plan_template_id:
        plan_template = db.query(SubscriptionPlanTemplate).filter(
            SubscriptionPlanTemplate.id == user.current_subscription_plan_template_id
        ).first()
        if plan_template:
            return plan_template
    
    return None


def get_plan_template_by_name(
    plan_name: str,
    db: Session
) -> Optional[SubscriptionPlanTemplate]:
    """
    Get a plan template by its name (e.g., "Quarterly", "Half Yearly")
    
    Args:
        plan_name: Name of the plan template
        db: Database session
        
    Returns:
        SubscriptionPlanTemplate if found, None otherwise
    """
    return db.query(SubscriptionPlanTemplate).filter(
        SubscriptionPlanTemplate.name.ilike(f"%{plan_name}%"),
        SubscriptionPlanTemplate.is_active == True
    ).first()


def has_plan_template(
    user: User,
    plan_template_id: int,
    db: Session
) -> bool:
    """
    Check if user has a specific plan template
    
    Args:
        user: User object
        plan_template_id: ID of the plan template to check
        db: Database session
        
    Returns:
        True if user has the specified plan template and it's active
    """
    plan_template = get_user_plan_template(user, db)
    if plan_template and plan_template.id == plan_template_id:
        return True
    return False


def has_plan_template_by_name(
    user: User,
    plan_name: str,
    db: Session
) -> bool:
    """
    Check if user has a specific plan template by name
    
    Args:
        user: User object
        plan_name: Name of the plan template (e.g., "Quarterly", "Half Yearly")
        db: Database session
        
    Returns:
        True if user has the specified plan template and it's active
    """
    plan_template = get_user_plan_template(user, db)
    if plan_template and plan_name.lower() in plan_template.name.lower():
        return True
    return False


def can_access_feature(
    user: User,
    required_plan_template_ids: List[int],
    db: Session
) -> bool:
    """
    Check if user can access a feature based on their plan template
    
    Args:
        user: User object
        required_plan_template_ids: List of plan template IDs that have access to this feature
        db: Database session
        
    Returns:
        True if user's plan template is in the allowed list
    """
    plan_template = get_user_plan_template(user, db)
    if not plan_template:
        return False
    
    return plan_template.id in required_plan_template_ids


def can_access_feature_by_name(
    user: User,
    required_plan_names: List[str],
    db: Session
) -> bool:
    """
    Check if user can access a feature based on their plan template name
    
    Args:
        user: User object
        required_plan_names: List of plan template names that have access (e.g., ["Quarterly", "Half Yearly"])
        db: Database session
        
    Returns:
        True if user's plan template name matches one of the required names
    """
    plan_template = get_user_plan_template(user, db)
    if not plan_template:
        return False
    
    plan_name_lower = plan_template.name.lower()
    return any(req_name.lower() in plan_name_lower for req_name in required_plan_names)


def get_allowed_plan_templates_for_feature(
    feature_name: str
) -> List[int]:
    """
    Get list of plan template IDs allowed for a specific feature
    
    This is a configuration function - customize based on your feature requirements.
    
    Example:
        # Only Quarterly and Half Yearly plans can access advanced analytics
        if feature_name == "advanced_analytics":
            return [1, 2]  # IDs of Quarterly and Half Yearly plans
    
    Args:
        feature_name: Name of the feature
        
    Returns:
        List of plan template IDs that have access
    """
    # Example configuration - customize based on your needs
    feature_permissions = {
        "advanced_analytics": [1, 2],  # Example: Quarterly (1) and Half Yearly (2)
        "priority_support": [2],  # Example: Only Half Yearly (2)
        "export_data": [1, 2],  # Example: Both plans
        "api_access": [2],  # Example: Only Half Yearly
    }
    
    return feature_permissions.get(feature_name, [])


# Example usage in API endpoints:
"""
from app.plan_utils import can_access_feature, get_allowed_plan_templates_for_feature

@router.get("/advanced-analytics")
async def get_advanced_analytics(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # Check if user has access to advanced analytics
    allowed_plans = get_allowed_plan_templates_for_feature("advanced_analytics")
    if not can_access_feature(current_user, allowed_plans, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This feature requires a Quarterly or Half Yearly subscription"
        )
    
    # User has access, return data
    return {"analytics": "..."}
"""

