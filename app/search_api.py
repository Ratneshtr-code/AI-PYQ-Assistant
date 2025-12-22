# app/search_api.py
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path
import uvicorn
import sys, os
from random import choice
import urllib.parse
import pandas as pd
from typing import Optional

# add utils path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from utils.config_loader import load_config

# embeddings + FAISS
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings

app = FastAPI(title="AI PYQ Assistant - Search API")

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SearchRequest(BaseModel):
    query: str
    page: int = 1
    page_size: int = 10
    exam: str | None = None
    year: int | None = None
    subject: str | None = None  # Filter by subject


@app.on_event("startup")
def load_index():
    global vector_store, cfg, default_top_k
    cfg = load_config()
    model_name = cfg["model"]["name"]
    model_cache = Path(cfg["paths"]["model_cache"])
    index_parent = Path(cfg["paths"]["faiss_index"]).parent

    default_top_k = cfg["backend"].get("default_top_k", 5)

    print("🔄 Loading embedding model and FAISS index...")
    embeddings = HuggingFaceEmbeddings(model_name=model_name, cache_folder=str(model_cache))
    vector_store = FAISS.load_local(str(index_parent), embeddings, allow_dangerous_deserialization=True)
    print("✅ Index and embeddings loaded successfully.")


@app.post("/search")
def search(req: SearchRequest):
    query = req.query.strip()
    page = max(req.page, 1)
    page_size = cfg["backend"].get("default_page_size", 10)
    retrieval_k = cfg["backend"].get("retrieval_k", 100)
    min_score = cfg["backend"].get("min_score", 0.35)

    print(f"🔍 Searching for: '{query}' (retrieval_k={retrieval_k}) ...")

    # Retrieve candidates
    docs_and_scores = vector_store.similarity_search_with_score(query, k=retrieval_k)

    # Clean and collect
    filtered = []
    for d, score in docs_and_scores:
        if score < min_score:
            continue
        meta = d.metadata or {}
        q_text = meta.get("question_text") or d.page_content
        if "Options:" in q_text:
            q_text = q_text.split("Options:")[0].strip()
        filtered.append({
            **meta,
            "question_text": q_text,
            "score": float(score),
        })

    # Apply filters
    if req.exam:
        filtered = [r for r in filtered if r.get("exam", "").lower() == req.exam.lower()]
    if req.year:
        filtered = [r for r in filtered if str(r.get("year", "")) == str(req.year)]
    if req.subject:
        filtered = [r for r in filtered if req.subject.lower() in str(r.get("subject", "")).lower()]

    total_matches = len(filtered)
    if total_matches == 0:
        return {
            "query": query,
            "results": [],
            "message": "No strong matches found with the given filters."
        }

    # Pagination
    start = (page - 1) * page_size
    end = start + page_size
    paginated = filtered[start:end]

    return {
        "query": query,
        "total_matches": total_matches,
        "page": page,
        "page_size": page_size,
        "filters": {
            "exam": req.exam,
            "year": req.year,
            "subject": req.subject
        },
        "results": paginated
    }


def load_dataframe():
    """Load and return the CSV dataframe, with caching for performance"""
    cfg = load_config()
    data_csv = cfg["paths"]["data_csv"]
    
    if not os.path.exists(data_csv):
        return None
    
    try:
        df = pd.read_csv(data_csv, keep_default_na=False)
        # Replace empty strings with NaN for proper filtering
        df = df.replace('', pd.NA)
        return df
    except Exception as e:
        print(f"Error loading CSV: {e}")
        return None


@app.get("/filters")
def get_filters():
    """Return available exams (and later subjects, years)"""
    df = load_dataframe()
    if df is None:
        return {"exams": []}

    exams = sorted(df["exam"].dropna().unique().tolist())
    return {"exams": exams}


# ==================== DASHBOARD ENDPOINTS ====================

