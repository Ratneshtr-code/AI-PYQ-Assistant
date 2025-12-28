# manage_token_usage.py
"""
Utility script to view and manage LLM token usage per user
"""
import sys
import os
from pathlib import Path
from datetime import datetime, timedelta
from sqlalchemy import func, and_, case

# Add project root to path
sys.path.append(str(Path(__file__).parent))

from app.database import SessionLocal, User, LLMUsageLog, init_db


def format_date(date):
    """Format date for display"""
    if not date:
        return "N/A"
    try:
        return date.strftime("%Y-%m-%d %H:%M")
    except:
        return str(date)


def format_number(num):
    """Format number with commas"""
    return f"{num:,}" if num else "0"


def user_token_summary(user_id: int = None, days: int = None):
    """Show token usage summary for a user or all users"""
    db = SessionLocal()
    try:
        # Build date filter
        date_filter = None
        if days:
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            date_filter = LLMUsageLog.created_at >= cutoff_date
        
        # Build aggregation query
        query = db.query(
            User.id,
            User.username,
            User.email,
            User.subscription_plan,
            func.coalesce(func.sum(LLMUsageLog.input_tokens), 0).label('total_input'),
            func.coalesce(func.sum(LLMUsageLog.output_tokens), 0).label('total_output'),
            func.coalesce(func.sum(LLMUsageLog.total_tokens), 0).label('total_tokens'),
            func.count(LLMUsageLog.id).label('request_count')
        ).join(
            LLMUsageLog, User.id == LLMUsageLog.user_id, isouter=True
        )
        
        # Apply filters
        if user_id:
            query = query.filter(User.id == user_id)
        if date_filter:
            query = query.filter(date_filter)
        
        # Group by user
        results = query.group_by(User.id, User.username, User.email, User.subscription_plan).all()
        
        # Calculate cache hits and API calls using separate queries (more compatible)
        user_stats = {}
        for row in results:
            user_id_val = row[0]
            
            # Count cache hits
            cache_query = db.query(func.count(LLMUsageLog.id)).filter(
                LLMUsageLog.user_id == user_id_val,
                LLMUsageLog.from_cache == True
            )
            if date_filter:
                cache_query = cache_query.filter(date_filter)
            cache_hits = cache_query.scalar() or 0
            
            # Count API calls
            api_query = db.query(func.count(LLMUsageLog.id)).filter(
                LLMUsageLog.user_id == user_id_val,
                LLMUsageLog.from_cache == False
            )
            if date_filter:
                api_query = api_query.filter(date_filter)
            api_calls = api_query.scalar() or 0
            
            user_stats[user_id_val] = {
                'row': row,
                'cache_hits': cache_hits,
                'api_calls': api_calls
            }
        
        if not results:
            print("\n📭 No usage data found")
            return
        
        print("\n" + "=" * 140)
        print(f"{'User ID':<8} {'Username':<20} {'Email':<30} {'Plan':<10} {'Requests':<10} {'Cache Hits':<12} {'API Calls':<10} {'Input Tokens':<15} {'Output Tokens':<15} {'Total Tokens':<15}")
        print("=" * 140)
        
        total_requests = 0
        total_cache_hits = 0
        total_api_calls = 0
        total_input = 0
        total_output = 0
        total_tokens = 0
        
        for user_id_val, stats in user_stats.items():
            row = stats['row']
            username, email, plan, total_input_val, total_output_val, total_tokens_val, request_count = row[1:8]
            cache_hits = stats['cache_hits']
            api_calls = stats['api_calls']
            
            total_input_val = total_input_val or 0
            total_output_val = total_output_val or 0
            total_tokens_val = total_tokens_val or 0
            request_count = request_count or 0
            cache_hits = cache_hits or 0
            api_calls = api_calls or 0
            
            plan_str = plan.value if plan else "N/A"
            
            print(f"{user_id_val:<8} {username[:18]:<20} {email[:28]:<30} {plan_str:<10} {request_count:<10} {cache_hits:<12} {api_calls:<10} {format_number(total_input_val):<15} {format_number(total_output_val):<15} {format_number(total_tokens_val):<15}")
            
            total_requests += request_count
            total_cache_hits += cache_hits
            total_api_calls += api_calls
            total_input += total_input_val
            total_output += total_output_val
            total_tokens += total_tokens_val
        
        print("=" * 140)
        print(f"{'TOTALS':<8} {'':<20} {'':<30} {'':<10} {total_requests:<10} {total_cache_hits:<12} {total_api_calls:<10} {format_number(total_input):<15} {format_number(total_output):<15} {format_number(total_tokens):<15}")
        
        # Calculate cache hit rate
        if total_requests > 0:
            cache_rate = (total_cache_hits / total_requests) * 100
            print(f"\n📊 Cache Hit Rate: {cache_rate:.1f}%")
            print(f"💰 Estimated Cost Savings: {format_number(total_input + total_output)} tokens saved from cache")
        
    except Exception as e:
        print(f"❌ Error getting token summary: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


def user_detailed_usage(user_id: int, days: int = 30):
    """Show detailed usage for a specific user"""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            print(f"❌ User with ID {user_id} not found")
            return
        
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        usage_logs = db.query(LLMUsageLog).filter(
            and_(
                LLMUsageLog.user_id == user_id,
                LLMUsageLog.created_at >= cutoff_date
            )
        ).order_by(LLMUsageLog.created_at.desc()).limit(100).all()
        
        if not usage_logs:
            print(f"\n📭 No usage data found for user {user.username} (ID: {user_id}) in the last {days} days")
            return
        
        print("\n" + "=" * 120)
        print(f"Detailed Usage - {user.username} (ID: {user_id})")
        print(f"Last {days} days (showing up to 100 most recent)")
        print("=" * 120)
        print(f"{'Date':<20} {'Type':<15} {'Option':<8} {'From Cache':<12} {'Input':<10} {'Output':<10} {'Total':<10} {'Question ID':<12}")
        print("=" * 120)
        
        for log in usage_logs:
            date_str = format_date(log.created_at)
            exp_type = log.explanation_type or "N/A"
            option = log.option_letter or "-"
            from_cache = "Yes" if log.from_cache else "No"
            input_tokens = format_number(log.input_tokens)
            output_tokens = format_number(log.output_tokens)
            total_tokens = format_number(log.total_tokens)
            qid = str(log.question_id) if log.question_id else "-"
            
            print(f"{date_str:<20} {exp_type[:13]:<15} {option:<8} {from_cache:<12} {input_tokens:<10} {output_tokens:<10} {total_tokens:<10} {qid:<12}")
        
        print("=" * 120)
        
        # Summary
        total_input = sum(log.input_tokens for log in usage_logs)
        total_output = sum(log.output_tokens for log in usage_logs)
        total_tokens = sum(log.total_tokens for log in usage_logs)
        cache_hits = sum(1 for log in usage_logs if log.from_cache)
        
        print(f"\nSummary (last {days} days):")
        print(f"  Total Requests: {len(usage_logs)}")
        print(f"  Cache Hits: {cache_hits} ({cache_hits/len(usage_logs)*100:.1f}%)")
        print(f"  API Calls: {len(usage_logs) - cache_hits}")
        print(f"  Total Input Tokens: {format_number(total_input)}")
        print(f"  Total Output Tokens: {format_number(total_output)}")
        print(f"  Total Tokens: {format_number(total_tokens)}")
        
    except Exception as e:
        print(f"❌ Error getting detailed usage: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


def top_users_by_usage(limit: int = 10, days: int = None):
    """Show top users by token usage"""
    db = SessionLocal()
    try:
        query = db.query(
            User.id,
            User.username,
            User.email,
            User.subscription_plan,
            func.sum(LLMUsageLog.total_tokens).label('total_tokens'),
            func.count(LLMUsageLog.id).label('request_count')
        ).join(
            LLMUsageLog, User.id == LLMUsageLog.user_id
        )
        
        if days:
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            query = query.filter(LLMUsageLog.created_at >= cutoff_date)
        
        results = query.group_by(User.id, User.username, User.email, User.subscription_plan).order_by(
            func.sum(LLMUsageLog.total_tokens).desc()
        ).limit(limit).all()
        
        if not results:
            print("\n📭 No usage data found")
            return
        
        print("\n" + "=" * 100)
        print(f"Top {limit} Users by Token Usage" + (f" (Last {days} days)" if days else ""))
        print("=" * 100)
        print(f"{'Rank':<6} {'User ID':<8} {'Username':<20} {'Email':<30} {'Plan':<10} {'Total Tokens':<15} {'Requests':<10}")
        print("=" * 100)
        
        for rank, row in enumerate(results, 1):
            user_id_val, username, email, plan, total_tokens_val, request_count = row
            plan_str = plan.value if plan else "N/A"
            print(f"{rank:<6} {user_id_val:<8} {username[:18]:<20} {email[:28]:<30} {plan_str:<10} {format_number(total_tokens_val):<15} {request_count:<10}")
        
        print("=" * 100)
        
    except Exception as e:
        print(f"❌ Error getting top users: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


def main():
    """Main function"""
    # Initialize database
    init_db()
    
    print("=" * 80)
    print("LLM Token Usage Management Tool")
    print("=" * 80)
    
    while True:
        print("\nOptions:")
        print("1. Token usage summary (all users)")
        print("2. Token usage summary (last N days)")
        print("3. Detailed usage for a user")
        print("4. Top users by token usage")
        print("5. Exit")
        
        choice = input("\nEnter choice (1-5): ").strip()
        
        if choice == "1":
            user_token_summary()
        
        elif choice == "2":
            try:
                days = int(input("Enter number of days: ").strip())
                user_token_summary(days=days)
            except ValueError:
                print("❌ Invalid number of days")
        
        elif choice == "3":
            try:
                user_id = int(input("Enter user ID: ").strip())
                days_input = input("Enter number of days (default 30): ").strip()
                days = int(days_input) if days_input else 30
                user_detailed_usage(user_id, days)
            except ValueError:
                print("❌ Invalid user ID or days")
        
        elif choice == "4":
            try:
                limit_input = input("Enter number of users to show (default 10): ").strip()
                limit = int(limit_input) if limit_input else 10
                days_input = input("Enter number of days (leave empty for all time): ").strip()
                days = int(days_input) if days_input else None
                top_users_by_usage(limit, days)
            except ValueError:
                print("❌ Invalid number")
        
        elif choice == "5":
            print("\n👋 Goodbye!")
            break
        
        else:
            print("❌ Invalid choice. Please enter 1-5.")


if __name__ == "__main__":
    main()

