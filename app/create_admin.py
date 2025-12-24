# app/create_admin.py
"""
Script to create the first admin user or promote existing user to admin.
Run this script to set up your first admin account.
"""
import sys
import os
from pathlib import Path
import getpass

# Add parent directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import SessionLocal, User, init_db
from app.auth import get_password_hash

def create_admin_user():
    """Create or promote a user to admin"""
    # Initialize database
    init_db()
    
    db = SessionLocal()
    
    try:
        print("=" * 60)
        print("Admin User Setup")
        print("=" * 60)
        print()
        
        # Check if any admin exists
        existing_admin = db.query(User).filter(User.is_admin == True).first()
        if existing_admin:
            print(f"⚠️  Admin user already exists: {existing_admin.email}")
            response = input("\nDo you want to create another admin? (y/n): ")
            if response.lower() != 'y':
                print("Exiting...")
                return
        
        # Get user input
        print("\nEnter admin user details:")
        email = input("Email: ").strip()
        
        # Check if user exists
        user = db.query(User).filter(User.email == email).first()
        
        if user:
            # User exists, promote to admin
            print(f"\n✓ User found: {user.username}")
            if user.is_admin:
                print("⚠️  User is already an admin!")
                return
            
            response = input(f"Promote {user.email} to admin? (y/n): ")
            if response.lower() == 'y':
                user.is_admin = True
                db.commit()
                print(f"\n✅ Success! {user.email} is now an admin.")
                print(f"   You can now login with: {user.email}")
            else:
                print("Cancelled.")
        else:
            # Create new admin user
            print("\nUser not found. Creating new admin user...")
            username = input("Username: ").strip()
            
            # Use getpass for secure password input
            password = getpass.getpass("Password: ").strip()
            if not password:
                password = input("Password (visible): ").strip()  # Fallback if getpass fails
            
            full_name = input("Full Name (optional): ").strip() or username
            
            if not password:
                print("❌ Password cannot be empty!")
                return
            
            # Validate password length (bcrypt limit is 72 bytes)
            password_bytes = password.encode('utf-8')
            if len(password_bytes) > 72:
                print(f"❌ Password is too long ({len(password_bytes)} bytes, max 72 bytes).")
                print("   Please use a shorter password (approximately 72 characters or less).")
                return
            
            # Validate password strength
            if len(password) < 8:
                print("❌ Password must be at least 8 characters long!")
                return
            
            # Create user
            try:
                print("\nHashing password...")
                hashed_password = get_password_hash(password)
                print("✓ Password hashed successfully")
            except Exception as e:
                print(f"\n❌ Error hashing password: {e}")
                print("\nTroubleshooting:")
                print("1. Try installing compatible bcrypt version: pip install bcrypt==4.0.1")
                print("2. Or try a shorter password")
                print("3. Check if passlib and bcrypt are properly installed")
                return
            new_user = User(
                email=email,
                username=username,
                hashed_password=hashed_password,
                full_name=full_name,
                is_admin=True,
                is_active=True
            )
            
            db.add(new_user)
            db.commit()
            db.refresh(new_user)
            
            print(f"\n✅ Admin user created successfully!")
            print(f"   Email: {new_user.email}")
            print(f"   Username: {new_user.username}")
            print(f"\n   You can now login at: http://localhost:5173/login")
            print(f"   Then access admin panel at: http://localhost:5173/admin")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_admin_user()