@app.get("/dashboard/subject-weightage")
def get_subject_weightage(
    exam: Optional[str] = Query(None, description="Filter by exam name"),
    year_from: Optional[int] = Query(None, description="Filter from year"),
    year_to: Optional[int] = Query(None, description="Filter to year")
):
    """Get subject weightage distribution for an exam"""
    df = load_dataframe()
    if df is None:
        return {"subjects": [], "total_questions": 0}
    
    # Filter by exam if provided
    filtered_df = df.copy()
    if exam:
        filtered_df = filtered_df[filtered_df["exam"].str.lower() == exam.lower()]
    
    # Filter by year range if provided
    if year_from is not None:
        filtered_df = filtered_df[filtered_df["year"] >= year_from]
    if year_to is not None:
        filtered_df = filtered_df[filtered_df["year"] <= year_to]
    
    if len(filtered_df) == 0:
        return {"subjects": [], "total_questions": 0}
    
    # Count by subject
    subject_counts = filtered_df["subject"].value_counts()
    total = len(filtered_df)
    
    subjects = []
    for subject, count in subject_counts.items():
        if pd.notna(subject) and str(subject).strip():
            percentage = round((count / total) * 100, 2)
            subjects.append({
                "name": str(subject),
                "count": int(count),
                "percentage": percentage
            })
    
    # Sort by percentage descending
    subjects.sort(key=lambda x: x["percentage"], reverse=True)
    
    return {
        "subjects": subjects,
        "total_questions": total
    }


@app.get("/dashboard/topic-weightage")
def get_topic_weightage(
    exam: Optional[str] = Query(None, description="Filter by exam name"),
    subject: Optional[str] = Query(None, description="Filter by subject name"),
    year_from: Optional[int] = Query(None, description="Filter from year"),
    year_to: Optional[int] = Query(None, description="Filter to year")
):
    """Get topic weightage distribution for an exam and subject"""
    df = load_dataframe()
    if df is None:
        return {"topics": [], "total_questions": 0}
    
    filtered_df = df.copy()
    
    # Filter by exam if provided
    if exam:
        filtered_df = filtered_df[filtered_df["exam"].str.lower() == exam.lower()]
    
    # Filter by subject if provided
    if subject:
        filtered_df = filtered_df[filtered_df["subject"].str.lower() == subject.lower()]
    
    # Filter by year range if provided
    if year_from is not None:
        filtered_df = filtered_df[filtered_df["year"] >= year_from]
    if year_to is not None:
        filtered_df = filtered_df[filtered_df["year"] <= year_to]
    
    if len(filtered_df) == 0:
        return {"topics": [], "total_questions": 0}
    
    # Count by topic
    topic_counts = filtered_df["topic"].value_counts()
    total = len(filtered_df)
    
    topics = []
    for topic, count in topic_counts.items():
        if pd.notna(topic) and str(topic).strip():
            percentage = round((count / total) * 100, 2)
            topics.append({
                "name": str(topic),
                "count": int(count),
                "percentage": percentage
            })
    
    # Sort by percentage descending
    topics.sort(key=lambda x: x["percentage"], reverse=True)
    
    return {
        "topics": topics,
        "total_questions": total
    }


@app.get("/dashboard/hot-topics")
def get_hot_topics(
    exam: Optional[str] = Query(None, description="Filter by exam name"),
    min_years: int = Query(1, description="Minimum number of years topic should appear"),
    year_from: Optional[int] = Query(None, description="Filter from year"),
    year_to: Optional[int] = Query(None, description="Filter to year"),
    subject: Optional[str] = Query(None, description="Filter by subject name")
):
    """Get hot topics that appear consistently across years"""
    df = load_dataframe()
    if df is None:
        return {"topics": []}
    
    filtered_df = df.copy()
    
    # Filter by exam if provided
    if exam:
        filtered_df = filtered_df[filtered_df["exam"].str.lower() == exam.lower()]
    
    # Filter by subject if provided
    if subject:
        filtered_df = filtered_df[filtered_df["subject"].str.lower() == subject.lower()]
    
    # Filter by year range if provided
    if year_from is not None:
        filtered_df = filtered_df[filtered_df["year"] >= year_from]
    if year_to is not None:
        filtered_df = filtered_df[filtered_df["year"] <= year_to]
    
    if len(filtered_df) == 0:
        return {"topics": []}
    
    # Get unique years for this exam
    available_years = sorted(filtered_df["year"].dropna().unique().tolist())
    total_years = len(available_years)
    
    if total_years == 0:
        return {"topics": []}
    
    # Group by topic and year to count appearances
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
    
    # Calculate consistency
    hot_topics = []
    for topic, years_set in topic_year_counts.items():
        years_appeared = len(years_set)
        
        if years_appeared >= min_years:
            consistency = round((years_appeared / total_years) * 100, 2)
            hot_topics.append({
                "name": topic,
                "years_appeared": years_appeared,
                "total_years": total_years,
                "consistency_percentage": consistency,
                "total_count": topic_total_counts[topic]
            })
    
    # Sort by consistency percentage descending
    hot_topics.sort(key=lambda x: x["consistency_percentage"], reverse=True)
    
    return {"topics": hot_topics}


