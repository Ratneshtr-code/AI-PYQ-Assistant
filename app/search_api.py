from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path
import uvicorn
import sys, os

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
    subject: str | None = None  # placeholder for future


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

    # 🧠 Fix: Clean up question_text (remove embedded "Options:" etc.)
    filtered = []
    for d, score in docs_and_scores:
        if score < min_score:
            continue

        meta = d.metadata or {}
        q_text = meta.get("question_text") or d.page_content

        # 🔹 Remove "Options:" section if it exists inside text
        if "Options:" in q_text:
            q_text = q_text.split("Options:")[0].strip()

        filtered.append({
            **meta,
            "question_text": q_text,
            "score": float(score),
        })

    # 🧩 Apply filters (Exam, Year, Subject)
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


from random import choice

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


if __name__ == "__main__":
    cfg = load_config()
    host = cfg["backend"]["host"]
    port = cfg["backend"]["port"]
    uvicorn.run("app.search_api:app", host=host, port=port, reload=True)
