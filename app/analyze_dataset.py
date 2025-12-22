#!/usr/bin/env python3
"""
CLI script to analyze the dataset and validate dashboard insights.
This script performs the same calculations as the dashboard API endpoints.
"""

import argparse
import sys
import os
import json
from pathlib import Path
import pandas as pd

# Add utils path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from utils.config_loader import load_config


def load_dataframe():
    """Load and return the CSV dataframe"""
    cfg = load_config()
    data_csv = cfg["paths"]["data_csv"]
    
    if not os.path.exists(data_csv):
        print(f"[ERROR] Dataset not found at {data_csv}")
        sys.exit(1)
    
    try:
        df = pd.read_csv(data_csv, keep_default_na=False)
        df = df.replace('', pd.NA)
        return df
    except Exception as e:
        print(f"[ERROR] Error loading CSV: {e}")
        sys.exit(1)


def print_subject_weightage(df, exam=None):
    """Print subject weightage analysis"""
    filtered_df = df.copy()
    if exam:
        filtered_df = filtered_df[filtered_df["exam"].str.lower() == exam.lower()]
    
    if len(filtered_df) == 0:
        print(f"\n[WARNING] No data found for exam: {exam}")
        return
    
    subject_counts = filtered_df["subject"].value_counts()
    total = len(filtered_df)
    
    print(f"\n{'='*60}")
    print(f"SUBJECT WEIGHTAGE ANALYSIS")
    if exam:
        print(f"Exam: {exam}")
    print(f"{'='*60}")
    print(f"Total Questions: {total}\n")
    
    subjects_data = []
    for subject, count in subject_counts.items():
        if pd.notna(subject) and str(subject).strip():
            percentage = (count / total) * 100
            subjects_data.append({
                "name": str(subject),
                "count": int(count),
                "percentage": percentage
            })
    
    subjects_data.sort(key=lambda x: x["percentage"], reverse=True)
    
    print(f"{'Subject':<40} {'Count':<10} {'Percentage':<10}")
    print("-" * 60)
    for subj in subjects_data:
        bar = "#" * int(subj["percentage"] / 2)  # Visual bar
        print(f"{subj['name']:<40} {subj['count']:<10} {subj['percentage']:>6.2f}% {bar}")


def print_topic_weightage(df, exam=None, subject=None):
    """Print topic weightage analysis"""
    filtered_df = df.copy()
    
    if exam:
        filtered_df = filtered_df[filtered_df["exam"].str.lower() == exam.lower()]
    if subject:
        filtered_df = filtered_df[filtered_df["subject"].str.lower() == subject.lower()]
    
    if len(filtered_df) == 0:
        print(f"\n[WARNING] No data found for exam: {exam}, subject: {subject}")
        return
    
    topic_counts = filtered_df["topic"].value_counts()
    total = len(filtered_df)
    
    print(f"\n{'='*60}")
    print(f"TOPIC WEIGHTAGE ANALYSIS")
    if exam:
        print(f"Exam: {exam}")
    if subject:
        print(f"Subject: {subject}")
    print(f"{'='*60}")
    print(f"Total Questions: {total}\n")
    
    topics_data = []
    for topic, count in topic_counts.items():
        if pd.notna(topic) and str(topic).strip():
            percentage = (count / total) * 100
            topics_data.append({
                "name": str(topic),
                "count": int(count),
                "percentage": percentage
            })
    
    topics_data.sort(key=lambda x: x["percentage"], reverse=True)
    
    print(f"{'Topic':<50} {'Count':<10} {'Percentage':<10}")
    print("-" * 70)
    for topic in topics_data[:20]:  # Show top 20
        bar = "#" * int(topic["percentage"] / 2)
        print(f"{topic['name']:<50} {topic['count']:<10} {topic['percentage']:>6.2f}% {bar}")


