# seed_exam_sets.py
"""
Script to seed initial exam sets from existing question data
"""
import sys
import os
import pandas as pd
from pathlib import Path
from datetime import datetime

# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Add app directory to path
sys.path.append(str(Path(__file__).parent))

from app.database import SessionLocal, ExamSet
from utils.config_loader import load_config

def load_dataframe():
    """Load question data from CSV"""
    cfg = load_config()
    data_csv = cfg["paths"]["data_csv"]
    
    if not Path(data_csv).exists():
        print(f"Error: Data file not found: {data_csv}")
        return None
    
    try:
        df = pd.read_csv(data_csv, keep_default_na=False)
        return df.replace('', pd.NA)
    except Exception as e:
        print(f"Error loading CSV: {e}")
        return None

def create_exam_sets():
    """Create exam sets from question data"""
    db = SessionLocal()
    
    try:
        df = load_dataframe()
        if df is None:
            print("Error: Could not load question data")
            return
        
        print("Creating exam sets from question data...")
        
        # Get unique exam names
        exams = df["exam"].dropna().unique()
        
        exam_sets_created = 0
        
        for exam_name in exams:
            exam_df = df[df["exam"] == exam_name].copy()
            
            if len(exam_df) == 0:
                continue
            
            # Get unique years for this exam
            years = exam_df["year"].dropna().unique()
            if len(years) == 0:
                continue
            
            # Create exam set for EACH year separately
            for year in sorted(years):
                year_int = int(year)
                year_df = exam_df[exam_df["year"] == year_int].copy()
                
                if len(year_df) == 0:
                    continue
                
                # Create full paper exam set for this specific year
                total_questions = len(year_df)
                duration_minutes = max(60, total_questions * 0.6)  # ~0.6 min per question
                
                exam_set = ExamSet(
                    name=f"{exam_name} {year_int}",
                    description=f"Complete {exam_name} paper for year {year_int}",
                    exam_type="pyp",
                    exam_name=str(exam_name),
                    year_from=year_int,
                    year_to=year_int,
                    total_questions=total_questions,
                    duration_minutes=int(duration_minutes),
                    marks_per_question=2.0,
                    negative_marking=0.5,
                    is_active=True
                )
                
                # Check if already exists
                existing = db.query(ExamSet).filter(
                    ExamSet.name == exam_set.name,
                    ExamSet.year_from == year_int,
                    ExamSet.year_to == year_int,
                    ExamSet.subject.is_(None)
                ).first()
                
                if not existing:
                    db.add(exam_set)
                    exam_sets_created += 1
                    print(f"   Created: {exam_set.name}")
                
                # Create subject-wise exam sets for this exam-year combination
                subjects = year_df["subject"].dropna().unique()
                for subject_name in subjects:
                    subject_df = year_df[year_df["subject"] == subject_name].copy()
                    
                    if len(subject_df) == 0:
                        continue
                    
                    subject_question_count = len(subject_df)
                    subject_duration = max(30, int(subject_question_count * 0.6))
                    
                    subject_exam_set = ExamSet(
                        name=f"{exam_name} {year_int} - {subject_name}",
                        description=f"{subject_name} questions from {exam_name} {year_int}",
                        exam_type="subject_test",
                        exam_name=str(exam_name),
                        subject=str(subject_name),
                        year_from=year_int,
                        year_to=year_int,
                        total_questions=subject_question_count,
                        duration_minutes=subject_duration,
                        marks_per_question=2.0,
                        negative_marking=0.5,
                        is_active=True
                    )
                    
                    # Check if already exists
                    existing_subject = db.query(ExamSet).filter(
                        ExamSet.name == subject_exam_set.name,
                        ExamSet.year_from == year_int,
                        ExamSet.year_to == year_int,
                        ExamSet.subject == str(subject_name)
                    ).first()
                    
                    if not existing_subject:
                        db.add(subject_exam_set)
                        exam_sets_created += 1
                        print(f"   Created: {subject_exam_set.name}")
        
        db.commit()
        print(f"\nSuccess! Created {exam_sets_created} exam sets successfully!")
        
    except Exception as e:
        db.rollback()
        print(f"Error creating exam sets: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    create_exam_sets()

