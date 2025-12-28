# check_cache_status.py
"""
Quick utility to check cache status and statistics
Shows which cache is enabled and basic statistics
"""
import sys
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent))

from app.database import SessionLocal, LLMExplanation, init_db
from app.production_cache import get_production_cache
from app.testing_cache import get_testing_cache
from utils.config_loader import load_config


def check_cache_status():
    """Check and display cache status"""
    print("=" * 80)
    print("Cache Status Check")
    print("=" * 80)
    
    # Load config
    cfg = load_config()
    llm_config = cfg.get("llm", {})
    testing_cache_config = llm_config.get("testing_cache", {})
    production_cache_config = llm_config.get("production_cache", {})
    
    testing_enabled = testing_cache_config.get("enabled", True)
    production_enabled = production_cache_config.get("enabled", False)
    
    print("\n📋 Configuration:")
    print(f"   Testing Cache:    {'✅ ENABLED' if testing_enabled else '❌ DISABLED'}")
    print(f"   Production Cache:  {'✅ ENABLED' if production_enabled else '❌ DISABLED'}")
    
    if production_enabled and testing_enabled:
        print("\n⚠️  WARNING: Both caches are enabled! Production cache takes precedence.")
    
    print("\n" + "=" * 80)
    print("Testing Cache Statistics")
    print("=" * 80)
    
    testing_cache = get_testing_cache()
    testing_stats = testing_cache.get_stats()
    
    print(f"   Enabled:          {testing_stats['enabled']}")
    print(f"   Cached Responses: {testing_stats['cached_responses']}")
    print(f"   Cache Size:       {testing_stats['cache_size_mb']:.2f} MB")
    print(f"   Cache File:       {testing_stats['cache_file']}")
    
    print("\n" + "=" * 80)
    print("Production Cache Statistics")
    print("=" * 80)
    
    production_cache = get_production_cache()
    production_stats = production_cache.get_stats()
    
    print(f"   Enabled:          {production_stats['enabled']}")
    print(f"   Cached Responses: {production_stats['cached_responses']}")
    print(f"   Total Cache Hits: {production_stats['total_hits']}")
    print(f"   Tokens Saved:     {production_stats['total_tokens_saved']:,}")
    
    # Show recent cache entries (always show if enabled, even if 0)
    if production_stats['enabled']:
        print("\n" + "=" * 80)
        print("Recent Production Cache Entries (Last 10)")
        print("=" * 80)
        
        db = SessionLocal()
        try:
            recent_entries = db.query(LLMExplanation).order_by(
                LLMExplanation.last_used_at.desc()
            ).limit(10).all()
            
            if recent_entries:
                print(f"{'Cache Key':<40} {'Question ID':<12} {'Type':<15} {'Hits':<8} {'Last Used':<20}")
                print("-" * 80)
                for entry in recent_entries:
                    last_used = entry.last_used_at.strftime("%Y-%m-%d %H:%M") if entry.last_used_at else "Never"
                    print(f"{entry.cache_key[:38]:<40} {str(entry.question_id or 'N/A'):<12} {entry.explanation_type[:13]:<15} {entry.hit_count:<8} {last_used:<20}")
            else:
                print("   No cache entries found in database")
                print("   💡 Tip: Make some explanation requests to populate the cache")
        except Exception as e:
            print(f"   Error fetching cache entries: {e}")
        finally:
            db.close()
    
    print("\n" + "=" * 80)
    print("💡 Tips:")
    print("=" * 80)
    print("   - Check backend console logs for cache source indicators:")
    print("     ✅ PRODUCTION cache (SQLite) = Production cache hit")
    print("     ✅ TESTING cache (JSON file) = Testing cache hit")
    print("     🔄 Fresh LLM API response = No cache, new API call")
    print("   - Production cache is shared across all users")
    print("   - Testing cache is for development only")
    print("=" * 80)


if __name__ == "__main__":
    init_db()
    check_cache_status()