def print_hot_topics(df, exam=None, min_consistency=0):
    """Print hot topics analysis"""
    filtered_df = df.copy()
    
    if exam:
        filtered_df = filtered_df[filtered_df["exam"].str.lower() == exam.lower()]
    
    if len(filtered_df) == 0:
        print(f"\n[WARNING] No data found for exam: {exam}")
        return
    
    available_years = sorted(filtered_df["year"].dropna().unique().tolist())
    total_years = len(available_years)
    
    if total_years == 0:
        print(f"\n[WARNING] No year data available")
        return
    
    topic_year_counts = {}
    topic_total_counts = {}
    
    for _, row in filtered_df.iterrows():
        topic = row.get("topic")
        year = row.get("year")
        
        if pd.notna(topic) and pd.notna(year) and str(topic).strip():
            topic_str = str(topic)
            year_int = int(year) if pd.notna(year) else None
            
            if topic_str not in topic_year_counts:
                topic_year_counts[topic_str] = set()
                topic_total_counts[topic_str] = 0
            
            if year_int is not None:
                topic_year_counts[topic_str].add(year_int)
            topic_total_counts[topic_str] += 1
    
    hot_topics = []
    for topic, years_set in topic_year_counts.items():
        years_appeared = len(years_set)
        consistency = (years_appeared / total_years) * 100
        
        if consistency >= min_consistency:
            hot_topics.append({
                "name": topic,
                "years_appeared": years_appeared,
                "total_years": total_years,
                "consistency_percentage": consistency,
                "total_count": topic_total_counts[topic]
            })
    
    hot_topics.sort(key=lambda x: x["consistency_percentage"], reverse=True)
    
    print(f"\n{'='*60}")
    print(f"HOT TOPICS (Consistently Asked)")
    if exam:
        print(f"Exam: {exam}")
    print(f"Years Range: {min(available_years)} - {max(available_years)} ({total_years} years)")
    print(f"{'='*60}\n")
    
    print(f"{'Topic':<40} {'Years':<12} {'Consistency':<12} {'Total':<10}")
    print("-" * 74)
    for topic in hot_topics[:20]:  # Show top 20
        bar = "#" * int(topic["consistency_percentage"] / 2)
        print(f"{topic['name']:<40} {topic['years_appeared']}/{topic['total_years']:<11} "
              f"{topic['consistency_percentage']:>6.2f}% {bar} ({topic['total_count']} questions)")
    
    if hot_topics:
        print(f"\n[INSIGHT] These topics appear almost every year - do NOT skip these.")


def print_topic_trend(df, exam=None, subject=None, topic=None):
    """Print year-by-year trend analysis"""
    filtered_df = df.copy()
    
    if exam:
        filtered_df = filtered_df[filtered_df["exam"].str.lower() == exam.lower()]
    if subject:
        filtered_df = filtered_df[filtered_df["subject"].str.lower() == subject.lower()]
    if topic:
        filtered_df = filtered_df[filtered_df["topic"].str.lower() == topic.lower()]
    
    if len(filtered_df) == 0:
        print(f"\n[WARNING] No data found")
        return
    
    year_counts = filtered_df["year"].value_counts().sort_index()
    total = len(filtered_df)
    
    trend = []
    for year, count in year_counts.items():
        if pd.notna(year):
            percentage = (count / total) * 100 if total > 0 else 0
            trend.append({
                "year": int(year),
                "count": int(count),
                "percentage": percentage
            })
    
    print(f"\n{'='*60}")
    print(f"YEAR-BY-YEAR TREND")
    if exam:
        print(f"Exam: {exam}")
    if subject:
        print(f"Subject: {subject}")
    if topic:
        print(f"Topic: {topic}")
    print(f"{'='*60}\n")
    
    print(f"{'Year':<10} {'Count':<10} {'Percentage':<12} {'Visual'}")
    print("-" * 60)
    
    max_count = max([t["count"] for t in trend]) if trend else 1
    for t in trend:
        bar_length = int((t["count"] / max_count) * 30)
        bar = "#" * bar_length
        print(f"{t['year']:<10} {t['count']:<10} {t['percentage']:>6.2f}%     {bar}")
    
    # Summary
    if trend:
        peak_year = max(trend, key=lambda x: x["count"])
        sorted_trend = sorted(trend, key=lambda x: x["year"])
        mid_point = len(sorted_trend) // 2
        first_half_avg = sum(x["count"] for x in sorted_trend[:mid_point]) / max(mid_point, 1)
        second_half_avg = sum(x["count"] for x in sorted_trend[mid_point:]) / max(len(sorted_trend) - mid_point, 1)
        
        if second_half_avg > first_half_avg * 1.1:
            trend_direction = "[INCREASING]"
        elif first_half_avg > second_half_avg * 1.1:
            trend_direction = "[DECREASING]"
        else:
            trend_direction = "[STABLE]"
        
        avg_frequency = sum(x["count"] for x in trend) / len(trend)
        
        print(f"\nTrend Summary:")
        print(f"   Peak Year: {peak_year['year']} ({peak_year['count']} questions)")
        print(f"   Trend Direction: {trend_direction}")
        print(f"   Average Frequency: {avg_frequency:.2f} questions/year")


