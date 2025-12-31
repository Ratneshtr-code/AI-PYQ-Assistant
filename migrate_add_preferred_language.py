#!/usr/bin/env python3
"""
Migration script to add preferred_language column to users table
"""
import sqlite3
from pathlib import Path

# Database path
DB_PATH = Path(__file__).parent / "data" / "ai_pyq.db"

def migrate():
    """Add preferred_language column to users table"""
    if not DB_PATH.exists():
        print(f"Database not found at {DB_PATH}")
        return
    
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()
    
    try:
        # Check if column already exists
        cursor.execute("PRAGMA table_info(users)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if "preferred_language" in columns:
            print("✓ preferred_language column already exists in users table")
            return
        
        # Add preferred_language column with default value 'en'
        print("Adding preferred_language column to users table...")
        cursor.execute("""
            ALTER TABLE users 
            ADD COLUMN preferred_language TEXT DEFAULT 'en' NOT NULL
        """)
        
        # Update existing users to have 'en' as default if they don't have a value
        cursor.execute("""
            UPDATE users 
            SET preferred_language = 'en' 
            WHERE preferred_language IS NULL
        """)
        
        conn.commit()
        print("✓ Successfully added preferred_language column to users table")
        print("✓ Set default language to 'en' for all existing users")
        
    except Exception as e:
        conn.rollback()
        print(f"✗ Error during migration: {e}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()

