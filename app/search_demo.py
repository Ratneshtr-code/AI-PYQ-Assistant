# app/search_demo.py
"""
Simple CLI to query the saved FAISS index.
Uses the same embedding wrapper as build step.
"""

from utils.config_loader import load_config
from pathlib import Path
import pandas as pd

cfg = load_config()
index_parent = Path(cfg["paths"]["faiss_index"]).parent
model_name = cfg["model"]["name"]
model_cache = Path(cfg["paths"]["model_cache"])

# Try langchain-community loader
try:
    from langchain_community.embeddings import HuggingFaceEmbeddings
    from langchain_community.vectorstores import FAISS
    LCC_OK = True
except Exception:
    LCC_OK = False

def load_vectorstore():
    if LCC_OK:
        embeddings = HuggingFaceEmbeddings(model_name=model_name, cache_folder=str(model_cache))
        store = FAISS.load_local(str(index_parent), embeddings)
        return store
    else:
        # fallback manual: load faiss and metadatas
        import faiss, numpy as np, pickle
        idx = faiss.read_index(str(index_parent / "index.faiss"))
        with open(str(index_parent / "metadatas.pkl"), "rb") as f:
            metadatas = pickle.load(f)
        return {"index": idx, "metadatas": metadatas}

def semantic_search(query, top_k=5):
    if LCC_OK:
        store = load_vectorstore()
        results = store.similarity_search_with_score(query, k=top_k)
        # returns list of (Document, score)
        out = []
        for doc, score in results:
            # doc.page_content is the embedded text; doc.metadata contains row
            row = doc.metadata if hasattr(doc, "metadata") else {}
            out.append({"score": float(score), "text": doc.page_content, **row})
        return out
    else:
        # manual fallback (requires FAISS & sentence-transformers)
        import numpy as np
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer(model_name)
        qemb = model.encode([query], convert_to_numpy=True)
        faiss.normalize_L2(qemb)
        store = load_vectorstore()
        D, I = store["index"].search(qemb, top_k)
        out = []
        for score, idx in zip(D[0], I[0]):
            meta = store["metadatas"][idx]
            out.append({"score": float(score), **meta})
        return out

if __name__ == "__main__":
    import argparse, textwrap
    parser = argparse.ArgumentParser(description="Query FAISS index")
    parser.add_argument("--q", type=str, help="Query text (topic or question)", required=False)
    parser.add_argument("--k", type=int, default=5, help="Top k results")
    args = parser.parse_args()

    if not args.q:
        args.q = input("Enter query/topic/question: ").strip()
    res = semantic_search(args.q, top_k=args.k)
    print("Top results:")
    for i, r in enumerate(res, 1):
        print(f"{i}. score={r['score']:.4f} | exam={r.get('exam')} year={r.get('year')}\n   Q: {r.get('question_text')}\n")
