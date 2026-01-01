#!/usr/bin/env python3
"""
Migration: Add language column to exam_attempts table
This stores the language selected by the user in the exam instructions page.
"""
import sqlite3
from pathlib import Path

# Database path
DB_PATH = Path(__file__).parent / "data" / "ai_pyq.db"

def migrate():
    """Add language column to exam_attempts table"""
    if not DB_PATH.exists():
        print(f"❌ Database not found at {DB_PATH}")
        return False
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Check if column already exists
        cursor.execute("PRAGMA table_info(exam_attempts)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if "language" in columns:
            print("✅ Column 'language' already exists in exam_attempts table")
            return True
        
        # Add language column with default value 'en'
        print("Adding 'language' column to exam_attempts table...")
        cursor.execute("""
            ALTER TABLE exam_attempts 
            ADD COLUMN language VARCHAR NOT NULL DEFAULT 'en'
        """)
        
        # Update existing records to have 'en' as default
        cursor.execute("""
            UPDATE exam_attempts 
            SET language = 'en' 
            WHERE language IS NULL OR language = ''
        """)
        
        conn.commit()
        print("✅ Successfully added 'language' column to exam_attempts table")
        return True
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Error during migration: {e}")
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    print("=" * 60)
    print("Migration: Add language column to exam_attempts")
    print("=" * 60)
    success = migrate()
    if success:
        print("\n✅ Migration completed successfully!")
    else:
        print("\n❌ Migration failed!")
        exit(1)

