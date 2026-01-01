# app/translation_cache.py
"""
Persistent Translation Cache - SQLite database based
Shared across all users to reduce translation API costs
"""
import sys
import os
from pathlib import Path
from typing import Optional
from datetime import datetime
from sqlalchemy.orm import Session

# Add utils path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.database import SessionLocal, TranslationCache


class PersistentTranslationCache:
    """SQLite database-based cache for translations"""
    
    def __init__(self, enabled: bool = True):
        """
        Initialize persistent translation cache
        
        Args:
            enabled: Whether cache is enabled (default: True)
        """
        self.enabled = enabled
        if self.enabled:
            print(f"✅ Persistent translation cache enabled (SQLite database)")
        else:
            print("⚠️ Persistent translation cache disabled")
    
    def get(self, cache_key: str) -> Optional[str]:
        """
        Get cached translation if available
        
        Args:
            cache_key: Cache key (e.g., "q_12345_question_text_hi")
            
        Returns:
            Translated text or None if not found
        """
        if not self.enabled:
            return None
        
        db = SessionLocal()
        try:
            cached = db.query(TranslationCache).filter(
                TranslationCache.cache_key == cache_key
            ).first()
            
            if cached:
                # Update hit count and last_used_at
                cached.hit_count += 1
                cached.last_used_at = datetime.utcnow()
                db.commit()
                
                return cached.translated_text
            
            return None
        except Exception as e:
            print(f"⚠️ Error reading from translation cache: {e}")
            db.rollback()
            return None
        finally:
            db.close()
    
    def set(self, cache_key: str, translated_text: str, question_id: Optional[int] = None, field: str = "text", target_language: str = "hi"):
        """
        Store translation in cache with retry logic for database locks
        
        Args:
            cache_key: Cache key (e.g., "q_12345_question_text_hi")
            translated_text: Translated text to cache
            question_id: Optional question ID
            field: Field name ("question_text", "option_a", etc.)
            target_language: Target language code (default: "hi")
        """
        if not self.enabled:
            return
        
        # Retry logic for database locks (SQLite concurrency issue)
        max_retries = 3
        base_delay = 0.1  # 100ms base delay
        
        for attempt in range(max_retries):
            db = SessionLocal()
            try:
                # Check if already exists
                existing = db.query(TranslationCache).filter(
                    TranslationCache.cache_key == cache_key
                ).first()
                
                if existing:
                    # Update existing entry
                    existing.translated_text = translated_text
                    existing.last_used_at = datetime.utcnow()
                else:
                    # Create new entry
                    new_cache = TranslationCache(
                        cache_key=cache_key,
                        question_id=question_id,
                        field=field,
                        target_language=target_language,
                        translated_text=translated_text,
                        hit_count=0,
                        created_at=datetime.utcnow(),
                        last_used_at=datetime.utcnow()
                    )
                    db.add(new_cache)
                
                db.commit()
                # Success - exit retry loop
                return
                
            except Exception as e:
                error_str = str(e).lower()
                db.rollback()
                
                # Check if it's a UNIQUE constraint error (race condition - another request already inserted it)
                if "unique constraint" in error_str or "duplicate" in error_str:
                    # Another request already inserted this cache entry
                    # Try to update it instead (or just ignore - entry already exists)
                    update_db = SessionLocal()
                    try:
                        existing = update_db.query(TranslationCache).filter(
                            TranslationCache.cache_key == cache_key
                        ).first()
                        if existing:
                            existing.translated_text = translated_text
                            existing.last_used_at = datetime.utcnow()
                            update_db.commit()
                        # Success - entry exists and was updated (or already exists)
                        return
                    except Exception as update_err:
                        # If update also fails, just ignore - entry already exists
                        update_db.rollback()
                        return  # Entry exists, no need to retry
                    finally:
                        update_db.close()
                
                # Check if it's a database lock error
                if "database is locked" in error_str or "locked" in error_str:
                    if attempt < max_retries - 1:
                        # Retry with exponential backoff
                        import time
                        delay = base_delay * (2 ** attempt)  # 0.1s, 0.2s, 0.4s
                        time.sleep(delay)
                        continue
                    else:
                        # Max retries reached - fail silently (in-memory cache still works)
                        # Don't log every failure to avoid terminal spam
                        if attempt == max_retries - 1:
                            # Only log on final failure, and only occasionally
                            import random
                            if random.random() < 0.1:  # Log 10% of failures to avoid spam
                                print(f"⚠️ Translation cache write failed after {max_retries} retries (database locked): {cache_key[:50]}")
                else:
                    # Other errors - log and exit (but don't spam for UNIQUE constraint)
                    if "unique constraint" not in error_str:
                        print(f"⚠️ Error writing to translation cache: {e}")
                    return
            finally:
                db.close()
        
        # If we get here, all retries failed
        # In-memory cache will still work, so this is not critical


# Global instance
_persistent_cache = None

def get_translation_cache(enabled: bool = True) -> PersistentTranslationCache:
    """Get or create global translation cache instance"""
    global _persistent_cache
    if _persistent_cache is None:
        _persistent_cache = PersistentTranslationCache(enabled=enabled)
    return _persistent_cache