@app.get("/dashboard/topic-trend")
def get_topic_trend(
    exam: Optional[str] = Query(None, description="Filter by exam name"),
    subject: Optional[str] = Query(None, description="Filter by subject name"),
    topic: Optional[str] = Query(None, description="Filter by topic name"),
    year_from: Optional[int] = Query(None, description="Filter from year"),
    year_to: Optional[int] = Query(None, description="Filter to year")
):
    """Get year-by-year trend for a topic or subject"""
    df = load_dataframe()
    if df is None:
        return {"trend": [], "summary": {}}
    
    filtered_df = df.copy()
    
    # Filter by exam if provided
    if exam:
        filtered_df = filtered_df[filtered_df["exam"].str.lower() == exam.lower()]
    
    # Filter by subject if provided
    if subject:
        filtered_df = filtered_df[filtered_df["subject"].str.lower() == subject.lower()]
    
    # Filter by topic if provided
    if topic:
        filtered_df = filtered_df[filtered_df["topic"].str.lower() == topic.lower()]
    
    # Filter by year range if provided
    if year_from is not None:
        filtered_df = filtered_df[filtered_df["year"] >= year_from]
    if year_to is not None:
        filtered_df = filtered_df[filtered_df["year"] <= year_to]
    
    if len(filtered_df) == 0:
        return {"trend": [], "summary": {}}
    
    # Group by year
    year_counts = filtered_df["year"].value_counts().sort_index()
    total = len(filtered_df)
    
    trend = []
    for year, count in year_counts.items():
        if pd.notna(year):
            percentage = round((count / total) * 100, 2) if total > 0 else 0
            trend.append({
                "year": int(year),
                "count": int(count),
                "percentage": percentage
            })
    
    # Calculate summary
    if trend:
        peak_year = max(trend, key=lambda x: x["count"])
        peak_year_value = peak_year["year"]
        
        # Determine trend direction (compare first half vs second half)
        sorted_trend = sorted(trend, key=lambda x: x["year"])
        mid_point = len(sorted_trend) // 2
        first_half_avg = sum(x["count"] for x in sorted_trend[:mid_point]) / max(mid_point, 1)
        second_half_avg = sum(x["count"] for x in sorted_trend[mid_point:]) / max(len(sorted_trend) - mid_point, 1)
        
        if second_half_avg > first_half_avg * 1.1:
            trend_direction = "increasing"
        elif first_half_avg > second_half_avg * 1.1:
            trend_direction = "decreasing"
        else:
            trend_direction = "stable"
        
        avg_frequency = sum(x["count"] for x in trend) / len(trend)
        
        summary = {
            "peak_year": peak_year_value,
            "trend_direction": trend_direction,
            "average_frequency": round(avg_frequency, 2)
        }
    else:
        summary = {}
    
    return {
        "trend": trend,
        "summary": summary
    }


@app.get("/dashboard/filters")
def get_dashboard_filters(exam: Optional[str] = Query(None, description="Filter by exam name")):
    """Get available filters (subjects, topics, years) for dashboard"""
    df = load_dataframe()
    if df is None:
        return {"subjects": [], "topics": [], "years": []}
    
    filtered_df = df.copy()
    
    # Filter by exam if provided
    if exam:
        filtered_df = filtered_df[filtered_df["exam"].str.lower() == exam.lower()]
    
    subjects = sorted(filtered_df["subject"].dropna().unique().tolist())
    topics = sorted(filtered_df["topic"].dropna().unique().tolist())
    years = sorted(filtered_df["year"].dropna().unique().tolist())
    
    return {
        "subjects": subjects,
        "topics": topics,
        "years": [int(y) for y in years if pd.notna(y)]
    }


