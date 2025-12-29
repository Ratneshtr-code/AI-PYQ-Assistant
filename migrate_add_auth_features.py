# migrate_add_auth_features.py
"""
Migration script to add email verification and password reset features
"""
import sqlite3
from pathlib import Path
from datetime import datetime

# Database path
DB_PATH = Path(__file__).parent / "data" / "ai_pyq.db"

def migrate():
    """Run migration to add new tables and columns"""
    if not DB_PATH.exists():
        print(f"Database not found at {DB_PATH}")
        print("The database will be created automatically when the app starts.")
        return
    
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()
    
    try:
        # Add email_verified column to users table if it doesn't exist
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT 0")
            print("✓ Added email_verified column to users table")
        except sqlite3.OperationalError as e:
            if "duplicate column" in str(e).lower():
                print("✓ email_verified column already exists")
            else:
                raise
        
        # Add email_verification_sent_at column to users table if it doesn't exist
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN email_verification_sent_at DATETIME")
            print("✓ Added email_verification_sent_at column to users table")
        except sqlite3.OperationalError as e:
            if "duplicate column" in str(e).lower():
                print("✓ email_verification_sent_at column already exists")
            else:
                raise
        
        # Create email_verifications table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS email_verifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                email VARCHAR NOT NULL,
                otp_code VARCHAR NOT NULL,
                created_at DATETIME NOT NULL,
                expires_at DATETIME NOT NULL,
                verified_at DATETIME,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        """)
        print("✓ Created email_verifications table")
        
        # Create index on user_id
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_email_verifications_user_id 
            ON email_verifications(user_id)
        """)
        
        # Create index on email
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_email_verifications_email 
            ON email_verifications(email)
        """)
        
        # Create password_reset_tokens table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                token VARCHAR UNIQUE NOT NULL,
                created_at DATETIME NOT NULL,
                expires_at DATETIME NOT NULL,
                used_at DATETIME,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        """)
        print("✓ Created password_reset_tokens table")
        
        # Create index on user_id
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id 
            ON password_reset_tokens(user_id)
        """)
        
        # Create index on token
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token 
            ON password_reset_tokens(token)
        """)
        
        # Set email_verified to True for existing users (grandfathering)
        cursor.execute("""
            UPDATE users 
            SET email_verified = 1 
            WHERE email_verified IS NULL OR email_verified = 0
        """)
        print("✓ Set email_verified = True for existing users")
        
        conn.commit()
        print("\n✅ Migration completed successfully!")
        
    except Exception as e:
        conn.rollback()
        print(f"\n❌ Migration failed: {str(e)}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    print("Running migration: Add authentication features...")
    print("=" * 50)
    migrate()

