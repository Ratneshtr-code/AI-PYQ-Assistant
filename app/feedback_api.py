# app/feedback_api.py
"""
Feedback API endpoints for user feedback submission and management
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import logging

from app.database import get_db, User, UserFeedback
from app.auth import get_current_active_user
from app.email_service import send_email

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/feedback", tags=["feedback"])


# Pydantic models
class FeedbackSubmitRequest(BaseModel):
    feedback: str


class FeedbackResponse(BaseModel):
    id: int
    feedback_text: str
    created_at: datetime
    status: str


class FeedbackListResponse(BaseModel):
    feedbacks: List[FeedbackResponse]
    total: int


@router.post("", response_model=FeedbackResponse, status_code=status.HTTP_201_CREATED)
async def submit_feedback(
    request: FeedbackSubmitRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Submit user feedback
    
    This endpoint:
    1. Saves feedback to the database
    2. Sends email notification to admin(s)
    """
    try:
        # Validate feedback text
        feedback_text = request.feedback.strip()
        if not feedback_text:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Feedback cannot be empty"
            )
        
        if len(feedback_text) > 5000:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Feedback is too long (maximum 5000 characters)"
            )
        
        # Create feedback record
        feedback = UserFeedback(
            user_id=current_user.id,
            feedback_text=feedback_text,
            status="new"
        )
        db.add(feedback)
        db.commit()
        db.refresh(feedback)
        
        # Send email notification to admin
        try:
            # Get admin email(s) - you can configure this in environment variables
            import os
            from dotenv import load_dotenv
            load_dotenv()
            
            admin_email = os.getenv("ADMIN_EMAIL", "admin@example.com")
            
            # Prepare email content
            user_name = current_user.full_name or current_user.username or current_user.email
            user_email = current_user.email
            
            subject = f"New Feedback from {user_name} (User ID: {current_user.id})"
            
            html_body = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <h2 style="color: #4a5568;">New User Feedback Received</h2>
                
                <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #2d3748; margin-top: 0;">User Information</h3>
                    <p><strong>Name:</strong> {user_name}</p>
                    <p><strong>Email:</strong> {user_email}</p>
                    <p><strong>Username:</strong> {current_user.username}</p>
                    <p><strong>User ID:</strong> {current_user.id}</p>
                    <p><strong>Subscription Plan:</strong> {current_user.subscription_plan.value if current_user.subscription_plan else 'N/A'}</p>
                </div>
                
                <div style="background-color: #fff; padding: 20px; border-left: 4px solid #4299e1; margin: 20px 0;">
                    <h3 style="color: #2d3748; margin-top: 0;">Feedback</h3>
                    <p style="white-space: pre-wrap;">{feedback_text}</p>
                </div>
                
                <div style="margin-top: 20px; padding: 15px; background-color: #edf2f7; border-radius: 5px;">
                    <p style="margin: 0; font-size: 12px; color: #718096;">
                        <strong>Submitted:</strong> {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}<br>
                        <strong>Feedback ID:</strong> {feedback.id}
                    </p>
                </div>
            </body>
            </html>
            """
            
            text_body = f"""
New User Feedback Received

User Information:
- Name: {user_name}
- Email: {user_email}
- Username: {current_user.username}
- User ID: {current_user.id}
- Subscription Plan: {current_user.subscription_plan.value if current_user.subscription_plan else 'N/A'}

Feedback:
{feedback_text}

Submitted: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}
Feedback ID: {feedback.id}
            """
            
            # Send email
            email_sent = send_email(
                to_email=admin_email,
                subject=subject,
                html_body=html_body,
                text_body=text_body
            )
            
            if email_sent:
                logger.info(f"Feedback notification email sent to {admin_email} for feedback ID {feedback.id}")
            else:
                logger.warning(f"Failed to send feedback notification email to {admin_email} for feedback ID {feedback.id}")
        
        except Exception as email_error:
            # Don't fail the request if email fails
            logger.error(f"Error sending feedback notification email: {email_error}", exc_info=True)
        
        return FeedbackResponse(
            id=feedback.id,
            feedback_text=feedback.feedback_text,
            created_at=feedback.created_at,
            status=feedback.status
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting feedback: {e}", exc_info=True)
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit feedback"
        )


@router.get("", response_model=FeedbackListResponse)
async def get_user_feedback(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 50
):
    """
    Get feedback submitted by the current user
    """
    try:
        feedbacks = db.query(UserFeedback).filter(
            UserFeedback.user_id == current_user.id
        ).order_by(UserFeedback.created_at.desc()).offset(skip).limit(limit).all()
        
        total = db.query(UserFeedback).filter(
            UserFeedback.user_id == current_user.id
        ).count()
        
        return FeedbackListResponse(
            feedbacks=[
                FeedbackResponse(
                    id=f.id,
                    feedback_text=f.feedback_text,
                    created_at=f.created_at,
                    status=f.status
                )
                for f in feedbacks
            ],
            total=total
        )
    except Exception as e:
        logger.error(f"Error fetching user feedback: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch feedback"
        )

