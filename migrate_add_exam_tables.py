# migrate_add_exam_tables.py
"""
Migration script to add exam-related tables to the database
"""
import sys
import os
from pathlib import Path

# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Add app directory to path
sys.path.append(str(Path(__file__).parent))

from app.database import init_db, engine, Base
from app.database import (
    ExamSet, ExamAttempt, ExamQuestionResponse, ExamAttemptStatus
)

def migrate():
    """Create exam-related tables"""
    print("Creating exam-related tables...")
    
    try:
        # Create all tables (this will only create new ones)
        Base.metadata.create_all(bind=engine)
        print("Exam tables created successfully!")
        print("   - exam_sets")
        print("   - exam_attempts")
        print("   - exam_question_responses")
    except Exception as e:
        print(f"Error creating tables: {e}")
        raise

if __name__ == "__main__":
    migrate()

