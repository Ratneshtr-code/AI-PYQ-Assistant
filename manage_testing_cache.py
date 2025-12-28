# manage_testing_cache.py
"""
Utility script to manage testing cache
"""
import sys
import os
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent))

from app.testing_cache import get_testing_cache


def main():
    """Main function to manage cache"""
    cache = get_testing_cache()
    
    print("=" * 60)
    print("Testing Cache Manager")
    print("=" * 60)
    
    # Show stats
    stats = cache.get_stats()
    print(f"\n📊 Cache Statistics:")
    print(f"   Enabled: {stats['enabled']}")
    print(f"   Cached Responses: {stats['cached_responses']}")
    print(f"   Cache Size: {stats['cache_size_mb']:.2f} MB")
    print(f"   Cache File: {stats['cache_file']}")
    
    # Show menu
    print("\n" + "=" * 60)
    print("Options:")
    print("1. List cached entries")
    print("2. Clear cache")
    print("3. Show stats")
    print("4. Exit")
    print("=" * 60)
    
    while True:
        choice = input("\nEnter choice (1-4): ").strip()
        
        if choice == "1":
            entries = cache.list_cached()
            if entries:
                print(f"\n📋 Cached Entries ({len(entries)}):\n")
                
                # Print table header
                print(f"{'Exam':<20} {'QuestId':<10} {'OptionId':<10} {'Type':<12} {'Model':<25} {'Cached At':<20}")
                print("=" * 100)
                
                # Print entries in table format
                for i, entry in enumerate(entries, 1):
                    exam = str(entry.get('exam', 'N/A'))[:18]  # Truncate if too long
                    question_id = str(entry.get('question_id', 'N/A'))
                    option_id = str(entry.get('option_letter', '-'))
                    exp_type = str(entry.get('explanation_type', 'Unknown'))[:10]
                    model = str(entry.get('model', 'N/A'))[:23]
                    cached_at = str(entry.get('cached_at', 'N/A'))[:19]  # Truncate timestamp
                    
                    print(f"{exam:<20} {question_id:<10} {option_id:<10} {exp_type:<12} {model:<25} {cached_at:<20}")
                
                print("\n" + "=" * 100)
            else:
                print("\n📭 No cached entries found")
        
        elif choice == "2":
            confirm = input("\n⚠️  Are you sure you want to clear all cached responses? (yes/no): ")
            if confirm.lower() == "yes":
                cache.clear()
                print("✅ Cache cleared successfully")
            else:
                print("❌ Cache clear cancelled")
        
        elif choice == "3":
            stats = cache.get_stats()
            print(f"\n📊 Cache Statistics:")
            print(f"   Enabled: {stats['enabled']}")
            print(f"   Cached Responses: {stats['cached_responses']}")
            print(f"   Cache Size: {stats['cache_size_mb']:.2f} MB")
        
        elif choice == "4":
            print("\n👋 Goodbye!")
            break
        
        else:
            print("❌ Invalid choice. Please enter 1-4.")


if __name__ == "__main__":
    main()

