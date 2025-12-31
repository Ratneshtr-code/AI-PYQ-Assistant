#!/usr/bin/env python3
"""
Migration script to add cutoff_marks column to exam_sets table

Usage:
    python migrate_add_cutoff_marks.py
    
Or with virtual environment:
    venv310\Scripts\activate
    python migrate_add_cutoff_marks.py
"""
import sys
import os
from pathlib import Path

# Add app directory to path
sys.path.insert(0, str(Path(__file__).parent))

try:
    from app.database import engine, SessionLocal, ExamSet
    from sqlalchemy import text
except ImportError as e:
    print(f"Error importing modules: {e}")
    print("\nPlease make sure you're running this script from the project root")
    print("and that your virtual environment is activated.")
    print("\nExample:")
    print("  venv310\\Scripts\\activate  (Windows)")
    print("  python migrate_add_cutoff_marks.py")
    sys.exit(1)

def migrate():
    """Add cutoff_marks column to exam_sets table"""
    print("=" * 70)
    print("Migration: Adding cutoff_marks column to exam_sets table")
    print("=" * 70)
    
    db = SessionLocal()
    try:
        # Check if column already exists
        result = db.execute(text("PRAGMA table_info(exam_sets)"))
        columns = [row[1] for row in result]
        
        if 'cutoff_marks' in columns:
            print("[OK] Column 'cutoff_marks' already exists. No migration needed.")
            return
        
        print("\nAdding cutoff_marks column...")
        
        # Add the column
        db.execute(text("ALTER TABLE exam_sets ADD COLUMN cutoff_marks REAL"))
        db.commit()
        
        print("[OK] Column 'cutoff_marks' added successfully!")
        
        # Update existing records: set cutoff_marks to 25% of total marks
        print("\nUpdating existing exam sets with default cutoff (25% of total marks)...")
        
        exam_sets = db.query(ExamSet).all()
        updated_count = 0
        
        for exam_set in exam_sets:
            if exam_set.cutoff_marks is None:
                total_marks = exam_set.total_questions * exam_set.marks_per_question
                exam_set.cutoff_marks = total_marks * 0.25
                updated_count += 1
        
        db.commit()
        
        print(f"[OK] Updated {updated_count} exam set(s) with default cutoff marks (25% of total marks)")
        print("\n" + "=" * 70)
        print("Migration completed successfully!")
        print("=" * 70)
        
    except Exception as e:
        db.rollback()
        print(f"\n[ERROR] Error during migration: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    migrate()

