# migrate_add_plan_template_id.py
"""
Migration script to add current_subscription_plan_template_id column to users table
and populate it from existing payment_orders data.

📋 MAIN FUNCTIONALITY:
   This script syncs/backfills data between:
   - payment_orders table (source: subscription_plan_id)
   - users table (target: current_subscription_plan_template_id)
   
   It ensures that existing premium users have their plan template ID stored
   directly in the users table for efficient queries and feature restrictions.

⚠️ IMPORTANT: This script is ONLY needed for EXISTING databases that were created
   before the current_subscription_plan_template_id column was added.

✅ For NEW databases:
   - The column is created automatically when init_db() runs
   - No migration needed!

✅ For NEW users (after column exists):
   - The field is automatically populated when they upgrade their subscription
   - No migration needed!

❌ Only run this if:
   - You have an existing database with users who subscribed BEFORE this column was added
   - You want to backfill/sync the field for existing premium users
"""
import sqlite3
from pathlib import Path
import sys

# Add the project root to the path
sys.path.insert(0, str(Path(__file__).parent))

from app.database import SessionLocal, User, PaymentOrder, PaymentOrderStatus
from sqlalchemy import text

def migrate():
    """Add current_subscription_plan_template_id column and populate it"""
    db = SessionLocal()
    
    try:
        print("Starting migration: Adding current_subscription_plan_template_id to users table...")
        
        # Check if column already exists
        result = db.execute(text("PRAGMA table_info(users)"))
        columns = [row[1] for row in result]
        
        if "current_subscription_plan_template_id" in columns:
            print("✓ Column 'current_subscription_plan_template_id' already exists")
        else:
            # Add the new column
            print("Adding column 'current_subscription_plan_template_id'...")
            db.execute(text("""
                ALTER TABLE users 
                ADD COLUMN current_subscription_plan_template_id INTEGER 
                REFERENCES subscription_plan_templates(id)
            """))
            db.commit()
            print("✓ Column added successfully")
        
        # Populate the column from payment_orders for existing premium users
        print("\nPopulating current_subscription_plan_template_id from payment_orders...")
        
        users = db.query(User).filter(User.subscription_plan == "premium").all()
        updated_count = 0
        
        for user in users:
            # Get the most recent paid payment order for this user
            payment_order = db.query(PaymentOrder).filter(
                PaymentOrder.user_id == user.id,
                PaymentOrder.status == PaymentOrderStatus.PAID
            ).order_by(PaymentOrder.payment_date.desc()).first()
            
            if payment_order and payment_order.subscription_plan_id:
                if user.current_subscription_plan_template_id != payment_order.subscription_plan_id:
                    user.current_subscription_plan_template_id = payment_order.subscription_plan_id
                    updated_count += 1
                    print(f"  Updated user {user.id} ({user.email}) with plan template ID {payment_order.subscription_plan_id}")
        
        db.commit()
        print(f"\n✓ Migration complete! Updated {updated_count} users with plan template IDs")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()
    
    return True

if __name__ == "__main__":
    print("=" * 60)
    print("Migration: Add current_subscription_plan_template_id to users table")
    print("=" * 60)
    
    success = migrate()
    
    if success:
        print("\n✅ Migration completed successfully!")
        print("\n" + "=" * 60)
        print("IMPORTANT NOTES:")
        print("=" * 60)
        print("✓ The users table now has current_subscription_plan_template_id column")
        print("✓ Existing premium users have been updated with their plan template IDs")
        print("\n📌 For NEW users and NEW subscriptions:")
        print("   → The field is AUTOMATICALLY populated when users upgrade")
        print("   → No manual intervention needed!")
        print("\n📌 For NEW databases:")
        print("   → The column is created automatically by init_db()")
        print("   → No migration needed!")
        print("\n📌 You can now use plan_utils.py functions to restrict features by plan template")
    else:
        print("\n❌ Migration failed. Please check the error messages above.")
        sys.exit(1)

