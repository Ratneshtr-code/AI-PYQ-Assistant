#!/usr/bin/env python3
"""
Migration script to add mobile_number column to users table
"""
import sqlite3
from pathlib import Path

# Database path
DB_PATH = Path(__file__).parent / "data" / "ai_pyq.db"

def migrate():
    """Add mobile_number column to users table"""
    if not DB_PATH.exists():
        print(f"Database not found at {DB_PATH}")
        return
    
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()
    
    try:
        # Check if column already exists
        cursor.execute("PRAGMA table_info(users)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if "mobile_number" in columns:
            print("✓ mobile_number column already exists in users table")
            return
        
        # Add mobile_number column
        print("Adding mobile_number column to users table...")
        cursor.execute("""
            ALTER TABLE users 
            ADD COLUMN mobile_number TEXT
        """)
        
        conn.commit()
        print("✓ Successfully added mobile_number column to users table")
        
    except Exception as e:
        conn.rollback()
        print(f"✗ Error during migration: {e}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()

