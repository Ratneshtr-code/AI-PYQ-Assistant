# app/roadmap_api.py
"""
Roadmap progress tracking API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Cookie
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from pydantic import BaseModel
import pandas as pd
import os

from app.database import get_db, UserQuestionProgress, User
from app.auth import get_user_id_from_session
from utils.config_loader import load_config

router = APIRouter(prefix="/roadmap", tags=["roadmap"])


def load_dataframe():
    """Load and return the CSV dataframe"""
    cfg = load_config()
    data_csv = cfg["paths"]["data_csv"]
    
    if not os.path.exists(data_csv):
        return None
    
    try:
        df = pd.read_csv(data_csv, keep_default_na=False)
        df = df.replace('', pd.NA)
        return df
    except Exception as e:
        print(f"Error loading CSV: {e}")
        return None


class TrackQuestionRequest(BaseModel):
    question_id: int
    exam: Optional[str] = None
    subject: Optional[str] = None
    topic: Optional[str] = None
    source: str  # "exam_mode", "topic_wise", "semantic_search"
    is_correct: Optional[bool] = None


class CheckSolvedRequest(BaseModel):
    question_ids: List[int]


@router.post("/track-question")
def track_question(
    request: TrackQuestionRequest,
    session_id: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    """Track when user solves a question"""
    user_id = get_user_id_from_session(session_id, db)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Check if already tracked (avoid duplicates)
    existing = db.query(UserQuestionProgress).filter(
        UserQuestionProgress.user_id == user_id,
        UserQuestionProgress.question_id == request.question_id
    ).first()
    
    if existing:
        # Update existing record if needed
        if request.exam and not existing.exam:
            existing.exam = request.exam
        if request.subject and not existing.subject:
            existing.subject = request.subject
        if request.topic and not existing.topic:
            existing.topic = request.topic
        if request.is_correct is not None and existing.is_correct is None:
            existing.is_correct = request.is_correct
        db.commit()
        return {"success": True, "message": "Progress updated"}
    
    # Get question metadata from CSV if not provided
    if not request.exam or not request.subject:
        df = load_dataframe()
        if df is not None:
            q_row = df[df["id"] == request.question_id]
            if len(q_row) > 0:
                row = q_row.iloc[0]
                exam = request.exam or str(row.get("exam", "")).strip()
                subject = request.subject or str(row.get("subject", "")).strip()
                topic = request.topic or str(row.get("topic", "")).strip()
            else:
                exam = request.exam
                subject = request.subject
                topic = request.topic
        else:
            exam = request.exam
            subject = request.subject
            topic = request.topic
    else:
        exam = request.exam
        subject = request.subject
        topic = request.topic
    
    # Create new progress record
    progress = UserQuestionProgress(
        user_id=user_id,
        question_id=request.question_id,
        exam=exam,
        subject=subject,
        topic=topic,
        source=request.source,
        is_correct=request.is_correct,
        solved_at=datetime.utcnow()
    )
    
    db.add(progress)
    db.commit()
    db.refresh(progress)
    
    return {"success": True, "message": "Question progress tracked"}


@router.post("/check-solved")
def check_solved(
    request: CheckSolvedRequest,
    session_id: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    """Batch check if questions are solved"""
    user_id = get_user_id_from_session(session_id, db)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    if not request.question_ids:
        return {}
    
    # Query all solved question IDs for this user
    solved_progress = db.query(UserQuestionProgress.question_id).filter(
        UserQuestionProgress.user_id == user_id,
        UserQuestionProgress.question_id.in_(request.question_ids)
    ).all()
    
    solved_ids = {row[0] for row in solved_progress}
    
    # Return map of question_id -> is_solved
    return {qid: qid in solved_ids for qid in request.question_ids}


@router.get("/progress/{exam}")
def get_progress(
    exam: str,
    language: str = Query("en", description="Language code: 'en' or 'hi'"),
    session_id: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    """Get user's progress for specific exam"""
    user_id = get_user_id_from_session(session_id, db)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Get roadmap data for this exam
    df = load_dataframe()
    if df is None:
        raise HTTPException(status_code=500, detail="Dataset not available")
    
    # Filter by exam
    filtered_df = df[df["exam"].str.lower() == exam.lower()].copy()
    
    if len(filtered_df) == 0:
        return {
            "exam": exam,
            "total_questions": 0,
            "solved_count": 0,
            "progress_percentage": 0.0,
            "weightage_progress": 0.0,
            "subjects": [],
            "solved_question_ids": []
        }
    
    total_questions = len(filtered_df)
    
    # Get user's solved questions for this exam (case-insensitive)
    solved_progress = db.query(UserQuestionProgress).filter(
        UserQuestionProgress.user_id == user_id,
        func.lower(UserQuestionProgress.exam) == func.lower(exam)
    ).all()
    
    solved_question_ids = {p.question_id for p in solved_progress}
    solved_count = len(solved_question_ids)
    
    # Calculate subject-wise progress
    subject_counts = filtered_df["subject"].value_counts()
    subjects_data = []
    total_weightage = 0.0
    solved_weightage = 0.0
    
    for subject, count in subject_counts.items():
        if pd.isna(subject) or not str(subject).strip():
            continue
        
        subject_name = str(subject).strip()
        subject_weightage = (count / total_questions) * 100
        
        # Translate subject name if Hindi is requested
        display_subject_name = subject_name
        if language and language.lower() in ["hi", "hindi"]:
            from app.translation_service import translate_text
            display_subject_name = translate_text(
                subject_name,
                target_language="hi",
                source_language="en",
                field="subject_name"
            )
        
        # Filter questions for this subject
        subject_df = filtered_df[filtered_df["subject"].str.lower() == subject_name.lower()]
        subject_total = len(subject_df)
        
        # Count solved questions in this subject
        subject_solved = sum(1 for qid in subject_df["id"] if qid in solved_question_ids)
        subject_progress = (subject_solved / subject_total * 100) if subject_total > 0 else 0.0
        
        # Calculate topic-wise progress
        topic_counts = subject_df["topic"].value_counts()
        topics_data = []
        
        for topic, topic_count in topic_counts.items():
            if pd.isna(topic) or not str(topic).strip():
                continue
            
            topic_name = str(topic).strip()
            topic_df = subject_df[subject_df["topic"].str.lower() == topic_name.lower()]
            topic_total = len(topic_df)
            topic_solved = sum(1 for qid in topic_df["id"] if qid in solved_question_ids)
            topic_progress = (topic_solved / topic_total * 100) if topic_total > 0 else 0.0
            topic_weightage = (topic_count / subject_total) * 100 if subject_total > 0 else 0.0
            
            # Translate topic name if Hindi is requested
            display_topic_name = topic_name
            if language and language.lower() in ["hi", "hindi"]:
                from app.translation_service import translate_text
                display_topic_name = translate_text(
                    topic_name,
                    target_language="hi",
                    source_language="en",
                    field="topic_name"
                )
            
            topics_data.append({
                "name": display_topic_name,  # Translated name for display
                "name_en": topic_name,  # Original English name (for consistency with roadmap)
                "total_questions": int(topic_total),
                "solved_count": topic_solved,
                "progress_percentage": round(topic_progress, 2),
                "weightage": round(topic_weightage, 2)
            })
        
        # Sort topics by weightage
        topics_data.sort(key=lambda x: x["weightage"], reverse=True)
        
        # Calculate solved weightage for this subject
        subject_solved_weightage = subject_weightage * (subject_progress / 100)
        solved_weightage += subject_solved_weightage
        total_weightage += subject_weightage
        
        subjects_data.append({
            "name": display_subject_name,  # Translated name for display
            "name_en": subject_name,  # Original English name (for consistency with roadmap)
            "total_questions": int(subject_total),
            "solved_count": subject_solved,
            "progress_percentage": round(subject_progress, 2),
            "weightage": round(subject_weightage, 2),
            "solved_weightage": round(subject_solved_weightage, 2),
            "topics": topics_data
        })
    
    # Sort subjects by weightage
    subjects_data.sort(key=lambda x: x["weightage"], reverse=True)
    
    # Calculate overall progress
    progress_percentage = (solved_count / total_questions * 100) if total_questions > 0 else 0.0
    weightage_progress = (solved_weightage / total_weightage * 100) if total_weightage > 0 else 0.0
    
    return {
        "exam": exam,
        "total_questions": total_questions,
        "solved_count": solved_count,
        "progress_percentage": round(progress_percentage, 2),
        "weightage_progress": round(weightage_progress, 2),
        "subjects": subjects_data,
        "solved_question_ids": list(solved_question_ids)
    }


