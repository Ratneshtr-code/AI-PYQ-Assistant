# app/notes_api.py
"""
Notes API endpoints for saving, viewing, and managing user notes
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc, asc
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import json

from app.database import get_db, User, UserNote, NoteType, SubscriptionPlan
from app.auth import get_current_user

router = APIRouter(prefix="/notes", tags=["notes"])


# Pydantic models
class NoteSaveRequest(BaseModel):
    note_type: str  # "question" | "explanation"
    question_data: Optional[Dict[str, Any]] = None
    explanation_text: Optional[str] = None
    explanation_type: Optional[str] = None  # "concept" | "option"
    option_letter: Optional[str] = None
    is_correct: Optional[bool] = None
    custom_notes: Optional[str] = None
    tags: Optional[List[str]] = None


class NoteUpdateRequest(BaseModel):
    tags: Optional[List[str]] = None
    custom_notes: Optional[str] = None


class NoteResponse(BaseModel):
    id: int
    note_type: str
    question_id: Optional[int]
    question_data: Optional[Dict[str, Any]]
    explanation_text: Optional[str]
    explanation_type: Optional[str]
    option_letter: Optional[str]
    is_correct: Optional[bool]
    exam: Optional[str]
    subject: Optional[str]
    topic: Optional[str]
    year: Optional[int]
    tags: List[str]
    custom_notes: Optional[str]
    created_at: datetime
    updated_at: datetime


class NotesListResponse(BaseModel):
    notes: List[NoteResponse]
    total: int
    page: int
    page_size: int


class NotesStatsResponse(BaseModel):
    total_notes: int
    questions_count: int
    explanations_count: int
    by_exam: Dict[str, int]
    by_subject: Dict[str, int]
    by_year: Dict[int, int]


def check_premium_access(user: User):
    """Check if user has premium subscription"""
    if user.subscription_plan != SubscriptionPlan.PREMIUM:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Premium subscription required to access this feature. Please upgrade to premium."
        )


@router.post("/save", response_model=Dict[str, Any])
async def save_note(
    note_data: NoteSaveRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Save a question or explanation note.
    Available to all authenticated users (free users can save but can't view).
    """
    print(f"📝 Save note request from user {current_user.id} ({current_user.email})")
    print(f"   Note type: {note_data.note_type}")
    try:
        # Validate note_type
        try:
            note_type = NoteType(note_data.note_type.lower())
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid note_type: {note_data.note_type}. Must be 'question' or 'explanation'"
            )
        
        # Extract metadata from question_data if provided
        exam = None
        subject = None
        topic = None
        year = None
        question_id = None
        
        if note_data.question_data:
            exam = note_data.question_data.get("exam")
            subject = note_data.question_data.get("subject")
            topic = note_data.question_data.get("topic") or note_data.question_data.get("topic_tag")
            year = note_data.question_data.get("year")
            question_id = note_data.question_data.get("id") or note_data.question_data.get("question_id") or note_data.question_data.get("json_question_id")
            
            # Convert year to int if it's a string
            if year and isinstance(year, str):
                try:
                    year = int(year)
                except ValueError:
                    year = None
        
        # Create note
        note = UserNote(
            user_id=current_user.id,
            note_type=note_type,
            question_id=question_id,
            explanation_text=note_data.explanation_text,
            explanation_type=note_data.explanation_type,
            option_letter=note_data.option_letter,
            is_correct=note_data.is_correct,
            exam=exam,
            subject=subject,
            topic=topic,
            year=year,
            custom_notes=note_data.custom_notes
        )
        
        # Set question_data and tags
        if note_data.question_data:
            note.set_question_data(note_data.question_data)
        if note_data.tags:
            note.set_tags(note_data.tags)
        
        db.add(note)
        db.commit()
        db.refresh(note)
        
        print(f"✅ Note saved successfully: ID={note.id}, Type={note.note_type.value}, User={current_user.id}")
        
        return {
            "success": True,
            "note_id": note.id,
            "message": "Note saved successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Error saving note: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error saving note: {str(e)}"
        )