@app.get("/dashboard/stable-volatile")
def get_stable_volatile(
    exam: Optional[str] = Query(None, description="Filter by exam name"),
    subject: Optional[str] = Query(None, description="Filter by subject name"),
    year_from: Optional[int] = Query(None, description="Filter from year"),
    year_to: Optional[int] = Query(None, description="Filter to year"),
    coverage_threshold: float = Query(0.7, description="Minimum coverage ratio for stable"),
    variation_threshold: float = Query(2.0, description="Maximum variation for stable")
):
    """Calculate stable vs volatile topics based on coverage and variation"""
    df = load_dataframe()
    if df is None:
        return {"stable_topics": [], "volatile_topics": [], "summary": ""}
    
    filtered_df = df.copy()
    
    # Filter by exam if provided
    if exam:
        filtered_df = filtered_df[filtered_df["exam"].str.lower() == exam.lower()]
    
    # Filter by subject if provided
    if subject:
        filtered_df = filtered_df[filtered_df["subject"].str.lower() == subject.lower()]
    
    # Filter by year range if provided
    if year_from is not None:
        filtered_df = filtered_df[filtered_df["year"] >= year_from]
    if year_to is not None:
        filtered_df = filtered_df[filtered_df["year"] <= year_to]
    
    if len(filtered_df) == 0:
        return {"stable_topics": [], "volatile_topics": [], "summary": ""}
    
    # Get unique years in filtered data
    available_years = sorted(filtered_df["year"].dropna().unique().tolist())
    total_years = len(available_years)
    
    if total_years == 0:
        return {"stable_topics": [], "volatile_topics": [], "summary": ""}
    
    # Group by topic and year
    topic_year_data = {}
    for _, row in filtered_df.iterrows():
        topic = row.get("topic")
        year = row.get("year")
        
        if pd.notna(topic) and pd.notna(year) and str(topic).strip():
            topic_str = str(topic)
            year_int = int(year)
            
            if topic_str not in topic_year_data:
                topic_year_data[topic_str] = {}
            if year_int not in topic_year_data[topic_str]:
                topic_year_data[topic_str][year_int] = 0
            topic_year_data[topic_str][year_int] += 1
    
    stable_topics = []
    volatile_topics = []
    
    for topic, year_counts in topic_year_data.items():
        years_with_questions = len(year_counts)
        coverage_ratio = years_with_questions / total_years if total_years > 0 else 0
        
        # Calculate variation (average absolute difference between consecutive years)
        sorted_years = sorted(year_counts.keys())
        variations = []
        for i in range(1, len(sorted_years)):
            prev_year = sorted_years[i-1]
            curr_year = sorted_years[i]
            if prev_year + 1 == curr_year:  # Consecutive years
                diff = abs(year_counts[curr_year] - year_counts[prev_year])
                variations.append(diff)
        
        avg_variation = sum(variations) / len(variations) if variations else 0
        
        topic_info = {
            "name": topic,
            "coverage_ratio": round(coverage_ratio, 2),
            "years_appeared": years_with_questions,
            "total_years": total_years,
            "avg_variation": round(avg_variation, 2),
            "total_count": sum(year_counts.values())
        }
        
        if coverage_ratio >= coverage_threshold and avg_variation < variation_threshold:
            stable_topics.append(topic_info)
        else:
            volatile_topics.append(topic_info)
    
    # Sort stable topics by coverage ratio descending
    stable_topics.sort(key=lambda x: x["coverage_ratio"], reverse=True)
    # Sort volatile topics by total count descending
    volatile_topics.sort(key=lambda x: x["total_count"], reverse=True)
    
    # Generate summary
    exam_name = exam or "All Exams"
    subject_name = subject or "All Subjects"
    summary = f"Analysis for {exam_name} - {subject_name}: {len(stable_topics)} stable topics (high ROI), {len(volatile_topics)} volatile topics (high risk)."
    
    return {
        "stable_topics": stable_topics,
        "volatile_topics": volatile_topics,
        "summary": summary
    }


