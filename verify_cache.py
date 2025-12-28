# verify_cache.py
"""
Quick script to verify production cache is working correctly
Shows actual cache entries and their hit counts
"""
import sys
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent))

from app.database import SessionLocal, LLMExplanation, init_db


def verify_cache():
    """Verify production cache entries"""
    init_db()
    db = SessionLocal()
    
    try:
        print("=" * 80)
        print("Production Cache Verification")
        print("=" * 80)
        
        # Count total entries
        total = db.query(LLMExplanation).count()
        print(f"\n📊 Total cache entries: {total}")
        
        if total == 0:
            print("\n⚠️  No cache entries found!")
            print("   This means either:")
            print("   1. Production cache is not saving entries")
            print("   2. No explanations have been generated yet")
            print("   3. Database table was not created")
            return
        
        # Show all entries
        entries = db.query(LLMExplanation).order_by(LLMExplanation.created_at.desc()).all()
        
        print(f"\n{'Cache Key':<45} {'QID':<8} {'Type':<15} {'Hits':<8} {'Created':<20} {'Last Used':<20}")
        print("=" * 120)
        
        total_hits = 0
        for entry in entries:
            created = entry.created_at.strftime("%Y-%m-%d %H:%M") if entry.created_at else "N/A"
            last_used = entry.last_used_at.strftime("%Y-%m-%d %H:%M") if entry.last_used_at else "Never"
            total_hits += entry.hit_count or 0
            
            print(f"{entry.cache_key[:43]:<45} {str(entry.question_id or 'N/A'):<8} {entry.explanation_type[:13]:<15} {entry.hit_count:<8} {created:<20} {last_used:<20}")
        
        print("=" * 120)
        print(f"\n📈 Summary:")
        print(f"   Total Entries: {total}")
        print(f"   Total Hits: {total_hits}")
        print(f"   Average Hits per Entry: {total_hits / total:.1f}" if total > 0 else "   Average Hits per Entry: 0")
        
        # Check for entries with hits
        entries_with_hits = db.query(LLMExplanation).filter(LLMExplanation.hit_count > 0).count()
        print(f"   Entries with Hits: {entries_with_hits}")
        
        if entries_with_hits == 0 and total > 0:
            print("\n⚠️  WARNING: Cache entries exist but no hits recorded!")
            print("   This suggests cache hits are not being tracked properly.")
            print("   Check backend logs for '💾 Production Cache HIT' messages.")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    verify_cache()

