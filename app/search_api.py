# app/search_api.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path
import uvicorn
import sys, os
from random import choice
import urllib.parse

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


@app.get("/filters")
def get_filters():
    """Return available exams (and later subjects, years)"""
    import pandas as pd
    from utils.config_loader import load_config

    cfg = load_config()
    data_csv = cfg["paths"]["data_csv"]

    if not os.path.exists(data_csv):
        return {"exams": []}

    df = pd.read_csv(data_csv)
    exams = sorted(df["exam"].dropna().unique().tolist())

    return {"exams": exams}


@app.get("/ui-config")
def get_ui_config():
    """Return UI configuration settings"""
    cfg = load_config()
    ui_config = cfg.get("ui", {})
    
    return {
        "allow_mode_switching": ui_config.get("allow_mode_switching", False)
    }


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
