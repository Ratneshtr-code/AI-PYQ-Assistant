# app/llm_service.py
"""
LLM Service for generating explanations using Gemini 1.5 Flash
"""
import os
import sys
from pathlib import Path
import google.generativeai as genai
from typing import Optional, Dict, Any
import json

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    # Load .env file from project root
    env_path = Path(__file__).parent.parent / '.env'
    if env_path.exists():
        load_dotenv(env_path)
        print(f"✅ Loaded .env file from {env_path}")
except ImportError:
    print("⚠️ python-dotenv not installed. Install it with: pip install python-dotenv")
    print("   Or set GEMINI_API_KEY as environment variable directly.")

# Add utils path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from utils.config_loader import load_config
from app.testing_cache import get_testing_cache


class LLMService:
    """Service for interacting with Gemini 1.5 Flash API"""
    
    def __init__(self):
        """Initialize Gemini API client"""
        cfg = load_config()
        llm_config = cfg.get("llm", {})
        
        # Get API key from environment variable or config
        api_key = os.getenv("GEMINI_API_KEY") or llm_config.get("api_key", "")
        
        # Remove quotes if present (sometimes .env files have quotes)
        if api_key:
            api_key = api_key.strip().strip('"').strip("'")
        
        if not api_key or api_key == "GEMINI_API_KEY":
            raise ValueError(
                "GEMINI_API_KEY environment variable or .env file must be set with a valid API key. "
                "Get your API key from: https://makersuite.google.com/app/apikey\n"
                "Create a .env file in project root with: GEMINI_API_KEY=your-actual-api-key-here"
            )
        
        # Configure Gemini
        genai.configure(api_key=api_key)
        
        # Get model name from config, default to stable Flash
        model_name = llm_config.get("model", "gemini-2.0-flash-001")
        
        # Use the model name directly (remove 'models/' prefix if present)
        if model_name.startswith("models/"):
            model_name = model_name.replace("models/", "")
        
        # Initialize the model directly
        try:
            print(f"🔄 Initializing model: {model_name}")
            self.model = genai.GenerativeModel(model_name)
            print(f"✅ Successfully initialized model: {model_name}")
        except Exception as e:
            # If model fails, try common alternatives from the available list
            error_str = str(e)
            if "404" in error_str or "not found" in error_str.lower():
                # Try alternative models that exist in the user's account
                alternatives = [
                    "gemini-2.0-flash-001",  # Stable Flash
                    "gemini-pro-latest",      # Latest Pro
                    "gemini-flash-latest",    # Latest Flash
                    "gemini-2.5-flash",       # Newest Flash
                ]
                
                # Remove the failed model from alternatives if it's there
                if model_name in alternatives:
                    alternatives.remove(model_name)
                
                print(f"⚠️ Model '{model_name}' not found. Trying alternatives...")
                for alt_model in alternatives:
                    try:
                        print(f"🔄 Trying alternative: {alt_model}")
                        self.model = genai.GenerativeModel(alt_model)
                        print(f"✅ Successfully initialized alternative model: {alt_model}")
                        print(f"💡 Update config.yaml with: model: \"{alt_model}\"")
                        break
                    except Exception as alt_e:
                        continue
                else:
                    # All alternatives failed
                    error_msg = (
                        f"Could not initialize Gemini model '{model_name}' or any alternatives.\n\n"
                        f"Error: {error_str}\n\n"
                        f"Please:\n"
                        f"1. Run 'python list_gemini_models.py' to see available models\n"
                        f"2. Update config.yaml with a model from your available list\n"
                        f"3. Common models: gemini-2.0-flash-001, gemini-pro-latest, gemini-flash-latest"
                    )
                    raise ValueError(error_msg)
            else:
                # Other errors
                error_msg = (
                    f"Could not initialize Gemini model '{model_name}'. "
                    f"Error: {error_str}\n\n"
                    f"Please check:\n"
                    f"1. Model name is correct in config.yaml\n"
                    f"2. Your API key has access to this model\n"
                    f"3. Run 'python list_gemini_models.py' to see available models"
                )
                raise ValueError(error_msg)
        
        # Configuration
        self.temperature = llm_config.get("temperature", 0.7)
        self.max_tokens = llm_config.get("max_tokens", 2000)
        self.model_name = model_name  # Store for cache key
        
        # Initialize testing cache (enabled/disabled from config.yaml)
        testing_cache_config = llm_config.get("testing_cache", {})
        cache_enabled = testing_cache_config.get("enabled", True)
        self.testing_cache = get_testing_cache(enabled=cache_enabled)
        
        # Prompt dumping configuration
        prompt_dump_config = llm_config.get("prompt_dump", {})
        self.prompt_dump_enabled = prompt_dump_config.get("enabled", True)
        dump_dir = prompt_dump_config.get("dump_dir", "./data/prompt_dumps")
        self.prompt_dump_dir = Path(dump_dir)
        if self.prompt_dump_enabled:
            self.prompt_dump_dir.mkdir(parents=True, exist_ok=True)
        
        if cache_enabled:
            print(f"✅ LLM Service initialized with {model_name} (Testing cache: ENABLED)")
        else:
            print(f"✅ LLM Service initialized with {model_name} (Testing cache: DISABLED)")
    
    def generate_explanation(
        self, 
        prompt: str, 
        system_instruction: Optional[str] = None,
        question_id: Optional[int] = None,
        explanation_type: str = "concept",
        option_letter: Optional[str] = None,
        is_correct: Optional[bool] = None,
        exam: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate explanation using Gemini API with retry logic for rate limits
        
        Args:
            prompt: The main prompt/question
            system_instruction: Optional system instruction for the model
            question_id: Optional question ID for cache key
            explanation_type: Type of explanation ("concept", "correct_option", "wrong_option")
            option_letter: Optional option letter (A, B, C, D)
            is_correct: Optional boolean indicating if option is correct
            
        Returns:
            Dictionary with:
            - explanation: Generated explanation text
            - from_cache: Boolean indicating if response came from cache
            - cache_key: The cache key used (if cached)
        """
        import time
        import random
        
        # Configure generation parameters
        generation_config = {
            "temperature": self.temperature,
            "max_output_tokens": self.max_tokens,
        }
        
        # Build the full prompt
        if system_instruction:
            full_prompt = f"{system_instruction}\n\n{prompt}"
        else:
            full_prompt = prompt
        
        # Dump prompt to file for review (if enabled)
        self._dump_prompt_if_enabled(
            system_instruction=system_instruction,
            prompt=prompt,
            full_prompt=full_prompt,
            question_id=question_id,
            explanation_type=explanation_type
        )
        
        # Check testing cache first (saves tokens during development/testing)
        # Use question-based cache key (same as production cache format)
        cached_response = self.testing_cache.get(
            question_id=question_id,
            explanation_type=explanation_type,
            option_letter=option_letter,
            is_correct=is_correct
        )
        
        if cached_response:
            # Generate cache key for tracking
            cache_key = self.testing_cache.generate_cache_key(
                question_id=question_id,
                explanation_type=explanation_type,
                option_letter=option_letter,
                is_correct=is_correct
            )
            return {
                "explanation": cached_response,
                "from_cache": True,
                "cache_key": cache_key,
                "source": "testing_cache"
            }
        
        # Retry logic for rate limits
        max_retries = 3
        base_delay = 2  # Base delay in seconds
        
        for attempt in range(max_retries):
            try:
                # Generate response
                response = self.model.generate_content(
                    full_prompt,
                    generation_config=generation_config
                )
                
                # Extract text from response
                explanation = response.text.strip()
                
                # Generate cache key for tracking
                cache_key = self.testing_cache.generate_cache_key(
                    question_id=question_id,
                    explanation_type=explanation_type,
                    option_letter=option_letter,
                    is_correct=is_correct
                )
                
                # Dump response to file for review (if enabled)
                self._dump_response_if_enabled(
                    explanation=explanation,
                    question_id=question_id,
                    explanation_type=explanation_type,
                    cache_key=cache_key
                )
                
                # Save to testing cache (for future testing without burning tokens)
                # Use question-based cache key (same as production cache format)
                self.testing_cache.set(
                    question_id=question_id,
                    explanation_type=explanation_type,
                    response=explanation,
                    option_letter=option_letter,
                    is_correct=is_correct,
                    model=self.model_name,
                    exam=exam
                )
                
                return {
                    "explanation": explanation,
                    "from_cache": False,
                    "cache_key": cache_key,
                    "source": "llm_api"
                }
                
            except Exception as e:
                error_str = str(e)
                
                # Check if it's a rate limit error (429)
                if "429" in error_str or "quota" in error_str.lower() or "rate limit" in error_str.lower():
                    if attempt < max_retries - 1:
                        # Calculate delay with exponential backoff + jitter
                        delay = base_delay * (2 ** attempt) + random.uniform(0, 1)
                        
                        # Try to extract retry_delay from error if available
                        if "retry in" in error_str.lower():
                            try:
                                # Extract seconds from error message
                                import re
                                match = re.search(r'retry in ([\d.]+)s', error_str.lower())
                                if match:
                                    delay = float(match.group(1)) + random.uniform(1, 3)
                            except:
                                pass
                        
                        print(f"⚠️ Rate limit hit. Retrying in {delay:.1f} seconds... (Attempt {attempt + 1}/{max_retries})")
                        time.sleep(delay)
                        continue
                    else:
                        # Last attempt failed
                        error_msg = (
                            "API rate limit exceeded. This usually means:\n"
                            "1. You've hit the free tier limit (very low for some models)\n"
                            "2. The model requires a paid plan\n"
                            "3. Too many requests in a short time\n\n"
                            "Solutions:\n"
                            "- Wait a few minutes and try again\n"
                            "- Enable billing in Google Cloud Console for higher limits\n"
                            "- Consider using a different model available on free tier\n"
                            f"Original error: {error_str[:200]}"
                        )
                        raise Exception(error_msg)
                else:
                    # Non-rate-limit error, raise immediately
                    error_msg = f"Error generating explanation: {error_str}"
                    print(f"❌ {error_msg}")
                    raise Exception(error_msg)
        
        # Should not reach here, but just in case
        raise Exception("Failed to generate explanation after retries")
    
    def _dump_prompt_if_enabled(
        self,
        system_instruction: Optional[str],
        prompt: str,
        full_prompt: str,
        question_id: Optional[int],
        explanation_type: str
    ):
        """
        Dump prompt to file for review (if enabled)
        Uses simple filename that gets overwritten - latest file is always current
        
        Args:
            system_instruction: System instruction sent to LLM
            prompt: Main prompt sent to LLM
            full_prompt: Combined system instruction + prompt
            question_id: Question ID (if available)
            explanation_type: Type of explanation
        """
        if not self.prompt_dump_enabled or not self.prompt_dump_dir:
            return
        
        try:
            # Simple filename - latest file is always the current one
            qid_str = f"q{question_id}" if question_id else "unknown"
            filename = f"{explanation_type}_{qid_str}_latest.json"
            filepath = self.prompt_dump_dir / filename
            
            dump_data = {
                "question_id": question_id,
                "explanation_type": explanation_type,
                "model": self.model_name,
                "system_instruction": system_instruction or "",
                "prompt": prompt,
                "full_prompt": full_prompt,
                "input_tokens_estimate": len(full_prompt.split()),  # Rough estimate
            }
            
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(dump_data, f, indent=2, ensure_ascii=False)
            
            print(f"📝 Prompt dumped to: {filepath}")
        except Exception as e:
            print(f"⚠️ Failed to dump prompt: {e}")
    
    def _dump_response_if_enabled(
        self,
        explanation: str,
        question_id: Optional[int],
        explanation_type: str,
        cache_key: str
    ):
        """
        Dump LLM response to file for review (if enabled)
        Uses simple filename that gets overwritten - latest file is always current
        
        Args:
            explanation: LLM response text
            question_id: Question ID (if available)
            explanation_type: Type of explanation
            cache_key: Cache key used
        """
        if not self.prompt_dump_enabled or not self.prompt_dump_dir:
            return
        
        try:
            # Simple filename - latest file is always the current one
            qid_str = f"q{question_id}" if question_id else "unknown"
            filename = f"{explanation_type}_{qid_str}_latest_response.json"
            filepath = self.prompt_dump_dir / filename
            
            dump_data = {
                "question_id": question_id,
                "explanation_type": explanation_type,
                "cache_key": cache_key,
                "model": self.model_name,
                "response": explanation,
                "output_tokens_estimate": len(explanation.split()),  # Rough estimate
            }
            
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(dump_data, f, indent=2, ensure_ascii=False)
            
            print(f"📝 Response dumped to: {filepath}")
        except Exception as e:
            print(f"⚠️ Failed to dump response: {e}")


# Global instance
_llm_service: Optional[LLMService] = None


def get_llm_service() -> LLMService:
    """Get or create LLM service instance (singleton)"""
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service


# Note: Prompt functions have been moved to app/prompt_loader.py
# Prompts are now loaded from files in prompts/ directory
# This allows easy editing without code changes