@router.get("", response_model=NotesListResponse)
async def get_notes(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    note_type: Optional[str] = Query(None),
    exam: Optional[str] = Query(None),
    subject: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
    sort_by: Optional[str] = Query("date", regex="^(date|exam|subject|year)$"),
    sort_order: Optional[str] = Query("desc", regex="^(asc|desc)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all user's notes with pagination and filters.
    Requires premium subscription.
    """
    check_premium_access(current_user)
    
    # Build query
    query = db.query(UserNote).filter(UserNote.user_id == current_user.id)
    
    # Apply filters
    if note_type:
        try:
            note_type_enum = NoteType(note_type.lower())
            query = query.filter(UserNote.note_type == note_type_enum)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid note_type: {note_type}"
            )
    
    if exam:
        query = query.filter(UserNote.exam == exam)
    if subject:
        query = query.filter(UserNote.subject == subject)
    if year:
        query = query.filter(UserNote.year == year)
    
    # Get total count
    total = query.count()
    
    # Apply sorting
    if sort_by == "date":
        order_func = desc if sort_order == "desc" else asc
        query = query.order_by(order_func(UserNote.created_at))
    elif sort_by == "exam":
        order_func = desc if sort_order == "desc" else asc
        query = query.order_by(order_func(UserNote.exam), desc(UserNote.created_at))
    elif sort_by == "subject":
        order_func = desc if sort_order == "desc" else asc
        query = query.order_by(order_func(UserNote.subject), desc(UserNote.created_at))
    elif sort_by == "year":
        order_func = desc if sort_order == "desc" else asc
        query = query.order_by(order_func(UserNote.year), desc(UserNote.created_at))
    
    # Apply pagination
    offset = (page - 1) * page_size
    notes = query.offset(offset).limit(page_size).all()
    
    # Convert to response format
    notes_response = []
    for note in notes:
        notes_response.append(NoteResponse(
            id=note.id,
            note_type=note.note_type.value,
            question_id=note.question_id,
            question_data=note.get_question_data(),
            explanation_text=note.explanation_text,
            explanation_type=note.explanation_type,
            option_letter=note.option_letter,
            is_correct=note.is_correct,
            exam=note.exam,
            subject=note.subject,
            topic=note.topic,
            year=note.year,
            tags=note.get_tags(),
            custom_notes=note.custom_notes,
            created_at=note.created_at,
            updated_at=note.updated_at
        ))
    
    return NotesListResponse(
        notes=notes_response,
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/{note_id}", response_model=NoteResponse)
async def get_note(
    note_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a single note by ID.
    Requires premium subscription.
    """
    check_premium_access(current_user)
    
    note = db.query(UserNote).filter(
        UserNote.id == note_id,
        UserNote.user_id == current_user.id
    ).first()
    
    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found"
        )
    
    return NoteResponse(
        id=note.id,
        note_type=note.note_type.value,
        question_id=note.question_id,
        question_data=note.get_question_data(),
        explanation_text=note.explanation_text,
        explanation_type=note.explanation_type,
        option_letter=note.option_letter,
        is_correct=note.is_correct,
        exam=note.exam,
        subject=note.subject,
        topic=note.topic,
        year=note.year,
        tags=note.get_tags(),
        custom_notes=note.custom_notes,
        created_at=note.created_at,
        updated_at=note.updated_at
    )


@router.delete("/{note_id}")
async def delete_note(
    note_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a note.
    Available to all authenticated users.
    """
    note = db.query(UserNote).filter(
        UserNote.id == note_id,
        UserNote.user_id == current_user.id
    ).first()
    
    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found"
        )
    
    db.delete(note)
    db.commit()
    
    return {"success": True, "message": "Note deleted successfully"}


@router.put("/{note_id}", response_model=NoteResponse)
async def update_note(
    note_id: int,
    note_update: NoteUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update a note (tags and custom_notes).
    Available to all authenticated users.
    """
    note = db.query(UserNote).filter(
        UserNote.id == note_id,
        UserNote.user_id == current_user.id
    ).first()
    
    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found"
        )
    
    if note_update.tags is not None:
        note.set_tags(note_update.tags)
    if note_update.custom_notes is not None:
        note.custom_notes = note_update.custom_notes
    
    db.commit()
    db.refresh(note)
    
    return NoteResponse(
        id=note.id,
        note_type=note.note_type.value,
        question_id=note.question_id,
        question_data=note.get_question_data(),
        explanation_text=note.explanation_text,
        explanation_type=note.explanation_type,
        option_letter=note.option_letter,
        is_correct=note.is_correct,
        exam=note.exam,
        subject=note.subject,
        topic=note.topic,
        year=note.year,
        tags=note.get_tags(),
        custom_notes=note.custom_notes,
        created_at=note.created_at,
        updated_at=note.updated_at
    )


@router.get("/stats/summary", response_model=NotesStatsResponse)
async def get_notes_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get statistics about user's notes.
    Requires premium subscription.
    """
    check_premium_access(current_user)
    
    # Get all user notes
    notes = db.query(UserNote).filter(UserNote.user_id == current_user.id).all()
    
    total_notes = len(notes)
    questions_count = sum(1 for n in notes if n.note_type == NoteType.QUESTION)
    explanations_count = sum(1 for n in notes if n.note_type == NoteType.EXPLANATION)
    
    # Count by exam
    by_exam = {}
    for note in notes:
        if note.exam:
            by_exam[note.exam] = by_exam.get(note.exam, 0) + 1
    
    # Count by subject
    by_subject = {}
    for note in notes:
        if note.subject:
            by_subject[note.subject] = by_subject.get(note.subject, 0) + 1
    
    # Count by year
    by_year = {}
    for note in notes:
        if note.year:
            by_year[note.year] = by_year.get(note.year, 0) + 1
    
    return NotesStatsResponse(
        total_notes=total_notes,
        questions_count=questions_count,
        explanations_count=explanations_count,
        by_exam=by_exam,
        by_subject=by_subject,
        by_year=by_year
    )


@router.get("/check-saved/{question_id}")
async def check_saved(
    question_id: int,
    explanation_type: Optional[str] = Query(None),
    option_letter: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Check if a question or explanation is already saved.
    Available to all authenticated users.
    """
    query = db.query(UserNote).filter(
        UserNote.user_id == current_user.id,
        UserNote.question_id == question_id
    )
    
    # If checking for explanation, filter by explanation_type and option_letter
    if explanation_type:
        query = query.filter(UserNote.explanation_type == explanation_type)
    if option_letter:
        query = query.filter(UserNote.option_letter == option_letter)
    
    note = query.first()
    
    return {
        "is_saved": note is not None,
        "note_id": note.id if note else None
    }

