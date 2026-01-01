# app/translation_service.py
"""
Translation Service for translating questions and options between English and Hindi
Uses Google Translate API with caching to reduce API calls
"""
import os
import sys
from pathlib import Path
from typing import Optional, Dict
import hashlib
import json
import threading
from collections import defaultdict

# Import persistent cache
try:
    from app.translation_cache import get_translation_cache
    HAS_PERSISTENT_CACHE = True
except ImportError:
    HAS_PERSISTENT_CACHE = False
    print("⚠️ Persistent translation cache not available")

# Load environment variables
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).parent.parent / '.env'
    if env_path.exists():
        load_dotenv(env_path)
except ImportError:
    pass

# Try to import googletrans (free alternative) or use Google Cloud Translate API
try:
    from googletrans import Translator
    HAS_GOOGLETRANS = True
except ImportError:
    HAS_GOOGLETRANS = False
    print("⚠️ googletrans not installed. Install with: pip install googletrans==4.0.0rc1")
    print("   Or use Google Cloud Translate API")

# Translation cache - hybrid: in-memory (fast) + persistent database (shared across users)
# In-memory cache for speed, persistent cache for sharing across users and server restarts
_translation_cache: Dict[str, str] = {}  # In-memory cache (fast lookups)
_persistent_cache = None  # Database cache (will be initialized on first use)

# Track in-flight translation requests to prevent duplicates
_in_flight_requests: Dict[str, threading.Event] = {}  # cache_key -> Event
_in_flight_results: Dict[str, str] = {}  # cache_key -> translated_text
_in_flight_lock = threading.Lock()  # Lock for thread-safe access to in-flight tracking


def get_cache_key_for_text(text: str, target_language: str) -> str:
    """Generate cache key for translation using text (for LLM responses)"""
    key_string = f"{text}|{target_language}"
    return hashlib.md5(key_string.encode()).hexdigest()


def get_cache_key_for_question(question_id: Optional[int], field: str, target_language: str) -> str:
    """
    Generate cache key for question/option translation using question_id
    
    Args:
        question_id: The question ID from database
        field: Field name ("question_text", "option_a", "option_b", etc.)
        target_language: Target language code ("en" or "hi")
    
    Returns:
        Cache key string (e.g., "q_123_question_text_hi" or "q_123_option_a_hi")
    """
    if question_id:
        lang = "hi" if target_language.lower() in ["hi", "hindi"] else "en"
        return f"q_{question_id}_{field}_{lang}"
    else:
        # Fallback to text-based key if no question_id
        return f"text_{field}_{target_language}"


