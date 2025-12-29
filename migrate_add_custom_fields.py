#!/usr/bin/env python3
"""
Migration script to add custom_heading and comments columns to user_notes table
Run this once to update the existing database schema
"""
import sqlite3
from pathlib import Path

# Database path
DB_PATH = Path(__file__).parent / "data" / "ai_pyq.db"

def migrate_database():
    """Add custom_heading and comments columns to user_notes table"""
    if not DB_PATH.exists():
        print(f"Database not found at {DB_PATH}")
        print("Database will be created with new schema on next startup.")
        return
    
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()
    
    try:
        # Check if columns already exist
        cursor.execute("PRAGMA table_info(user_notes)")
        columns = [row[1] for row in cursor.fetchall()]
        
        # Add custom_heading if it doesn't exist
        if 'custom_heading' not in columns:
            print("Adding custom_heading column...")
            cursor.execute("ALTER TABLE user_notes ADD COLUMN custom_heading TEXT")
            print("[OK] Added custom_heading column")
        else:
            print("[OK] custom_heading column already exists")
        
        # Add comments if it doesn't exist
        if 'comments' not in columns:
            print("Adding comments column...")
            cursor.execute("ALTER TABLE user_notes ADD COLUMN comments TEXT")
            print("[OK] Added comments column")
        else:
            print("[OK] comments column already exists")
        
        conn.commit()
        print("\n[SUCCESS] Migration completed successfully!")
        
    except sqlite3.Error as e:
        print(f"[ERROR] Error during migration: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    print("Running database migration...")
    migrate_database()