@router.get("/progress-summary")
def get_progress_summary(
    session_id: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    """Get progress summary for all exams"""
    user_id = get_user_id_from_session(session_id, db)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Get all solved questions
    solved_progress = db.query(UserQuestionProgress).filter(
        UserQuestionProgress.user_id == user_id
    ).all()
    
    # Group by exam
    exam_progress = {}
    for progress in solved_progress:
        if not progress.exam:
            continue
        exam = progress.exam
        if exam not in exam_progress:
            exam_progress[exam] = {
                "exam": exam,
                "solved_count": 0,
                "total_questions": 0,
                "progress_percentage": 0.0
            }
        exam_progress[exam]["solved_count"] += 1
    
    # Get total questions for each exam
    df = load_dataframe()
    if df is not None:
        for exam in exam_progress.keys():
            exam_df = df[df["exam"].str.lower() == exam.lower()]
            exam_progress[exam]["total_questions"] = len(exam_df)
            if exam_progress[exam]["total_questions"] > 0:
                exam_progress[exam]["progress_percentage"] = round(
                    (exam_progress[exam]["solved_count"] / exam_progress[exam]["total_questions"]) * 100, 2
                )
    
    return {
        "exams": list(exam_progress.values()),
        "total_exams": len(exam_progress)
    }

