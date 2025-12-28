# manage_users.py
"""
Utility script to manage users and view subscription information
"""
import sys
import os
from pathlib import Path
from datetime import datetime
from sqlalchemy import func

# Add project root to path
sys.path.append(str(Path(__file__).parent))

from app.database import SessionLocal, User, SubscriptionPlan, init_db


def format_date(date):
    """Format date for display"""
    if not date:
        return "N/A"
    try:
        return date.strftime("%Y-%m-%d %H:%M")
    except:
        return str(date)


def list_users():
    """List all users with their subscription information"""
    db = SessionLocal()
    try:
        users = db.query(User).order_by(User.created_at.desc()).all()
        
        if not users:
            print("\n📭 No users found")
            return
        
        print("\n" + "=" * 120)
        print(f"{'ID':<6} {'Username':<20} {'Email':<30} {'Plan':<12} {'Status':<10} {'Created':<20}")
        print("=" * 120)
        
        for user in users:
            plan = user.subscription_plan.value if user.subscription_plan else "N/A"
            status = "Active" if user.is_active else "Inactive"
            created = format_date(user.created_at)
            
            # Check subscription expiry
            if user.subscription_plan == SubscriptionPlan.PREMIUM:
                if user.subscription_end_date:
                    if user.subscription_end_date < datetime.utcnow():
                        status = "Expired"
                    else:
                        expiry = format_date(user.subscription_end_date)
                        status = f"Valid until {expiry}"
            
            print(f"{user.id:<6} {user.username[:18]:<20} {user.email[:28]:<30} {plan:<12} {status:<10} {created:<20}")
        
        print("=" * 120)
        print(f"\nTotal users: {len(users)}")
        
        # Statistics
        premium_count = db.query(User).filter(User.subscription_plan == SubscriptionPlan.PREMIUM).count()
        free_count = db.query(User).filter(User.subscription_plan == SubscriptionPlan.FREE).count()
        active_count = db.query(User).filter(User.is_active == True).count()
        
        print(f"  - Premium: {premium_count}")
        print(f"  - Free: {free_count}")
        print(f"  - Active: {active_count}")
        
    except Exception as e:
        print(f"❌ Error listing users: {e}")
    finally:
        db.close()


def view_user_details(user_id: int):
    """View detailed information about a specific user"""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        
        if not user:
            print(f"❌ User with ID {user_id} not found")
            return
        
        print("\n" + "=" * 80)
        print(f"User Details - ID: {user.id}")
        print("=" * 80)
        print(f"Username:        {user.username}")
        print(f"Email:           {user.email}")
        print(f"Full Name:       {user.full_name or 'N/A'}")
        print(f"Subscription:    {user.subscription_plan.value if user.subscription_plan else 'N/A'}")
        print(f"Active:          {'Yes' if user.is_active else 'No'}")
        print(f"Admin:           {'Yes' if user.is_admin else 'No'}")
        print(f"Created:         {format_date(user.created_at)}")
        print(f"Updated:         {format_date(user.updated_at)}")
        
        if user.subscription_plan == SubscriptionPlan.PREMIUM:
            print(f"Sub Start:       {format_date(user.subscription_start_date)}")
            print(f"Sub End:         {format_date(user.subscription_end_date)}")
            if user.subscription_end_date:
                if user.subscription_end_date < datetime.utcnow():
                    print("⚠️  Subscription EXPIRED")
                else:
                    days_left = (user.subscription_end_date - datetime.utcnow()).days
                    print(f"⏰ Days remaining: {days_left}")
        
        # Count user's notes
        notes_count = len(user.notes) if hasattr(user, 'notes') else 0
        print(f"Saved Notes:     {notes_count}")
        
        # Count user's LLM usage
        from app.database import LLMUsageLog
        usage_count = db.query(LLMUsageLog).filter(LLMUsageLog.user_id == user.id).count()
        print(f"LLM Requests:    {usage_count}")
        
        print("=" * 80)
        
    except Exception as e:
        print(f"❌ Error viewing user: {e}")
    finally:
        db.close()


def search_users(query: str):
    """Search users by username or email"""
    db = SessionLocal()
    try:
        users = db.query(User).filter(
            (User.username.ilike(f"%{query}%")) | (User.email.ilike(f"%{query}%"))
        ).all()
        
        if not users:
            print(f"\n📭 No users found matching '{query}'")
            return
        
        print(f"\n🔍 Search results for '{query}':")
        print("=" * 120)
        print(f"{'ID':<6} {'Username':<20} {'Email':<30} {'Plan':<12} {'Status':<10}")
        print("=" * 120)
        
        for user in users:
            plan = user.subscription_plan.value if user.subscription_plan else "N/A"
            status = "Active" if user.is_active else "Inactive"
            print(f"{user.id:<6} {user.username[:18]:<20} {user.email[:28]:<30} {plan:<12} {status:<10}")
        
        print("=" * 120)
        
    except Exception as e:
        print(f"❌ Error searching users: {e}")
    finally:
        db.close()


def main():
    """Main function"""
    # Initialize database
    init_db()
    
    print("=" * 80)
    print("User Management Tool")
    print("=" * 80)
    
    while True:
        print("\nOptions:")
        print("1. List all users")
        print("2. View user details")
        print("3. Search users")
        print("4. Exit")
        
        choice = input("\nEnter choice (1-4): ").strip()
        
        if choice == "1":
            list_users()
        
        elif choice == "2":
            try:
                user_id = int(input("Enter user ID: ").strip())
                view_user_details(user_id)
            except ValueError:
                print("❌ Invalid user ID")
        
        elif choice == "3":
            query = input("Enter search query (username or email): ").strip()
            if query:
                search_users(query)
            else:
                print("❌ Query cannot be empty")
        
        elif choice == "4":
            print("\n👋 Goodbye!")
            break
        
        else:
            print("❌ Invalid choice. Please enter 1-4.")


if __name__ == "__main__":
    main()

