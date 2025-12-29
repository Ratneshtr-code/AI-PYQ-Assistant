# overall_summary.py
"""
Overall system summary - shows configuration status, cache status, model info, etc.
"""
import sys
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent))

from app.database import init_db
from app.production_cache import get_production_cache
from app.testing_cache import get_testing_cache
from utils.config_loader import load_config


def show_overall_summary():
    """Show overall system summary"""
    print("=" * 80)
    print("Overall System Summary")
    print("=" * 80)
    
    # Load config
    cfg = load_config()
    llm_config = cfg.get("llm", {})
    testing_cache_config = llm_config.get("testing_cache", {})
    production_cache_config = llm_config.get("production_cache", {})
    payment_config = cfg.get("payment", {})
    
    # Model info
    model_name = llm_config.get("model", "N/A")
    temperature = llm_config.get("temperature", "N/A")
    max_tokens = llm_config.get("max_tokens", "N/A")
    provider = llm_config.get("provider", "N/A")
    
    # Cache status
    testing_enabled = testing_cache_config.get("enabled", False)
    production_enabled = production_cache_config.get("enabled", False)
    
    # Payment mode
    payment_mode = payment_config.get("mode", "test").lower()
    payment_mode_display = payment_mode.upper()
    
    # Check if payment gateway is configured
    import os
    razorpay_key_id = os.getenv("RAZORPAY_KEY_ID", "")
    razorpay_key_secret = os.getenv("RAZORPAY_KEY_SECRET", "")
    payment_configured = bool(razorpay_key_id and razorpay_key_secret)
    
    print("\n📋 Configuration Status:")
    print("=" * 80)
    print(f"   LLM Provider:        {provider}")
    print(f"   Model:               {model_name}")
    print(f"   Temperature:         {temperature}")
    print(f"   Max Tokens:          {max_tokens}")
    print()
    print(f"   Testing Cache:       {'✅ ENABLED' if testing_enabled else '❌ DISABLED'}")
    print(f"   Production Cache:    {'✅ ENABLED' if production_enabled else '❌ DISABLED'}")
    print()
    print(f"   Payment Mode:        {payment_mode_display}")
    print(f"   Payment Gateway:     {'✅ CONFIGURED' if payment_configured else '❌ NOT CONFIGURED'}")
    
    if production_enabled and testing_enabled:
        print("\n⚠️  WARNING: Both caches are enabled! Production cache takes precedence.")
    
    # Testing cache stats
    print("\n" + "=" * 80)
    print("Testing Cache Status:")
    print("=" * 80)
    testing_cache = get_testing_cache()
    testing_stats = testing_cache.get_stats()
    print(f"   Enabled:          {testing_stats['enabled']}")
    print(f"   Cached Responses: {testing_stats['cached_responses']}")
    print(f"   Cache Size:       {testing_stats['cache_size_mb']:.2f} MB")
    print(f"   Cache File:       {testing_stats['cache_file']}")
    
    # Production cache stats
    print("\n" + "=" * 80)
    print("Production Cache Status:")
    print("=" * 80)
    production_cache = get_production_cache()
    production_stats = production_cache.get_stats()
    print(f"   Enabled:          {production_stats['enabled']}")
    print(f"   Cached Responses: {production_stats['cached_responses']}")
    print(f"   Total Cache Hits: {production_stats['total_hits']}")
    print(f"   Tokens Saved:     {production_stats['total_tokens_saved']:,}")
    
    # Backend config
    backend_config = cfg.get("backend", {})
    print("\n" + "=" * 80)
    print("Backend Configuration:")
    print("=" * 80)
    print(f"   Host:              {backend_config.get('host', 'N/A')}")
    print(f"   Port:              {backend_config.get('port', 'N/A')}")
    print(f"   Retrieval K:       {backend_config.get('retrieval_k', 'N/A')}")
    print(f"   Min Score:         {backend_config.get('min_score', 'N/A')}")
    
    # Payment Configuration
    print("\n" + "=" * 80)
    print("Payment Configuration:")
    print("=" * 80)
    print(f"   Payment Mode:        {payment_mode_display}")
    if payment_mode == "test":
        print(f"   Status:             🧪 Test Mode - No real payments processed")
    else:
        print(f"   Status:             🚀 Production Mode - Real payments enabled")
    print(f"   Gateway Configured: {'✅ Yes' if payment_configured else '❌ No'}")
    if not payment_configured and payment_mode == "production":
        print(f"   ⚠️  WARNING: Production mode enabled but payment gateway not configured!")
        print(f"   Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env file")
    
    # Database info
    print("\n" + "=" * 80)
    print("Database Status:")
    print("=" * 80)
    from app.database import DB_PATH
    if DB_PATH.exists():
        size_mb = DB_PATH.stat().st_size / (1024 * 1024)
        print(f"   Database File:      {DB_PATH}")
        print(f"   Database Size:     {size_mb:.2f} MB")
    else:
        print(f"   Database File:      {DB_PATH} (not created yet)")
    
    print("\n" + "=" * 80)
    print("💡 Tips:")
    print("=" * 80)
    print("   - Use option 4 to manage Testing Cache")
    print("   - Use option 11 to manage Production Cache")
    print("   - Check backend console logs for cache source indicators")
    if payment_mode == "test":
        print("   - Payment mode is TEST - users can upgrade without payment")
    print("=" * 80)


if __name__ == "__main__":
    init_db()
    show_overall_summary()

