# manage_production_cache.py
"""
Utility script to manage production cache (SQLite database)
Similar interface to testing cache manager
"""
import sys
import os
from pathlib import Path
from datetime import datetime

# Add project root to path
sys.path.append(str(Path(__file__).parent))

from app.database import SessionLocal, LLMExplanation, init_db
from app.production_cache import get_production_cache


def format_date(date):
    """Format date for display"""
    if not date:
        return "Never"
    try:
        return date.strftime("%Y-%m-%d %H:%M")
    except:
        return str(date)


def list_cached_entries():
    """List all cached entries in production cache"""
    db = SessionLocal()
    try:
        entries = db.query(LLMExplanation).order_by(LLMExplanation.created_at.desc()).all()
        
        if not entries:
            print("\n📭 No cached entries found")
            return
        
        print("\n" + "=" * 100)
        print(f"📋 Cached Entries ({len(entries)}):")
        print()
        print(f"{'Exam':<20} {'QuestId':<10} {'OptionId':<10} {'Type':<12} {'Hits':<8} {'Model':<25} {'Cached At':<20}")
        print("=" * 100)
        
        for entry in entries:
            exam = str(entry.exam or 'N/A')[:18]
            question_id = str(entry.question_id or 'N/A')
            option_id = str(entry.option_letter or '-')
            exp_type = str(entry.explanation_type or 'Unknown')[:10]
            hits = str(entry.hit_count or 0)
            model = str(entry.model_name or 'N/A')[:23]
            cached_at = format_date(entry.created_at)
            
            print(f"{exam:<20} {question_id:<10} {option_id:<10} {exp_type:<12} {hits:<8} {model:<25} {cached_at:<20}")
        
        print("=" * 100)
        
    except Exception as e:
        print(f"❌ Error listing cache entries: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


def clear_cache():
    """Clear all production cache entries"""
    db = SessionLocal()
    try:
        count = db.query(LLMExplanation).count()
        if count == 0:
            print("\n📭 No cache entries to clear")
            return
        
        confirm = input(f"\n⚠️  Are you sure you want to clear all {count} cached responses? (yes/no): ")
        if confirm.lower() == "yes":
            db.query(LLMExplanation).delete()
            db.commit()
            print(f"✅ Cleared {count} cache entries successfully")
        else:
            print("❌ Cache clear cancelled")
    except Exception as e:
        print(f"❌ Error clearing cache: {e}")
        db.rollback()
    finally:
        db.close()


def show_stats():
    """Show production cache statistics"""
    production_cache = get_production_cache()
    stats = production_cache.get_stats()
    
    print("\n" + "=" * 80)
    print("📊 Production Cache Statistics:")
    print("=" * 80)
    print(f"   Enabled:          {stats['enabled']}")
    print(f"   Cached Responses: {stats['cached_responses']}")
    print(f"   Total Cache Hits: {stats['total_hits']}")
    print(f"   Tokens Saved:     {stats['total_tokens_saved']:,}")
    print("=" * 80)


def main():
    """Main function"""
    # Initialize database
    init_db()
    
    production_cache = get_production_cache()
    
    if not production_cache.enabled:
        print("⚠️ Production cache is disabled in config.yaml")
        print("   Enable it by setting: llm.production_cache.enabled: true")
        return
    
    print("=" * 80)
    print("Production Cache Manager")
    print("=" * 80)
    
    # Show stats
    stats = production_cache.get_stats()
    print(f"\n📊 Cache Statistics:")
    print(f"   Enabled:          {stats['enabled']}")
    print(f"   Cached Responses: {stats['cached_responses']}")
    print(f"   Total Cache Hits: {stats['total_hits']}")
    print(f"   Tokens Saved:     {stats['total_tokens_saved']:,}")
    
    # Show menu
    print("\n" + "=" * 80)
    print("Options:")
    print("1. List cached entries")
    print("2. Clear cache")
    print("3. Show stats")
    print("4. Exit")
    print("=" * 80)
    
    while True:
        choice = input("\nEnter choice (1-4): ").strip()
        
        if choice == "1":
            list_cached_entries()
        
        elif choice == "2":
            clear_cache()
        
        elif choice == "3":
            show_stats()
        
        elif choice == "4":
            print("\n👋 Goodbye!")
            break
        
        else:
            print("❌ Invalid choice. Please enter 1-4.")


if __name__ == "__main__":
    main()