def export_json(df, exam=None, subject=None, output_file="analysis.json"):
    """Export analysis results to JSON"""
    results = {}
    
    # Subject weightage
    filtered_df = df.copy()
    if exam:
        filtered_df = filtered_df[filtered_df["exam"].str.lower() == exam.lower()]
    
    if len(filtered_df) > 0:
        subject_counts = filtered_df["subject"].value_counts()
        total = len(filtered_df)
        results["subject_weightage"] = []
        for subject, count in subject_counts.items():
            if pd.notna(subject) and str(subject).strip():
                results["subject_weightage"].append({
                    "name": str(subject),
                    "count": int(count),
                    "percentage": round((count / total) * 100, 2)
                })
        results["subject_weightage"].sort(key=lambda x: x["percentage"], reverse=True)
        results["total_questions"] = total
    
    # Hot topics
    if exam:
        available_years = sorted(filtered_df["year"].dropna().unique().tolist())
        total_years = len(available_years)
        
        topic_year_counts = {}
        topic_total_counts = {}
        
        for _, row in filtered_df.iterrows():
            topic = row.get("topic")
            year = row.get("year")
            
            if pd.notna(topic) and pd.notna(year) and str(topic).strip():
                topic_str = str(topic)
                year_int = int(year) if pd.notna(year) else None
                
                if topic_str not in topic_year_counts:
                    topic_year_counts[topic_str] = set()
                    topic_total_counts[topic_str] = 0
                
                if year_int is not None:
                    topic_year_counts[topic_str].add(year_int)
                topic_total_counts[topic_str] += 1
        
        results["hot_topics"] = []
        for topic, years_set in topic_year_counts.items():
            years_appeared = len(years_set)
            consistency = (years_appeared / total_years) * 100
            results["hot_topics"].append({
                "name": topic,
                "years_appeared": years_appeared,
                "total_years": total_years,
                "consistency_percentage": round(consistency, 2),
                "total_count": topic_total_counts[topic]
            })
        results["hot_topics"].sort(key=lambda x: x["consistency_percentage"], reverse=True)
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    print(f"\n[SUCCESS] Analysis exported to: {output_file}")


def main():
    parser = argparse.ArgumentParser(
        description="Analyze dataset and validate dashboard insights. This script performs the same calculations as the dashboard API endpoints.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
OPTIONS SUMMARY:
  --exam              Filter by exam name (optional, default: None)
                      Examples: UPSC, dummy, SSC, PSC
  
  --subject           Filter by subject name (optional, default: None)
                      Examples: "Indian Polity", "Geography", "History"
  
  --topic             Filter by topic name (optional, default: None)
                      Examples: "Fundamental Rights", "Climate Change"
  
  --min-consistency  Minimum consistency percentage for hot topics (optional, default: 0.0)
                      Range: 0.0 to 100.0
                      Only topics with consistency >= this value will be shown
  
  --output-format     Output format (optional, default: text)
                      Choices: text, json, table
                      - text: Human-readable console output
                      - json: Export results to JSON file
                      - table: Table format (same as text)
  
  --output-file       Output file path for JSON format (optional, default: analysis.json)
                      Only used when --output-format is json

EXAMPLES:
  # Analyze all exams (no filters)
  python analyze_dataset.py
  
  # Analyze specific exam
  python analyze_dataset.py --exam UPSC
  
  # Analyze exam with subject filter
  python analyze_dataset.py --exam UPSC --subject "Indian Polity"
  
  # Show only hot topics with >= 70% consistency
  python analyze_dataset.py --exam UPSC --min-consistency 70
  
  # Export results to JSON
  python analyze_dataset.py --exam UPSC --output-format json --output-file results.json
  
  # Analyze topic trend for specific subject
  python analyze_dataset.py --exam UPSC --subject "Geography" --topic "Climate Change"
        """,
        add_help=True
    )
    
    parser.add_argument(
        "--exam",
        type=str,
        default=None,
        metavar="EXAM_NAME",
        help="Filter by exam name (default: None, analyzes all exams)"
    )
    parser.add_argument(
        "--subject",
        type=str,
        default=None,
        metavar="SUBJECT_NAME",
        help="Filter by subject name (default: None, analyzes all subjects)"
    )
    parser.add_argument(
        "--topic",
        type=str,
        default=None,
        metavar="TOPIC_NAME",
        help="Filter by topic name (default: None, analyzes all topics)"
    )
    parser.add_argument(
        "--min-consistency",
        type=float,
        default=0.0,
        metavar="PERCENTAGE",
        help="Minimum consistency percentage for hot topics (default: 0.0, range: 0.0-100.0)"
    )
    parser.add_argument(
        "--output-format",
        choices=["text", "json", "table"],
        default="text",
        metavar="FORMAT",
        help="Output format: text (default), json, or table"
    )
    parser.add_argument(
        "--output-file",
        type=str,
        default="analysis.json",
        metavar="FILE_PATH",
        help="Output file path for JSON format (default: analysis.json)"
    )
    
    args = parser.parse_args()
    
    # Validate min-consistency range
    if args.min_consistency < 0 or args.min_consistency > 100:
        print(f"[ERROR] --min-consistency must be between 0.0 and 100.0, got: {args.min_consistency}")
        sys.exit(1)
    
    # Load data
    df = load_dataframe()
    print(f"[SUCCESS] Loaded dataset with {len(df)} questions")
    
    if args.output_format == "json":
        export_json(df, exam=args.exam, subject=args.subject, output_file=args.output_file)
        return
    
    # Print analyses
    print_subject_weightage(df, exam=args.exam)
    
    if args.subject:
        print_topic_weightage(df, exam=args.exam, subject=args.subject)
    
    print_hot_topics(df, exam=args.exam, min_consistency=args.min_consistency)
    
    if args.subject or args.topic:
        print_topic_trend(df, exam=args.exam, subject=args.subject, topic=args.topic)
    
    print(f"\n{'='*60}")
    print("[SUCCESS] Analysis complete!")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()

