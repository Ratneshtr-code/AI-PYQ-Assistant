# Notification System

## File Format
Each exam should have a JSON file named `<exam_name>.json` in this directory.

## JSON Structure
```json
{
  "notifications": [
    {
      "id": 1,
      "title": "Notification Title",
      "message": "Notification message content",
      "type": "info|success|warning|error",
      "expiry_date": "YYYY-MM-DD",
      "priority": "high|medium|low"
    }
  ]
}
```

## Backend API Endpoint
The frontend expects an API endpoint at: `/notifications/<exam_name>`

### Example Flask Route:
```python
@app.route('/notifications/<exam_name>', methods=['GET'])
def get_notifications(exam_name):
    import json
    import os
    from datetime import datetime
    
    notification_file = f"data/notification/{exam_name}.json"
    
    if not os.path.exists(notification_file):
        return jsonify({"notifications": []}), 200
    
    with open(notification_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Filter by expiry date
    now = datetime.now().date()
    active_notifications = []
    
    for notif in data.get("notifications", []):
        if notif.get("expiry_date"):
            expiry = datetime.strptime(notif["expiry_date"], "%Y-%m-%d").date()
            if expiry >= now:
                active_notifications.append(notif)
        else:
            # No expiry date means it never expires
            active_notifications.append(notif)
    
    return jsonify({"notifications": active_notifications}), 200
```

### Example FastAPI Route:
```python
from fastapi import APIRouter, HTTPException
from datetime import datetime
import json
import os

router = APIRouter()

@router.get("/notifications/{exam_name}")
async def get_notifications(exam_name: str):
    notification_file = f"data/notification/{exam_name}.json"
    
    if not os.path.exists(notification_file):
        return {"notifications": []}
    
    with open(notification_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Filter by expiry date
    now = datetime.now().date()
    active_notifications = []
    
    for notif in data.get("notifications", []):
        if notif.get("expiry_date"):
            expiry = datetime.strptime(notif["expiry_date"], "%Y-%m-%d").date()
            if expiry >= now:
                active_notifications.append(notif)
        else:
            active_notifications.append(notif)
    
    return {"notifications": active_notifications}
```

## Notes
- Notifications without an `expiry_date` will never expire
- Notifications are automatically filtered by expiry date on the backend
- High priority notifications have a visual ring indicator in the UI
- The notification window is collapsible and shows a count badge