@app.get("/dashboard/coverage")
def get_coverage(
    exam: Optional[str] = Query(None, description="Filter by exam name"),
    subject: Optional[str] = Query(None, description="Filter by subject name"),
    year_from: Optional[int] = Query(None, description="Filter from year"),
    year_to: Optional[int] = Query(None, description="Filter to year"),
    top_n: int = Query(10, description="Number of top topics to consider")
):
    """Calculate coverage percentage for top N topics"""
    df = load_dataframe()
    if df is None:
        return {"coverage_percentage": 0, "top_topics": [], "total_questions": 0}
    
    filtered_df = df.copy()
    
    # Filter by exam if provided
    if exam:
        filtered_df = filtered_df[filtered_df["exam"].str.lower() == exam.lower()]
    
    # Filter by subject if provided
    if subject:
        filtered_df = filtered_df[filtered_df["subject"].str.lower() == subject.lower()]
    
    # Filter by year range if provided
    if year_from is not None:
        filtered_df = filtered_df[filtered_df["year"] >= year_from]
    if year_to is not None:
        filtered_df = filtered_df[filtered_df["year"] <= year_to]
    
    if len(filtered_df) == 0:
        return {"coverage_percentage": 0, "top_topics": [], "total_questions": 0}
    
    total_questions = len(filtered_df)
    
    # Count by topic
    topic_counts = filtered_df["topic"].value_counts()
    
    # Get top N topics
    top_topics_list = []
    top_topics_count = 0
    
    for topic, count in topic_counts.head(top_n).items():
        if pd.notna(topic) and str(topic).strip():
            top_topics_list.append({
                "name": str(topic),
                "count": int(count)
            })
            top_topics_count += int(count)
    
    coverage_percentage = round((top_topics_count / total_questions) * 100, 2) if total_questions > 0 else 0
    
    return {
        "coverage_percentage": coverage_percentage,
        "top_topics": top_topics_list,
        "total_questions": total_questions,
        "top_n": top_n
    }


@app.get("/dashboard/cross-exam/subject-distribution")
def get_cross_exam_subject_distribution(
    exams: str = Query(..., description="Comma-separated list of exam names"),
    year_from: Optional[int] = Query(None, description="Filter from year"),
    year_to: Optional[int] = Query(None, description="Filter to year")
):
    """Get subject distribution across multiple exams"""
    df = load_dataframe()
    if df is None:
        return {"exams": {}}
    
    exam_list = [e.strip() for e in exams.split(",") if e.strip()]
    if not exam_list:
        return {"exams": {}}
    
    filtered_df = df.copy()
    
    # Filter by exams
    filtered_df = filtered_df[filtered_df["exam"].str.lower().isin([e.lower() for e in exam_list])]
    
    # Filter by year range if provided
    if year_from is not None:
        filtered_df = filtered_df[filtered_df["year"] >= year_from]
    if year_to is not None:
        filtered_df = filtered_df[filtered_df["year"] <= year_to]
    
    result = {}
    
    for exam_name in exam_list:
        exam_df = filtered_df[filtered_df["exam"].str.lower() == exam_name.lower()]
        if len(exam_df) == 0:
            result[exam_name] = {"subjects": [], "total_questions": 0}
            continue
        
        subject_counts = exam_df["subject"].value_counts()
        total = len(exam_df)
        
        subjects = []
        for subject, count in subject_counts.items():
            if pd.notna(subject) and str(subject).strip():
                percentage = round((count / total) * 100, 2)
                subjects.append({
                    "name": str(subject),
                    "count": int(count),
                    "percentage": percentage
                })
        
        subjects.sort(key=lambda x: x["percentage"], reverse=True)
        
        result[exam_name] = {
            "subjects": subjects,
            "total_questions": total
        }
    
    return {"exams": result}


