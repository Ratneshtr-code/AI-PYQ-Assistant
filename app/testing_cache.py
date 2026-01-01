# app/testing_cache.py
"""
Testing/Development Cache for LLM responses
Prevents burning tokens during testing by caching responses locally

NOTE: This is DIFFERENT from production cache!
- Testing Cache: JSON file, for development/testing only
- Production Cache: SQLite database, for real users (to be implemented)
"""
import os
import json
import hashlib
import sys
from pathlib import Path
from typing import Optional, Dict, Any
from datetime import datetime

# Add utils path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from utils.config_loader import load_config


class TestingCache:
    """Local file-based cache for testing/development"""
    
    def __init__(self, cache_dir: Optional[str] = None, enabled: Optional[bool] = None):
        """
        Initialize testing cache
        
        Args:
            cache_dir: Directory to store cache files (default: from config or ./data/testing_cache)
            enabled: Whether cache is enabled (default: from config.yaml)
        """
        # Load config
        cfg = load_config()
        llm_config = cfg.get("llm", {})
        testing_cache_config = llm_config.get("testing_cache", {})
        
        # Get enabled status from config (if not provided)
        if enabled is None:
            self.enabled = testing_cache_config.get("enabled", True)
        else:
            self.enabled = enabled
        
        # Get cache directory from config (if not provided)
        if cache_dir is None:
            cache_dir = testing_cache_config.get("cache_dir", "./data/testing_cache")
        
        # Convert to Path object
        if isinstance(cache_dir, str):
            # If relative path, make it relative to project root
            if not os.path.isabs(cache_dir):
                project_root = Path(__file__).parent.parent
                self.cache_dir = project_root / cache_dir
            else:
                self.cache_dir = Path(cache_dir)
        else:
            self.cache_dir = cache_dir
        
        if cache_dir:
            self.cache_dir = Path(cache_dir)
        else:
            # Default to project data directory
            self.cache_dir = Path(__file__).parent.parent / "data" / "testing_cache"
        
        # Create cache directory if it doesn't exist
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        
        # Cache file path
        self.cache_file = self.cache_dir / "llm_responses.json"
        
        # Load existing cache
        self.cache = self._load_cache()
        
        if self.enabled:
            print(f"✅ Testing cache enabled: {self.cache_file}")
            print(f"   Cached responses: {len(self.cache)}")
        else:
            print("⚠️ Testing cache disabled - all requests will hit API")
    
    def _load_cache(self) -> Dict[str, Any]:
        """Load cache from file"""
        if not self.cache_file.exists():
            return {}
        
        try:
            with open(self.cache_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"⚠️ Error loading cache: {e}")
            return {}
    
    def _save_cache(self):
        """Save cache to file"""
        try:
            with open(self.cache_file, 'w', encoding='utf-8') as f:
                json.dump(self.cache, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"⚠️ Error saving cache: {e}")
    
    def generate_cache_key(
        self, 
        question_id: Optional[int], 
        explanation_type: str,
        option_letter: Optional[str] = None,
        is_correct: Optional[bool] = None
    ) -> str:
        """
        Generate cache key - language-agnostic (LLM generates English, we translate if needed)
        
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
    ) -> Optional[str]:
        """
        Get cached response if available (returns English explanation, translate separately if needed)
        
        Args:
            question_id: The question ID
            explanation_type: "concept", "correct_option", or "wrong_option"
            option_letter: Optional option letter for option explanations
            is_correct: Optional boolean for option explanations
            
        Returns:
            Cached response text (English) or None if not found
        """
        if not self.enabled:
            return None
        
        cache_key = self.generate_cache_key(question_id, explanation_type, option_letter, is_correct)
        
        if cache_key in self.cache:
            cached_data = self.cache[cache_key]
            print(f"💾 Cache HIT: {cache_key} (saved tokens!)")
            return cached_data.get('response')
        
        return None
    
    def set(
        self, 
        question_id: Optional[int],
        explanation_type: str,
        response: str,
        option_letter: Optional[str] = None,
        is_correct: Optional[bool] = None,
        model: Optional[str] = None,
        exam: Optional[str] = None
    ):
        """
        Store response in cache
        
        Args:
            question_id: The question ID
            explanation_type: "concept", "correct_option", or "wrong_option"
            response: The LLM response to cache
            option_letter: Optional option letter for option explanations
            is_correct: Optional boolean for option explanations
            model: Optional model name for reference
            exam: Optional exam name for reference
        """
        if not self.enabled:
            return
        
        cache_key = self.generate_cache_key(question_id, explanation_type, option_letter, is_correct)
        
        self.cache[cache_key] = {
            'response': response,
            'question_id': question_id,
            'explanation_type': explanation_type,
            'option_letter': option_letter,
            'is_correct': is_correct,
            'model': model,
            'exam': exam,
            'cached_at': datetime.now().isoformat()
        }
        
        self._save_cache()
        print(f"💾 Cache SAVE: {cache_key}")
    
    def clear(self):
        """Clear all cached responses"""
        self.cache = {}
        if self.cache_file.exists():
            self.cache_file.unlink()
        print("🗑️ Testing cache cleared")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        return {
            'enabled': self.enabled,
            'cached_responses': len(self.cache),
            'cache_file': str(self.cache_file),
            'cache_size_mb': self.cache_file.stat().st_size / (1024 * 1024) if self.cache_file.exists() else 0
        }
    
    def list_cached(self) -> list:
        """List all cached entries with detailed information"""
        entries = []
        for key, data in self.cache.items():
            # Extract question_id, option_letter, explanation_type
            question_id = data.get('question_id', 'N/A')
            option_letter = data.get('option_letter')
            explanation_type = data.get('explanation_type', 'unknown')
            exam = data.get('exam', 'N/A')  # Will be N/A if not stored
            
            # Format option_letter for display
            option_display = option_letter if option_letter else '-'
            
            # Format explanation_type for display
            type_display = explanation_type.replace('_', ' ').title() if explanation_type else 'Unknown'
            if explanation_type == 'concept':
                type_display = 'Concept'
            elif explanation_type in ['correct_option', 'wrong_option']:
                type_display = 'Option'
            
            entries.append({
                'key': key,
                'question_id': question_id,
                'option_letter': option_display,
                'explanation_type': type_display,
                'exam': exam,
                'model': data.get('model', 'N/A'),
                'cached_at': data.get('cached_at', 'N/A')
            })
        return entries


# Global instance
_testing_cache: Optional[TestingCache] = None


def get_testing_cache(enabled: Optional[bool] = None) -> TestingCache:
    """
    Get or create testing cache instance
    
    Args:
        enabled: Whether cache is enabled (default: from config.yaml)
                 This parameter overrides config if provided
    
    Returns:
        TestingCache instance
    """
    global _testing_cache
    
    if _testing_cache is None:
        _testing_cache = TestingCache(enabled=enabled)
    
    return _testing_cache

