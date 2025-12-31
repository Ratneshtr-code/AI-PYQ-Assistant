#!/usr/bin/env python3
"""
Verify cutoff_marks column exists in exam_sets table
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app.database import SessionLocal
from sqlalchemy import text

def verify():
    """Verify cutoff_marks column exists"""
    db = SessionLocal()
    try:
        result = db.execute(text("PRAGMA table_info(exam_sets)"))
        columns = [(row[1], row[2]) for row in result]
        
        print("Columns in exam_sets table:")
        for col_name, col_type in columns:
            marker = " <-- cutoff_marks" if col_name == "cutoff_marks" else ""
            print(f"  - {col_name} ({col_type}){marker}")
        
        cutoff_exists = any(col[0] == "cutoff_marks" for col in columns)
        
        if cutoff_exists:
            print("\n[OK] cutoff_marks column exists!")
        else:
            print("\n[ERROR] cutoff_marks column NOT found!")
            
        return cutoff_exists
        
    finally:
        db.close()

if __name__ == "__main__":
    verify()