def translate_text(text: str, target_language: str = "hi", source_language: str = "en", question_id: Optional[int] = None, field: str = "text") -> str:
    """
    Translate text to target language
    
    Args:
        text: Text to translate
        target_language: Target language code ("en" or "hi")
        source_language: Source language code (default "en")
        question_id: Optional question ID for better caching (uses question_id instead of text)
        field: Field name for caching ("question_text", "option_a", "llm_response", etc.)
    
    Returns:
        Translated text, or original text if translation fails
    """
    if not text or not text.strip():
        return text
    
    # If target is same as source, return original (no translation needed)
    if target_language.lower() == source_language.lower():
        return text
    
    # Normalize language codes
    target_lang = "hi" if target_language.lower() in ["hi", "hindi"] else "en"
    source_lang = "hi" if source_language.lower() in ["hi", "hindi"] else "en"
    
    if target_lang == source_lang:
        return text
    
    # Only cache for Hindi translations (English is default, no need to cache)
    should_cache = (target_lang == "hi")
    
    # Declare global variable at the start of the function
    global _persistent_cache
    
    # Check cache first (use question_id if available for better cache hits)
    cache_key = None
    if should_cache:
        if question_id:
            cache_key = get_cache_key_for_question(question_id, field, target_lang)
        else:
            cache_key = get_cache_key_for_text(text, target_lang)
        
        # Check in-memory cache first (fastest)
        if cache_key in _translation_cache:
            if question_id:
                print(f"✅ Translation cache HIT (in-memory): {cache_key} (question_id={question_id})")
            return _translation_cache[cache_key]
        
        # Check persistent cache (database)
        if HAS_PERSISTENT_CACHE:
            if _persistent_cache is None:
                _persistent_cache = get_translation_cache(enabled=True)
            
            cached_text = _persistent_cache.get(cache_key)
            if cached_text:
                # Store in in-memory cache for faster future access
                _translation_cache[cache_key] = cached_text
                if question_id:
                    print(f"✅ Translation cache HIT (database): {cache_key} (question_id={question_id})")
                return cached_text
        
        # Check if there's an in-flight request for this cache key
        with _in_flight_lock:
            if cache_key in _in_flight_requests:
                # Another request is already translating this - wait for it
                event = _in_flight_requests[cache_key]
                # Release lock before waiting
                _in_flight_lock.release()
                try:
                    # Wait for the in-flight request to complete (max 30 seconds)
                    event.wait(timeout=30.0)
                    # Check if result is available
                    with _in_flight_lock:
                        if cache_key in _in_flight_results:
                            result = _in_flight_results[cache_key]
                            # Store in cache for future use
                            _translation_cache[cache_key] = result
                            return result
                        # If timeout or error, fall through to make our own request
                except Exception:
                    pass
                finally:
                    # Re-acquire lock if we released it
                    try:
                        _in_flight_lock.acquire()
                    except:
                        pass
                # If we get here, the in-flight request didn't complete successfully
                # Fall through to make our own translation request
            else:
                # No in-flight request - create one
                event = threading.Event()
                _in_flight_requests[cache_key] = event
    
    try:
        if HAS_GOOGLETRANS:
            # Use googletrans (free, but may have rate limits)
            # Note: This is synchronous and may block. For better performance, consider:
            # - Using async translation
            # - Translating in background
            # - Using batch translation API
            translator = Translator()
            # Note: googletrans doesn't support timeout directly
            # If translation times out, it will raise an exception which we catch below
            # For long texts, consider splitting into chunks
            try:
                result = translator.translate(text, src=source_lang, dest=target_lang)
                translated_text = result.text
            except Exception as translate_error:
                # Handle specific timeout errors
                error_str = str(translate_error).lower()
                if "timeout" in error_str or "timed out" in error_str:
                    raise Exception(f"Translation timeout: {str(translate_error)[:100]}")
                else:
                    raise  # Re-raise other errors
            
            # Cache the result (only for Hindi translations)
            if should_cache and cache_key:
                # Store in in-memory cache (fast)
                _translation_cache[cache_key] = translated_text
                
                # Store in persistent cache (shared across users, survives restarts)
                # Wrap in try-except to prevent cache errors from breaking translation
                if HAS_PERSISTENT_CACHE:
                    try:
                        if _persistent_cache is None:
                            _persistent_cache = get_translation_cache(enabled=True)
                        _persistent_cache.set(
                            cache_key=cache_key,
                            translated_text=translated_text,
                            question_id=question_id,
                            field=field,
                            target_language=target_lang
                        )
                    except Exception as cache_error:
                        # Cache errors should not break translation
                        # In-memory cache still works, so translation is successful
                        # Only log if it's not a UNIQUE constraint (race condition is expected)
                        error_str = str(cache_error).lower()
                        if "unique constraint" not in error_str:
                            print(f"⚠️ Translation cache write error (non-critical): {str(cache_error)[:100]}")
                
                # Notify waiting threads that translation is complete
                with _in_flight_lock:
                    if cache_key in _in_flight_requests:
                        _in_flight_results[cache_key] = translated_text
                        _in_flight_requests[cache_key].set()
                        # Clean up after a short delay to allow waiting threads to read result
                        # Don't delete immediately - let waiting threads read it first
            
            return translated_text
        else:
            # Fallback: return original text if no translation service available
            print(f"⚠️ Translation service not available. Returning original text.")
            translated_text = text
            # Still notify waiting threads even on fallback
            if should_cache and cache_key:
                with _in_flight_lock:
                    if cache_key in _in_flight_requests:
                        _in_flight_results[cache_key] = translated_text
                        _in_flight_requests[cache_key].set()
            return translated_text
    except Exception as e:
        # Catch translation errors (rate limits, network issues, etc.)
        error_msg = str(e)[:200]  # Get more of the error message
        # Only log errors for substantial text to reduce terminal spam
        if len(text) > 50:
            print(f"⚠️ Translation error for {field} (question_id={question_id}): {error_msg[:100]}")
        # DO NOT cache failures - return original text but don't cache it
        # This allows retry on next request instead of permanently caching English
        # If we cache failures, they'll always return English even when translation service recovers
        translated_text = text
        # Notify waiting threads even on error (they'll get original text)
        if should_cache and cache_key:
            with _in_flight_lock:
                if cache_key in _in_flight_requests:
                    _in_flight_results[cache_key] = translated_text
                    _in_flight_requests[cache_key].set()
        return translated_text
    finally:
        # Clean up in-flight tracking after a delay to allow waiting threads to read
        # Use a background thread to clean up after a short delay
        if should_cache and cache_key:
            def cleanup_in_flight():
                import time
                time.sleep(1.0)  # Wait 1 second for waiting threads to read
                with _in_flight_lock:
                    if cache_key in _in_flight_requests:
                        del _in_flight_requests[cache_key]
                    if cache_key in _in_flight_results:
                        del _in_flight_results[cache_key]
            
            cleanup_thread = threading.Thread(target=cleanup_in_flight, daemon=True)
            cleanup_thread.start()