@app.get("/dashboard/cross-exam/topic-distribution")
def get_cross_exam_topic_distribution(
    exams: str = Query(..., description="Comma-separated list of exam names"),
    subject: str = Query(..., description="Subject name"),
    year_from: Optional[int] = Query(None, description="Filter from year"),
    year_to: Optional[int] = Query(None, description="Filter to year")
):
    """Get topic distribution for a subject across multiple exams"""
    df = load_dataframe()
    if df is None:
        return {"exams": {}}
    
    exam_list = [e.strip() for e in exams.split(",") if e.strip()]
    if not exam_list:
        return {"exams": {}}
    
    filtered_df = df.copy()
    
    # Filter by exams
    filtered_df = filtered_df[filtered_df["exam"].str.lower().isin([e.lower() for e in exam_list])]
    
    # Filter by subject
    filtered_df = filtered_df[filtered_df["subject"].str.lower() == subject.lower()]
    
    # Filter by year range if provided
    if year_from is not None:
        filtered_df = filtered_df[filtered_df["year"] >= year_from]
    if year_to is not None:
        filtered_df = filtered_df[filtered_df["year"] <= year_to]
    
    result = {}
    
    for exam_name in exam_list:
        exam_df = filtered_df[filtered_df["exam"].str.lower() == exam_name.lower()]
        if len(exam_df) == 0:
            result[exam_name] = {"topics": [], "total_questions": 0}
            continue
        
        topic_counts = exam_df["topic"].value_counts()
        total = len(exam_df)
        
        topics = []
        for topic, count in topic_counts.items():
            if pd.notna(topic) and str(topic).strip():
                percentage = round((count / total) * 100, 2)
                topics.append({
                    "name": str(topic),
                    "count": int(count),
                    "percentage": percentage
                })
        
        topics.sort(key=lambda x: x["percentage"], reverse=True)
        
        result[exam_name] = {
            "topics": topics,
            "total_questions": total
        }
    
    return {"exams": result, "subject": subject}


@app.get("/dashboard/cross-exam/hot-topics")
def get_cross_exam_hot_topics(
    exams: str = Query(..., description="Comma-separated list of exam names"),
    year_from: Optional[int] = Query(None, description="Filter from year"),
    year_to: Optional[int] = Query(None, description="Filter to year"),
    min_years: int = Query(1, description="Minimum number of years topic should appear")
):
    """Get hot topics across multiple exams"""
    df = load_dataframe()
    if df is None:
        return {"exams": {}}
    
    exam_list = [e.strip() for e in exams.split(",") if e.strip()]
    if not exam_list:
        return {"exams": {}}
    
    filtered_df = df.copy()
    
    # Filter by exams
    filtered_df = filtered_df[filtered_df["exam"].str.lower().isin([e.lower() for e in exam_list])]
    
    # Filter by year range if provided
    if year_from is not None:
        filtered_df = filtered_df[filtered_df["year"] >= year_from]
    if year_to is not None:
        filtered_df = filtered_df[filtered_df["year"] <= year_to]
    
    result = {}
    
    for exam_name in exam_list:
        exam_df = filtered_df[filtered_df["exam"].str.lower() == exam_name.lower()]
        if len(exam_df) == 0:
            result[exam_name] = {"topics": []}
            continue
        
        available_years = sorted(exam_df["year"].dropna().unique().tolist())
        total_years = len(available_years)
        
        if total_years == 0:
            result[exam_name] = {"topics": []}
            continue
        
        topic_year_counts = {}
        topic_total_counts = {}
        
        for _, row in exam_df.iterrows():
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
            
            if years_appeared >= min_years:
                consistency = round((years_appeared / total_years) * 100, 2)
                hot_topics.append({
                    "name": topic,
                    "years_appeared": years_appeared,
                    "total_years": total_years,
                    "consistency_percentage": consistency,
                    "total_count": topic_total_counts[topic]
                })
        
        hot_topics.sort(key=lambda x: x["consistency_percentage"], reverse=True)
        
        result[exam_name] = {"topics": hot_topics}
    
    return {"exams": result}


