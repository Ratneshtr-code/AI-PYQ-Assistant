# app/production_cache.py
"""
Production Cache for LLM responses - SQLite database based
Shared across all users to reduce costs
"""
import sys
import os
from pathlib import Path
from typing import Optional, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func

# Add utils path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from utils.config_loader import load_config
from app.database import get_db, LLMExplanation, SessionLocal


class ProductionCache:
    """SQLite database-based cache for production use"""
    
    def __init__(self, enabled: Optional[bool] = None):
        """
        Initialize production cache
        
        Args:
            enabled: Whether cache is enabled (default: from config.yaml)
        """
        # Load config
        cfg = load_config()
        llm_config = cfg.get("llm", {})
        production_cache_config = llm_config.get("production_cache", {})
        
        # Get enabled status from config (if not provided)
        if enabled is None:
            self.enabled = production_cache_config.get("enabled", False)
        else:
            self.enabled = enabled
        
        if self.enabled:
            print(f"✅ Production cache enabled (SQLite database)")
        else:
            print("⚠️ Production cache disabled")
    
    def generate_cache_key(
        self, 
        question_id: Optional[int], 
        explanation_type: str,
        option_letter: Optional[str] = None,
        is_correct: Optional[bool] = None
    ) -> str:
        """
        Generate cache key - same format as testing cache for consistency
        
        Args:
            question_id: The question ID (from database or CSV)
            explanation_type: "concept", "correct_option", or "wrong_option"
            option_letter: Optional option letter (A, B, C, D) for option explanations
            is_correct: Optional boolean indicating if option is correct
            
        Returns:
            Cache key string (e.g., "question_concept_12345" or "question_option_12345_A_true")
        """
        if not question_id:
            # Fallback: generate hash if no question_id available
            import hashlib
            return f"unknown_{explanation_type}_{hashlib.md5(str(datetime.now()).encode()).hexdigest()[:8]}"
        
        if explanation_type == "concept":
            return f"question_concept_{question_id}"
        elif explanation_type in ["correct_option", "wrong_option"]:
            if option_letter and is_correct is not None:
                return f"question_option_{question_id}_{option_letter}_{str(is_correct).lower()}"
            else:
                return f"question_option_{question_id}_unknown"
        else:
            return f"question_{explanation_type}_{question_id}"
    
    def get(
        self, 
        question_id: Optional[int],
        explanation_type: str,
        option_letter: Optional[str] = None,
        is_correct: Optional[bool] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Get cached response if available
        
        Args:
            question_id: The question ID
            explanation_type: "concept", "correct_option", or "wrong_option"
            option_letter: Optional option letter for option explanations
            is_correct: Optional boolean for option explanations
            
        Returns:
            Dict with 'response' and metadata, or None if not found
        """
        if not self.enabled:
            return None
        
        cache_key = self.generate_cache_key(question_id, explanation_type, option_letter, is_correct)
        
        db = SessionLocal()
        try:
            cached = db.query(LLMExplanation).filter(
                LLMExplanation.cache_key == cache_key
            ).first()
            
            if cached:
                # Update hit count and last_used_at
                cached.hit_count += 1
                cached.last_used_at = datetime.utcnow()
                db.commit()
                
                print(f"💾 Production Cache HIT: {cache_key} (saved tokens!)")
                
                return {
                    'response': cached.response_text,
                    'cache_key': cache_key,
                    'hit_count': cached.hit_count,
                    'model': cached.model_name,
                    'created_at': cached.created_at,
                    'source': 'production_cache'  # Clear identifier for production cache
                }
            
            return None
        except Exception as e:
            print(f"⚠️ Error reading from production cache: {e}")
            db.rollback()
            return None
        finally:
            db.close()
    
    def set(
        self, 
        question_id: Optional[int],
        explanation_type: str,
        response: str,
        option_letter: Optional[str] = None,
        is_correct: Optional[bool] = None,
        model: Optional[str] = None,
        exam: Optional[str] = None,
        subject: Optional[str] = None,
        topic: Optional[str] = None,
        year: Optional[int] = None,
        input_tokens: Optional[int] = None,
        output_tokens: Optional[int] = None
    ):
        """
        Store response in production cache
        
        Args:
            question_id: The question ID
            explanation_type: "concept", "correct_option", or "wrong_option"
            response: The LLM response to cache
            option_letter: Optional option letter for option explanations
            is_correct: Optional boolean for option explanations
            model: Model name used
            exam: Optional exam name
            subject: Optional subject
            topic: Optional topic
            year: Optional year
            input_tokens: Optional input token count
            output_tokens: Optional output token count
        """
        if not self.enabled:
            return
        
        cache_key = self.generate_cache_key(question_id, explanation_type, option_letter, is_correct)
        
        db = SessionLocal()
        try:
            # Check if already exists
            existing = db.query(LLMExplanation).filter(
                LLMExplanation.cache_key == cache_key
            ).first()
            
            if existing:
                # Update existing entry
                existing.response_text = response
                existing.last_used_at = datetime.utcnow()
                existing.updated_at = datetime.utcnow()
                if model:
                    existing.model_name = model
                if exam:
                    existing.exam = exam
                if subject:
                    existing.subject = subject
                if topic:
                    existing.topic = topic
                if year:
                    existing.year = year
                if input_tokens and output_tokens:
                    existing.tokens_saved = input_tokens + output_tokens
            else:
                # Create new entry
                new_entry = LLMExplanation(
                    cache_key=cache_key,
                    question_id=question_id,
                    explanation_type=explanation_type,
                    option_letter=option_letter,
                    is_correct=is_correct,
                    response_text=response,
                    model_name=model,
                    exam=exam,
                    subject=subject,
                    topic=topic,
                    year=year,
                    hit_count=0,
                    tokens_saved=(input_tokens + output_tokens) if (input_tokens and output_tokens) else 0
                )
                db.add(new_entry)
            
            db.commit()
            print(f"💾 Production Cache SAVE: {cache_key}")
        except Exception as e:
            print(f"⚠️ Error saving to production cache: {e}")
            db.rollback()
        finally:
            db.close()
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        if not self.enabled:
            return {
                'enabled': False,
                'cached_responses': 0,
                'total_hits': 0,
                'total_tokens_saved': 0
            }
        
        db = SessionLocal()
        try:
            total_entries = db.query(LLMExplanation).count()
            total_hits = db.query(func.sum(LLMExplanation.hit_count)).scalar() or 0
            total_tokens = db.query(func.sum(LLMExplanation.tokens_saved)).scalar() or 0
            
            return {
                'enabled': True,
                'cached_responses': total_entries,
                'total_hits': total_hits,
                'total_tokens_saved': total_tokens
            }
        except Exception as e:
            print(f"⚠️ Error getting cache stats: {e}")
            return {
                'enabled': True,
                'cached_responses': 0,
                'total_hits': 0,
                'total_tokens_saved': 0
            }
        finally:
            db.close()


# Global instance
_production_cache: Optional[ProductionCache] = None


def get_production_cache(enabled: Optional[bool] = None) -> ProductionCache:
    """
    Get or create production cache instance
    
    Args:
        enabled: Whether cache is enabled (default: from config.yaml)
    
    Returns:
        ProductionCache instance
    """
    global _production_cache
    
    if _production_cache is None:
        _production_cache = ProductionCache(enabled=enabled)
    
    return _production_cache