def translate_question_data(question_data: dict, target_language: str = "hi") -> dict:
    """
    Translate question text and options to target language
    Uses question_id for caching to avoid cache misses on minor text changes
    
    Args:
        question_data: Dictionary containing question_text, option_a, option_b, option_c, option_d, and optionally id/question_id
        target_language: Target language code ("en" or "hi")
    
    Returns:
        Dictionary with translated fields
    """
    if target_language.lower() not in ["hi", "hindi"]:
        # If target is English, return original (assuming questions are in English)
        # No caching needed for English mode
        return question_data
    
    translated = question_data.copy()
    
    # Get question_id for better caching
    question_id = question_data.get("id") or question_data.get("question_id") or question_data.get("json_question_id")
    
    # Translate question text
    if "question_text" in translated and translated["question_text"]:
        translated["question_text"] = translate_text(
            translated["question_text"], 
            target_language="hi",
            source_language="en",
            question_id=question_id,
            field="question_text"
        )
    
    # Translate options
    for opt_key in ["option_a", "option_b", "option_c", "option_d"]:
        if opt_key in translated and translated[opt_key]:
            translated[opt_key] = translate_text(
                translated[opt_key],
                target_language="hi",
                source_language="en",
                question_id=question_id,
                field=opt_key
            )
    
    return translated


def translate_llm_response(
    explanation: str, 
    target_language: str = "hi", 
    question_id: Optional[int] = None,
    explanation_type: str = "concept",
    option_letter: Optional[str] = None,
    is_correct: Optional[bool] = None
) -> str:
    """
    Translate LLM explanation response to target language
    Uses question_id and explanation type for better caching
    
    Args:
        explanation: The LLM-generated explanation text (in English)
        target_language: Target language code ("en" or "hi")
        question_id: Optional question ID for better caching
        explanation_type: Type of explanation ("concept", "correct_option", "wrong_option")
        option_letter: Optional option letter (A, B, C, D) for option explanations
        is_correct: Optional boolean indicating if option is correct
    
    Returns:
        Translated explanation, or original if target is English or translation fails
    """
    if target_language.lower() not in ["hi", "hindi"]:
        # If target is English, return original (LLM responses are in English)
        return explanation
    
    # Generate field name based on explanation type for unique cache keys
    if explanation_type == "concept":
        field = "llm_response_concept"
    elif explanation_type in ["correct_option", "wrong_option"]:
        if option_letter and is_correct is not None:
            field = f"llm_response_option_{option_letter.lower()}_{'correct' if is_correct else 'wrong'}"
        else:
            field = f"llm_response_option_{explanation_type}"
    else:
        field = f"llm_response_{explanation_type}"
    
    # Translate the explanation (only log errors, not every translation to reduce terminal spam)
    translated = translate_text(
        explanation,
        target_language="hi",
        source_language="en",
        question_id=question_id,
        field=field
    )
    
    # Only log if translation failed (returned original English text when Hindi was requested)
    if translated == explanation and target_language.lower() in ["hi", "hindi"] and len(explanation) > 50:
        # Only log for substantial text (avoid logging for empty/short text)
        print(f"⚠️ Translation failed for {field}, question_id={question_id} (returned English)")
    
    return translated


# Alternative: Use Google Cloud Translate API (more reliable, requires API key)
def translate_with_google_cloud(text: str, target_language: str = "hi") -> str:
    """
    Translate using Google Cloud Translate API (requires GOOGLE_TRANSLATE_API_KEY)
    This is more reliable than googletrans but requires API key setup
    """
    try:
        from google.cloud import translate_v2 as translate
        
        api_key = os.getenv("GOOGLE_TRANSLATE_API_KEY")
        if not api_key:
            # Fallback to googletrans
            return translate_text(text, target_language)
        
        client = translate.Client(api_key=api_key)
        
        # Check cache
        cache_key = get_cache_key(text, target_language)
        if cache_key in _translation_cache:
            return _translation_cache[cache_key]
        
        # Normalize language code
        target_lang = "hi" if target_language.lower() in ["hi", "hindi"] else "en"
        
        result = client.translate(text, target_language=target_lang)
        translated_text = result["translatedText"]
        
        # Cache result
        _translation_cache[cache_key] = translated_text
        return translated_text
    except ImportError:
        # Google Cloud Translate not installed, use googletrans
        return translate_text(text, target_language)
    except Exception as e:
        print(f"⚠️ Google Cloud Translate error: {e}. Falling back to googletrans.")
        return translate_text(text, target_language)

