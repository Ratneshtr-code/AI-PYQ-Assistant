# app/exam_api.py
"""
Exam Mode API endpoints for exam sets, attempts, and analysis
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Cookie
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from pydantic import BaseModel
import pandas as pd
import json
import os

from app.database import (
    get_db, ExamSet, ExamAttempt, ExamQuestionResponse, 
    ExamAttemptStatus, User
)
from app.auth import get_user_id_from_session
from utils.config_loader import load_config

router = APIRouter(prefix="/exam", tags=["exam"])


def load_dataframe():
    """Load and return the CSV dataframe, with caching for performance"""
    cfg = load_config()
    data_csv = cfg["paths"]["data_csv"]
    
    if not os.path.exists(data_csv):
        return None
    
    try:
        df = pd.read_csv(data_csv, keep_default_na=False)
        # Replace empty strings with NaN for proper filtering
        df = df.replace('', pd.NA)
        return df
    except Exception as e:
        print(f"Error loading CSV: {e}")
        return None


# Pydantic models for request/response
class ExamSetResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    exam_type: Optional[str]
    exam_name: Optional[str]
    subject: Optional[str]
    topic: Optional[str]
    year_from: Optional[int]
    year_to: Optional[int]
    total_questions: int
    duration_minutes: int
    marks_per_question: float
    negative_marking: float
    is_active: bool

    class Config:
        from_attributes = True


class StartExamRequest(BaseModel):
    exam_set_id: int


class StartExamResponse(BaseModel):
    attempt_id: int
    exam_set: ExamSetResponse
    questions: List[Dict[str, Any]]
    started_at: datetime


class AnswerQuestionRequest(BaseModel):
    question_id: int
    selected_option: Optional[str]  # A, B, C, D or null
    is_marked_for_review: bool = False


class SubmitExamResponse(BaseModel):
    attempt_id: int
    total_score: float
    questions_answered: int
    questions_correct: int
    questions_wrong: int
    accuracy: float
    submitted_at: datetime


@router.get("/sets", response_model=List[ExamSetResponse])
def get_exam_sets(
    exam: Optional[str] = Query(None),
    subject: Optional[str] = Query(None),
    year_from: Optional[int] = Query(None),
    year_to: Optional[int] = Query(None),
    is_active: bool = Query(True),
    db: Session = Depends(get_db)
):
    """List available exam sets with optional filters"""
    query = db.query(ExamSet)
    
    if is_active:
        query = query.filter(ExamSet.is_active == True)
    
    if exam:
        query = query.filter(ExamSet.exam_name.ilike(f"%{exam}%"))
    
    if subject:
        query = query.filter(ExamSet.subject.ilike(f"%{subject}%"))
    
    if year_from:
        query = query.filter(
            or_(
                ExamSet.year_from >= year_from,
                ExamSet.year_from.is_(None)
            )
        )
    
    if year_to:
        query = query.filter(
            or_(
                ExamSet.year_to <= year_to,
                ExamSet.year_to.is_(None)
            )
        )
    
    exam_sets = query.order_by(ExamSet.created_at.desc()).all()
    return exam_sets


@router.get("/sets/{set_id}", response_model=ExamSetResponse)
def get_exam_set(set_id: int, db: Session = Depends(get_db)):
    """Get exam set details"""
    exam_set = db.query(ExamSet).filter(ExamSet.id == set_id).first()
    if not exam_set:
        raise HTTPException(status_code=404, detail="Exam set not found")
    return exam_set


@router.post("/start", response_model=StartExamResponse)
def start_exam(
    request: StartExamRequest,
    session_id: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    """Start a new exam attempt"""
    user_id = get_user_id_from_session(session_id, db)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Get exam set
    exam_set = db.query(ExamSet).filter(ExamSet.id == request.exam_set_id).first()
    if not exam_set:
        raise HTTPException(status_code=404, detail="Exam set not found")
    
    if not exam_set.is_active:
        raise HTTPException(status_code=400, detail="Exam set is not active")
    
    # Load questions based on exam set filters
    df = load_dataframe()
    if df is None:
        raise HTTPException(status_code=500, detail="Question data not available")
    
    # Filter questions
    filtered_df = df.copy()
    
    if exam_set.exam_name:
        filtered_df = filtered_df[filtered_df["exam"].str.lower() == exam_set.exam_name.lower()]
    
    if exam_set.subject:
        filtered_df = filtered_df[filtered_df["subject"].str.lower() == exam_set.subject.lower()]
    
    if exam_set.topic:
        if "topic_tag" in filtered_df.columns:
            filtered_df = filtered_df[
                filtered_df["topic_tag"].astype(str).str.lower().str.contains(exam_set.topic.lower(), na=False)
            ]
    
    if exam_set.year_from:
        filtered_df = filtered_df[filtered_df["year"] >= exam_set.year_from]
    
    if exam_set.year_to:
        filtered_df = filtered_df[filtered_df["year"] <= exam_set.year_to]
    
    # Limit to total_questions if specified
    if exam_set.total_questions > 0:
        filtered_df = filtered_df.head(exam_set.total_questions)
    
    if len(filtered_df) == 0:
        raise HTTPException(status_code=400, detail="No questions found for this exam set")
    
    # Create exam attempt
    attempt = ExamAttempt(
        user_id=user_id,
        exam_set_id=exam_set.id,
        started_at=datetime.utcnow(),
        total_questions=len(filtered_df),
        status=ExamAttemptStatus.IN_PROGRESS
    )
    db.add(attempt)
    db.flush()
    
    # Convert questions to list format
    questions = []
    for idx, row in filtered_df.iterrows():
        question = {
            "question_id": int(row.get("id", idx)),
            "json_question_id": str(row.get("json_question_id", "")),
            "question_text": str(row.get("question_text", "")),
            "option_a": str(row.get("option_a", "")),
            "option_b": str(row.get("option_b", "")),
            "option_c": str(row.get("option_c", "")),
            "option_d": str(row.get("option_d", "")),
            "correct_option": str(row.get("correct_option", "")),
            "exam": str(row.get("exam", "")),
            "year": int(row.get("year", 0)) if pd.notna(row.get("year")) else None,
            "subject": str(row.get("subject", "")),
            "topic": str(row.get("topic", "")),
            "topic_tag": str(row.get("topic_tag", "")) if "topic_tag" in row else None
        }
        questions.append(question)
        
        # Create response record
        response = ExamQuestionResponse(
            exam_attempt_id=attempt.id,
            question_id=question["question_id"]
        )
        db.add(response)
    
    db.commit()
    db.refresh(attempt)
    
    return StartExamResponse(
        attempt_id=attempt.id,
                exam_set=ExamSetResponse(
                    id=exam_set.id,
                    name=exam_set.name,
                    description=exam_set.description,
                    exam_type=exam_set.exam_type,
                    exam_name=exam_set.exam_name,
                    subject=exam_set.subject,
                    topic=exam_set.topic,
                    year_from=exam_set.year_from,
                    year_to=exam_set.year_to,
                    total_questions=exam_set.total_questions,
                    duration_minutes=exam_set.duration_minutes,
                    marks_per_question=exam_set.marks_per_question,
                    negative_marking=exam_set.negative_marking,
                    is_active=exam_set.is_active
                ),
        questions=questions,
        started_at=attempt.started_at
    )


@router.get("/attempt/{attempt_id}")
def get_exam_attempt(
    attempt_id: int,
    session_id: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    """Get exam attempt details with questions and responses"""
    user_id = get_user_id_from_session(session_id, db)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    attempt = db.query(ExamAttempt).filter(
        ExamAttempt.id == attempt_id,
        ExamAttempt.user_id == user_id
    ).first()
    
    if not attempt:
        raise HTTPException(status_code=404, detail="Exam attempt not found")
    
    # Get responses
    responses = db.query(ExamQuestionResponse).filter(
        ExamQuestionResponse.exam_attempt_id == attempt_id
    ).all()
    
    # Load questions
    df = load_dataframe()
    if df is None:
        raise HTTPException(status_code=500, detail="Question data not available")
    
    # Build response map
    response_map = {
        r.question_id: {
            "selected_option": r.selected_option,
            "is_correct": r.is_correct,
            "time_spent_seconds": r.time_spent_seconds,
            "is_marked_for_review": r.is_marked_for_review,
            "answered_at": r.answered_at.isoformat() if r.answered_at else None
        }
        for r in responses
    }
    
    # Get questions
    question_ids = [r.question_id for r in responses]
    questions = []
    for qid in question_ids:
        q_row = df[df["id"] == qid]
        if len(q_row) > 0:
            row = q_row.iloc[0]
            question = {
                "question_id": int(row.get("id", qid)),
                "json_question_id": str(row.get("json_question_id", "")),
                "question_text": str(row.get("question_text", "")),
                "option_a": str(row.get("option_a", "")),
                "option_b": str(row.get("option_b", "")),
                "option_c": str(row.get("option_c", "")),
                "option_d": str(row.get("option_d", "")),
                "correct_option": str(row.get("correct_option", "")),
                "exam": str(row.get("exam", "")),
                "year": int(row.get("year", 0)) if pd.notna(row.get("year")) else None,
                "subject": str(row.get("subject", "")),
                "topic": str(row.get("topic", "")),
                "topic_tag": str(row.get("topic_tag", "")) if "topic_tag" in row else None,
                "response": response_map.get(qid, {})
            }
            questions.append(question)
    
    return {
        "attempt_id": attempt.id,
        "exam_set": ExamSetResponse(
            id=attempt.exam_set.id,
            name=attempt.exam_set.name,
            description=attempt.exam_set.description,
            exam_type=attempt.exam_set.exam_type,
            exam_name=attempt.exam_set.exam_name,
            subject=attempt.exam_set.subject,
            topic=attempt.exam_set.topic,
            year_from=attempt.exam_set.year_from,
            year_to=attempt.exam_set.year_to,
            total_questions=attempt.exam_set.total_questions,
            duration_minutes=attempt.exam_set.duration_minutes,
            marks_per_question=attempt.exam_set.marks_per_question,
            negative_marking=attempt.exam_set.negative_marking,
            is_active=attempt.exam_set.is_active
        ),
        "questions": questions,
        "started_at": attempt.started_at.isoformat(),
        "submitted_at": attempt.submitted_at.isoformat() if attempt.submitted_at else None,
        "time_spent_seconds": attempt.time_spent_seconds,
        "status": attempt.status.value,
        "total_questions": attempt.total_questions,
        "questions_answered": attempt.questions_answered,
        "questions_correct": attempt.questions_correct,
        "questions_wrong": attempt.questions_wrong,
        "total_score": attempt.total_score
    }


@router.post("/attempt/{attempt_id}/answer")
def answer_question(
    attempt_id: int,
    request: AnswerQuestionRequest,
    session_id: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    """Save answer for a question"""
    user_id = get_user_id_from_session(session_id, db)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    attempt = db.query(ExamAttempt).filter(
        ExamAttempt.id == attempt_id,
        ExamAttempt.user_id == user_id
    ).first()
    
    if not attempt:
        raise HTTPException(status_code=404, detail="Exam attempt not found")
    
    if attempt.status != ExamAttemptStatus.IN_PROGRESS:
        raise HTTPException(status_code=400, detail="Exam attempt is not in progress")
    
    # Get or create response
    response = db.query(ExamQuestionResponse).filter(
        ExamQuestionResponse.exam_attempt_id == attempt_id,
        ExamQuestionResponse.question_id == request.question_id
    ).first()
    
    if not response:
        response = ExamQuestionResponse(
            exam_attempt_id=attempt_id,
            question_id=request.question_id
        )
        db.add(response)
    
    # Load question to check correct answer
    df = load_dataframe()
    if df is None:
        raise HTTPException(status_code=500, detail="Question data not available")
    
    q_row = df[df["id"] == request.question_id]
    if len(q_row) == 0:
        raise HTTPException(status_code=404, detail="Question not found")
    
    correct_option = str(q_row.iloc[0].get("correct_option", "")).upper().strip()
    selected_upper = request.selected_option.upper().strip() if request.selected_option else None
    
    # Determine if correct
    is_correct = None
    if selected_upper:
        if correct_option.startswith(selected_upper) or selected_upper.startswith(correct_option):
            is_correct = True
        else:
            is_correct = False
    
    # Update response
    response.selected_option = request.selected_option
    response.is_correct = is_correct
    response.is_marked_for_review = request.is_marked_for_review
    if request.selected_option and not response.answered_at:
        response.answered_at = datetime.utcnow()
    
    # Update attempt statistics
    if request.selected_option:
        # Count answered questions
        answered_count = db.query(ExamQuestionResponse).filter(
            ExamQuestionResponse.exam_attempt_id == attempt_id,
            ExamQuestionResponse.selected_option.isnot(None)
        ).count()
        
        correct_count = db.query(ExamQuestionResponse).filter(
            ExamQuestionResponse.exam_attempt_id == attempt_id,
            ExamQuestionResponse.is_correct == True
        ).count()
        
        wrong_count = db.query(ExamQuestionResponse).filter(
            ExamQuestionResponse.exam_attempt_id == attempt_id,
            ExamQuestionResponse.is_correct == False
        ).count()
        
        attempt.questions_answered = answered_count
        attempt.questions_correct = correct_count
        attempt.questions_wrong = wrong_count
        
        # Calculate score
        exam_set = attempt.exam_set
        score = (correct_count * exam_set.marks_per_question) - (wrong_count * exam_set.negative_marking)
        attempt.total_score = max(0.0, score)  # Score can't be negative
    
    db.commit()
    
    return {
        "success": True,
        "is_correct": is_correct,
        "correct_option": correct_option
    }


@router.post("/attempt/{attempt_id}/mark-review")
def mark_for_review(
    attempt_id: int,
    question_id: int,
    is_marked: bool = Query(True),
    session_id: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    """Mark question for review"""
    user_id = get_user_id_from_session(session_id, db)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    attempt = db.query(ExamAttempt).filter(
        ExamAttempt.id == attempt_id,
        ExamAttempt.user_id == user_id
    ).first()
    
    if not attempt:
        raise HTTPException(status_code=404, detail="Exam attempt not found")
    
    response = db.query(ExamQuestionResponse).filter(
        ExamQuestionResponse.exam_attempt_id == attempt_id,
        ExamQuestionResponse.question_id == question_id
    ).first()
    
    if not response:
        response = ExamQuestionResponse(
            exam_attempt_id=attempt_id,
            question_id=question_id
        )
        db.add(response)
    
    response.is_marked_for_review = is_marked
    db.commit()
    
    return {"success": True}


@router.post("/attempt/{attempt_id}/submit", response_model=SubmitExamResponse)
def submit_exam(
    attempt_id: int,
    session_id: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    """Submit exam attempt"""
    user_id = get_user_id_from_session(session_id, db)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    attempt = db.query(ExamAttempt).filter(
        ExamAttempt.id == attempt_id,
        ExamAttempt.user_id == user_id
    ).first()
    
    if not attempt:
        raise HTTPException(status_code=404, detail="Exam attempt not found")
    
    if attempt.status != ExamAttemptStatus.IN_PROGRESS:
        raise HTTPException(status_code=400, detail="Exam attempt is not in progress")
    
    # Calculate final statistics
    responses = db.query(ExamQuestionResponse).filter(
        ExamQuestionResponse.exam_attempt_id == attempt_id
    ).all()
    
    answered_count = sum(1 for r in responses if r.selected_option is not None)
    correct_count = sum(1 for r in responses if r.is_correct == True)
    wrong_count = sum(1 for r in responses if r.is_correct == False)
    
    # Calculate score
    exam_set = attempt.exam_set
    score = (correct_count * exam_set.marks_per_question) - (wrong_count * exam_set.negative_marking)
    total_score = max(0.0, score)
    
    # Calculate time spent
    time_spent = (datetime.utcnow() - attempt.started_at).total_seconds()
    
    # Update attempt
    attempt.submitted_at = datetime.utcnow()
    attempt.time_spent_seconds = int(time_spent)
    attempt.questions_answered = answered_count
    attempt.questions_correct = correct_count
    attempt.questions_wrong = wrong_count
    attempt.total_score = total_score
    attempt.status = ExamAttemptStatus.SUBMITTED
    
    db.commit()
    db.refresh(attempt)
    
    accuracy = (correct_count / answered_count * 100) if answered_count > 0 else 0.0
    
    return SubmitExamResponse(
        attempt_id=attempt.id,
        total_score=total_score,
        questions_answered=answered_count,
        questions_correct=correct_count,
        questions_wrong=wrong_count,
        accuracy=round(accuracy, 2),
        submitted_at=attempt.submitted_at
    )


@router.get("/attempt/{attempt_id}/analysis")
def get_exam_analysis(
    attempt_id: int,
    session_id: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    """Get detailed performance analysis for an exam attempt"""
    user_id = get_user_id_from_session(session_id, db)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    attempt = db.query(ExamAttempt).filter(
        ExamAttempt.id == attempt_id,
        ExamAttempt.user_id == user_id
    ).first()
    
    if not attempt:
        raise HTTPException(status_code=404, detail="Exam attempt not found")
    
    if attempt.status != ExamAttemptStatus.SUBMITTED:
        raise HTTPException(status_code=400, detail="Exam must be submitted to view analysis")
    
    # Get all responses
    responses = db.query(ExamQuestionResponse).filter(
        ExamQuestionResponse.exam_attempt_id == attempt_id
    ).all()
    
    # Load questions
    df = load_dataframe()
    if df is None:
        raise HTTPException(status_code=500, detail="Question data not available")
    
    # Calculate rank and percentile
    all_attempts = db.query(ExamAttempt).filter(
        ExamAttempt.exam_set_id == attempt.exam_set_id,
        ExamAttempt.status == ExamAttemptStatus.SUBMITTED
    ).order_by(ExamAttempt.total_score.desc()).all()
    
    user_rank = 1
    for idx, att in enumerate(all_attempts, 1):
        if att.id == attempt.id:
            user_rank = idx
            break
    
    total_attempts = len(all_attempts)
    percentile = ((total_attempts - user_rank) / total_attempts * 100) if total_attempts > 0 else 0
    
    # Section-wise analysis
    section_analysis = {}
    weak_areas = {}
    
    for response in responses:
        q_row = df[df["id"] == response.question_id]
        if len(q_row) == 0:
            continue
        
        row = q_row.iloc[0]
        subject = str(row.get("subject", "Uncategorized"))
        topic = str(row.get("topic_tag", "")) if "topic_tag" in row else str(row.get("topic", "Uncategorized"))
        
        # Section analysis (using subject as section)
        if subject not in section_analysis:
            section_analysis[subject] = {
                "section_name": subject,
                "total_questions": 0,
                "answered": 0,
                "correct": 0,
                "wrong": 0,
                "not_answered": 0,
                "marked_for_review": 0,
                "not_visited": 0,
                "score": 0.0,
                "accuracy": 0.0,
                "time_spent": 0
            }
        
        section = section_analysis[subject]
        section["total_questions"] += 1
        section["time_spent"] += response.time_spent_seconds
        
        if response.selected_option is None:
            section["not_answered"] += 1
            section["not_visited"] += 1
        else:
            section["answered"] += 1
            if response.is_correct:
                section["correct"] += 1
                section["score"] += attempt.exam_set.marks_per_question
            elif response.is_correct == False:
                section["wrong"] += 1
                section["score"] -= attempt.exam_set.negative_marking
        
        if response.is_marked_for_review:
            section["marked_for_review"] += 1
        
        # Weak areas analysis
        if subject not in weak_areas:
            weak_areas[subject] = {
                "subject": subject,
                "total_questions": 0,
                "correct": 0,
                "wrong": 0,
                "not_answered": 0,
                "question_ids": []
            }
        
        area = weak_areas[subject]
        area["total_questions"] += 1
        area["question_ids"].append(response.question_id)
        
        if response.is_correct:
            area["correct"] += 1
        elif response.is_correct == False:
            area["wrong"] += 1
        else:
            area["not_answered"] += 1
    
    # Calculate accuracy for sections
    for section in section_analysis.values():
        if section["answered"] > 0:
            section["accuracy"] = round((section["correct"] / section["answered"]) * 100, 2)
        section["score"] = round(max(0.0, section["score"]), 2)
    
    # Calculate weak areas (accuracy < 50%)
    weak_chapters = []
    for subject, area in weak_areas.items():
        total_attempted = area["correct"] + area["wrong"]
        if total_attempted > 0:
            accuracy = (area["correct"] / total_attempted) * 100
            if accuracy < 50:
                weak_chapters.append({
                    "subject": subject,
                    "correct_percentage": round(accuracy, 2),
                    "total_questions": area["total_questions"],
                    "correct": area["correct"],
                    "wrong": area["wrong"],
                    "not_answered": area["not_answered"],
                    "question_ids": area["question_ids"]
                })
    
    # Calculate cutoff gap (if we have a cutoff, otherwise use average)
    avg_score = sum(att.total_score for att in all_attempts) / len(all_attempts) if all_attempts else 0
    cutoff_gap = max(0.0, avg_score - attempt.total_score)
    
    return {
        "attempt_id": attempt.id,
        "overall_performance": {
            "rank": user_rank,
            "total_attempts": total_attempts,
            "score": attempt.total_score,
            "total_marks": attempt.exam_set.total_questions * attempt.exam_set.marks_per_question,
            "attempted": attempt.questions_answered,
            "total_questions": attempt.total_questions,
            "correct": attempt.questions_correct,
            "wrong": attempt.questions_wrong,
            "accuracy": round((attempt.questions_correct / attempt.questions_answered * 100) if attempt.questions_answered > 0 else 0, 2),
            "percentile": round(percentile, 2),
            "cutoff_gap": round(cutoff_gap, 2),
            "average_score": round(avg_score, 2)
        },
        "sectional_summary": list(section_analysis.values()),
        "weak_areas": {
            "weak_chapters": sorted(weak_chapters, key=lambda x: x["correct_percentage"]),
            "uncategorized": []
        }
    }


@router.get("/attempt/{attempt_id}/solutions")
def get_exam_solutions(
    attempt_id: int,
    session_id: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    """Get solutions for all questions in the exam attempt"""
    user_id = get_user_id_from_session(session_id, db)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    attempt = db.query(ExamAttempt).filter(
        ExamAttempt.id == attempt_id,
        ExamAttempt.user_id == user_id
    ).first()
    
    if not attempt:
        raise HTTPException(status_code=404, detail="Exam attempt not found")
    
    # Get responses
    responses = db.query(ExamQuestionResponse).filter(
        ExamQuestionResponse.exam_attempt_id == attempt_id
    ).all()
    
    # Load questions
    df = load_dataframe()
    if df is None:
        raise HTTPException(status_code=500, detail="Question data not available")
    
    solutions = []
    for response in responses:
        q_row = df[df["id"] == response.question_id]
        if len(q_row) == 0:
            continue
        
        row = q_row.iloc[0]
        solutions.append({
            "question_id": response.question_id,
            "question_text": str(row.get("question_text", "")),
            "option_a": str(row.get("option_a", "")),
            "option_b": str(row.get("option_b", "")),
            "option_c": str(row.get("option_c", "")),
            "option_d": str(row.get("option_d", "")),
            "correct_option": str(row.get("correct_option", "")),
            "selected_option": response.selected_option,
            "is_correct": response.is_correct,
            "time_spent_seconds": response.time_spent_seconds,
            "exam": str(row.get("exam", "")),
            "subject": str(row.get("subject", "")),
            "topic": str(row.get("topic", "")),
            "year": int(row.get("year", 0)) if pd.notna(row.get("year")) else None
        })
    
    return {
        "attempt_id": attempt_id,
        "solutions": solutions
    }


@router.get("/attempt/{attempt_id}/solutions/{question_id}")
def get_question_solution(
    attempt_id: int,
    question_id: int,
    session_id: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    """Get solution for a specific question"""
    user_id = get_user_id_from_session(session_id, db)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    attempt = db.query(ExamAttempt).filter(
        ExamAttempt.id == attempt_id,
        ExamAttempt.user_id == user_id
    ).first()
    
    if not attempt:
        raise HTTPException(status_code=404, detail="Exam attempt not found")
    
    response = db.query(ExamQuestionResponse).filter(
        ExamQuestionResponse.exam_attempt_id == attempt_id,
        ExamQuestionResponse.question_id == question_id
    ).first()
    
    if not response:
        raise HTTPException(status_code=404, detail="Question response not found")
    
    # Load question
    df = load_dataframe()
    if df is None:
        raise HTTPException(status_code=500, detail="Question data not available")
    
    q_row = df[df["id"] == question_id]
    if len(q_row) == 0:
        raise HTTPException(status_code=404, detail="Question not found")
    
    row = q_row.iloc[0]
    
    return {
        "question_id": question_id,
        "question_text": str(row.get("question_text", "")),
        "option_a": str(row.get("option_a", "")),
        "option_b": str(row.get("option_b", "")),
        "option_c": str(row.get("option_c", "")),
        "option_d": str(row.get("option_d", "")),
        "correct_option": str(row.get("correct_option", "")),
        "selected_option": response.selected_option,
        "is_correct": response.is_correct,
        "time_spent_seconds": response.time_spent_seconds,
        "exam": str(row.get("exam", "")),
        "subject": str(row.get("subject", "")),
        "topic": str(row.get("topic", "")),
        "year": int(row.get("year", 0)) if pd.notna(row.get("year")) else None
    }


@router.post("/attempt/{attempt_id}/reattempt")
def reattempt_exam(
    attempt_id: int,
    session_id: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    """Create a new attempt from the same exam set"""
    user_id = get_user_id_from_session(session_id, db)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    old_attempt = db.query(ExamAttempt).filter(
        ExamAttempt.id == attempt_id,
        ExamAttempt.user_id == user_id
    ).first()
    
    if not old_attempt:
        raise HTTPException(status_code=404, detail="Exam attempt not found")
    
    # Start new attempt with same exam set
    return start_exam(
        StartExamRequest(exam_set_id=old_attempt.exam_set_id),
        session_id=session_id,
        db=db
    )

