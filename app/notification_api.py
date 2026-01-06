# app/notification_api.py
"""
Notification API endpoints for exam-specific notifications
"""
from fastapi import APIRouter, HTTPException
from datetime import datetime
from typing import List, Dict, Any
import json
import os
from pathlib import Path

router = APIRouter(prefix="/notifications", tags=["notifications"])


def get_notification_file_path(exam_name: str) -> Path:
    """Get the path to the notification JSON file for an exam"""
    # Get the project root directory (parent of 'app' directory)
    project_root = Path(__file__).parent.parent
    notification_dir = project_root / "data" / "notification"
    notification_file = notification_dir / f"{exam_name}.json"
    return notification_file


@router.get("/{exam_name}")
async def get_notifications(exam_name: str) -> Dict[str, List[Dict[str, Any]]]:
    """
    Get active notifications for a specific exam.
    
    Args:
        exam_name: Name of the exam (e.g., "UPSC", "SSC", "RRB", "PSC")
    
    Returns:
        Dictionary with "notifications" key containing list of active notifications
    """
    try:
        notification_file = get_notification_file_path(exam_name)
        
        # If file doesn't exist, return empty list
        if not notification_file.exists():
            return {"notifications": []}
        
        # Read and parse JSON file
        with open(notification_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Filter notifications by expiry date
        now = datetime.now().date()
        active_notifications = []
        
        for notif in data.get("notifications", []):
            # If no expiry date, notification never expires
            if not notif.get("expiry_date"):
                active_notifications.append(notif)
                continue
            
            # Check if notification is still active
            try:
                expiry = datetime.strptime(notif["expiry_date"], "%Y-%m-%d").date()
                if expiry >= now:
                    active_notifications.append(notif)
            except ValueError:
                # Invalid date format, skip this notification
                continue
        
        return {"notifications": active_notifications}
    
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Invalid JSON in notification file: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading notifications: {str(e)}")