@app.get("/ui-config")
def get_ui_config():
    """Return UI configuration settings"""
    cfg = load_config()
    ui_config = cfg.get("ui", {})
    
    return {
        "allow_mode_switching": ui_config.get("allow_mode_switching", False),
        "max_exam_comparison": ui_config.get("max_exam_comparison", 3)
    }


@app.post("/admin/login")
def admin_login(data: dict):
    """Verify admin credentials from config.yaml"""
    try:
        cfg = load_config()
        ui_config = cfg.get("ui", {})
        admin_config = ui_config.get("admin", {})
        
        username = data.get("username", "")
        password = data.get("password", "")
        
        expected_username = admin_config.get("username", "admin")
        expected_password = admin_config.get("password", "admin123")
        
        # Debug logging (remove in production)
        print(f"Admin login attempt: username='{username}', expected='{expected_username}'")
        print(f"Password check: provided='{password}', expected='{expected_password}'")
        
        if username == expected_username and password == expected_password:
            return {"success": True, "message": "Admin login successful"}
        else:
            return {
                "success": False, 
                "message": f"Invalid credentials. Expected username: '{expected_username}'"
            }
    except Exception as e:
        print(f"Error in admin_login: {e}")
        return {"success": False, "message": f"Server error: {str(e)}"}


@app.post("/explain")
def explain_question(data: dict):
    """
    Mock explanation endpoint.
    Later, this will call OpenAI or any LLM to generate reasoning.
    """
    question = data.get("question_text", "")
    correct_option = data.get("correct_option", "")

    # Mock explanations for now
    examples = [
        f"The correct answer is **{correct_option}** because it directly addresses the core concept mentioned in the question.",
        f"**{correct_option}** is right since it aligns with standard facts and principles related to the question topic.",
        f"This question refers to a fundamental concept — the answer **{correct_option}** accurately represents that.",
    ]

    return {
        "question": question,
        "correct_option": correct_option,
        "explanation": choice(examples)
    }


@app.post("/explain_option")
def explain_option(data: dict):
    """
    Explain why a selected (incorrect) option is wrong and return similar PYQs found via FAISS.
    """
    import urllib.parse
    from random import choice

    selected_option = data.get("selected_option", "")
    question_text = data.get("question_text", "")

    if not selected_option:
        return {"error": "selected_option is required."}

    mock_reasons = [
        f"'{selected_option}' is incorrect because it represents a related but distinct concept from the question context.",
        f"This choice is commonly confused with the correct answer but applies to a different principle or topic.",
        f"'{selected_option}' addresses a similar idea, but not the one specifically asked here.",
    ]
    topics = [
        "Indian Polity - Fundamental Rights",
        "Economy - Fiscal Policy",
        "History - National Movement",
        "Geography - Climate and Vegetation",
        "Science - Laws of Motion",
    ]

    similar_pyqs = []
    try:
        k = cfg["backend"].get("explain_option_k", 5)
        min_score = cfg["backend"].get("min_score", 0.35)

        # 🔍 Search by the incorrect option text itself
        docs_and_scores = vector_store.similarity_search_with_score(selected_option, k=k)

        for d, score in docs_and_scores:
            if score < min_score:
                continue  # skip weak matches

            meta = d.metadata or {}
            q_text = meta.get("question_text") or d.page_content
            if "Options:" in q_text:
                q_text = q_text.split("Options:")[0].strip()

            # 🧭 Encode the found question as the query param (so frontend loads that question)
            query_param = urllib.parse.quote_plus(q_text)
            ui_link = f"http://localhost:5173/?query={query_param}"

            similar_pyqs.append({
                "question_id": meta.get("question_id"),
                "question_text": q_text,
                "score": round(float(score), 3),
                "link": ui_link
            })
    except Exception as e:
        print("⚠️ explain_option: FAISS search failed:", e)
        similar_pyqs = []

    return {
        "question_text": question_text,
        "selected_option": selected_option,
        "reason": choice(mock_reasons),
        "topic": choice(topics),
        "similar_pyqs": similar_pyqs,
    }


if __name__ == "__main__":
    cfg = load_config()
    host = cfg["backend"]["host"]
    port = cfg["backend"]["port"]
    uvicorn.run("app.search_api:app", host=host, port=port, reload=True)
