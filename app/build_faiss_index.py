# app/build_faiss_index.py
"""
Build FAISS index from CSV dataset (data/questions.csv)
Saves index files into path defined in config.yaml (paths.faiss_index parent folder).
"""

import sys, os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from pathlib import Path
import pandas as pd
from utils.config_loader import load_config

# Try using LangChain's HuggingFaceEmbeddings wrapper. If not available,
# fallback to sentence-transformers directly (we attempt the wrapper first).
try:
    from langchain_community.embeddings import HuggingFaceEmbeddings
    from langchain_community.vectorstores import FAISS
    LCC_OK = True
except Exception as e:
    LCC_OK = False
    # fallback imports
    from sentence_transformers import SentenceTransformer
    import numpy as np
    import faiss

def build_index():
    cfg = load_config()
    data_csv = Path(cfg["paths"]["data_csv"])
    index_parent = Path(cfg["paths"]["faiss_index"]).parent
    model_name = cfg["model"]["name"]
    model_cache = Path(cfg["paths"]["model_cache"])

    if not data_csv.exists():
        raise FileNotFoundError(f"Dataset not found at {data_csv}. Please create it first.")

    df = pd.read_csv(data_csv)
    print(f"✅ Loaded dataset with {len(df)} rows from {data_csv}")

    # Form text content to embed (question + options)
    def mk_text(row):
        # if options columns exist use them; otherwise use only question_text
        q = str(row.get("question_text", "")).strip()
        if all(col in row.index for col in ("option_a","option_b","option_c","option_d")):
            a = row["option_a"]
            b = row["option_b"]
            c = row["option_c"]
            d = row["option_d"]
            return f"Q: {q} Options: (A) {a} (B) {b} (C) {c} (D) {d}"
        return q

    texts = df.apply(mk_text, axis=1).tolist()
    metadatas = df.to_dict(orient="records")

    os.makedirs(index_parent, exist_ok=True)

    if LCC_OK:
        print("🔄 Using langchain_community HuggingFaceEmbeddings + FAISS wrapper")
        embeddings = HuggingFaceEmbeddings(model_name=model_name, cache_folder=str(model_cache))
        vector_store = FAISS.from_texts(texts, embedding=embeddings, metadatas=metadatas)
        # save_local saves a folder with index and metadata
        vector_store.save_local(str(index_parent))
        print(f"✅ FAISS index saved to {index_parent} (langchain_community format)")
    else:
        # fallback: create embeddings with sentence-transformers & save faiss index manually
        print("⚠️ langchain_community not available — using local sentence-transformers + faiss fallback")
        model = SentenceTransformer(model_name)
        print("🔄 Creating embeddings (this may take a while)...")
        emb = model.encode(texts, show_progress_bar=True, convert_to_numpy=True)

        # normalize for cosine similarity with inner product index
        faiss.normalize_L2(emb)

        d = emb.shape[1]
        index = faiss.IndexFlatIP(d)
        index.add(emb)

        # save index and metadata
        faiss.write_index(index, str(index_parent / "index.faiss"))
        # save embeddings and metadata as numpy/pickle for reference
        import numpy as np, pickle
        np.save(str(index_parent / "embeddings.npy"), emb)
        with open(str(index_parent / "metadatas.pkl"), "wb") as f:
            pickle.dump(metadatas, f)
        print(f"✅ FAISS index saved to {index_parent} (manual format)")

if __name__ == "__main__":
    build_index()
