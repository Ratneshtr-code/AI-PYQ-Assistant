# clear_exam_sets.py
"""
Script to clear all existing exam sets from the database
Usage: python clear_exam_sets.py [--yes]
"""
import sys
import argparse
from pathlib import Path

# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Add app directory to path
sys.path.append(str(Path(__file__).parent))

from app.database import SessionLocal, ExamSet

def clear_exam_sets(skip_confirm=False):
    """Delete all exam sets from the database"""
    db = SessionLocal()
    
    try:
        count = db.query(ExamSet).count()
        print(f"Found {count} exam sets in database.")
        
        if count == 0:
            print("No exam sets to delete.")
            return
        
        if not skip_confirm:
            try:
                confirm = input(f"Are you sure you want to delete all {count} exam sets? (yes/no): ")
                if confirm.lower() != 'yes':
                    print("Cancelled.")
                    return
            except (EOFError, KeyboardInterrupt):
                print("\nCancelled.")
                return
        
        db.query(ExamSet).delete()
        db.commit()
        print(f"Successfully deleted {count} exam sets!")
        
    except Exception as e:
        db.rollback()
        print(f"Error deleting exam sets: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Clear all exam sets from the database')
    parser.add_argument('--yes', action='store_true', help='Skip confirmation prompt')
    args = parser.parse_args()
    
    clear_exam_sets(skip_confirm=args.yes)

