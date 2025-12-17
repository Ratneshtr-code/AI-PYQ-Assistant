# app/build_faiss_index.py
"""
Build FAISS index from CSV dataset (data/questions.csv)
Cleans messy text, quotes, and ensures safe FAISS embedding creation.
"""

import sys, os, csv, re
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from pathlib import Path
import pandas as pd
from utils.config_loader import load_config

# Try using LangChain's HuggingFaceEmbeddings wrapper
try:
    from langchain_community.embeddings import HuggingFaceEmbeddings
    from langchain_community.vectorstores import FAISS
    LCC_OK = True
except Exception as e:
    LCC_OK = False
    from sentence_transformers import SentenceTransformer
    import numpy as np
    import faiss


def safe_read_csv(path: Path) -> pd.DataFrame:
    """Safely read CSV with fallbacks for quotes, encoding, and field count."""
    try:
        df = pd.read_csv(path, quotechar='"', escapechar='\\', encoding="utf-8", quoting=csv.QUOTE_MINIMAL)
        return df
    except pd.errors.ParserError as e:
        print("⚠️ Standard CSV parse failed, retrying with flexible quoting...")
        try:
            df = pd.read_csv(path, quotechar='"', escapechar='\\', quoting=csv.QUOTE_NONE, engine="python")
            return df
        except Exception as e2:
            raise RuntimeError(f"❌ Failed to parse {path}: {e2}")


def clean_text(text: str) -> str:
    """Preserve real newlines, fix unicode arrows, and normalize spaces."""
    if pd.isna(text):
        return ""
    text = str(text).strip()

    # Replace escaped newlines if any
    text = text.replace("\\n", "\n").replace("\r\n", "\n").replace("\r", "\n")

    # Fix arrow artifacts and weird encodings
    text = text.replace("â†’", "→").replace("â€™", "'").replace("â€œ", "\"").replace("â€", "\"")

    # Remove extra spaces around lines
    lines = [ln.strip() for ln in text.split("\n")]
    text = "\n".join([ln for ln in lines if ln])

    return text




def build_index():
    cfg = load_config()
    data_csv = Path(cfg["paths"]["data_csv"])
    index_parent = Path(cfg["paths"]["faiss_index"]).parent
    model_name = cfg["model"]["name"]
    model_cache = Path(cfg["paths"]["model_cache"])

    if not data_csv.exists():
        raise FileNotFoundError(f"Dataset not found at {data_csv}. Please create it first.")

    print(f"📘 Loading dataset from: {data_csv}")
    df = safe_read_csv(data_csv)
    print(f"✅ Loaded dataset with {len(df)} rows")

    # Clean text fields
    text_columns = [
    "question_text", "option_a", "option_b", "option_c", "option_d",
    "exam", "year", "question_format", "correct_option",
    "subject", "topic", "sub_topic", "keywords"
    ]

    for col in text_columns:
        if col in df.columns:
            df[col] = df[col].apply(clean_text)

    # Combine question + options into embedding text
    def mk_text(row):
        q = clean_text(row.get("question_text", ""))
        if all(col in row.index for col in ("option_a", "option_b", "option_c", "option_d")):
            a = clean_text(row["option_a"])
            b = clean_text(row["option_b"])
            c = clean_text(row["option_c"])
            d = clean_text(row["option_d"])
            return f"Q: {q}\nOptions: (A) {a} (B) {b} (C) {c} (D) {d}"
        return q

    texts = df.apply(mk_text, axis=1).tolist()
    metadatas = df.to_dict(orient="records")

    os.makedirs(index_parent, exist_ok=True)

    if LCC_OK:
        print("🔄 Using langchain_community HuggingFaceEmbeddings + FAISS wrapper")
        embeddings = HuggingFaceEmbeddings(model_name=model_name, cache_folder=str(model_cache))
        vector_store = FAISS.from_texts(texts, embedding=embeddings, metadatas=metadatas)
        vector_store.save_local(str(index_parent))
        print(f"✅ FAISS index saved to {index_parent} (langchain_community format)")
    else:
        print("⚠️ langchain_community not available — using local sentence-transformers + FAISS fallback")
        model = SentenceTransformer(model_name)
        print("🔄 Creating embeddings (this may take a while)...")
        emb = model.encode(texts, show_progress_bar=True, convert_to_numpy=True)

        faiss.normalize_L2(emb)
        d = emb.shape[1]
        index = faiss.IndexFlatIP(d)
        index.add(emb)

        faiss.write_index(index, str(index_parent / "index.faiss"))
        import numpy as np, pickle
        np.save(str(index_parent / "embeddings.npy"), emb)
        with open(str(index_parent / "metadatas.pkl"), "wb") as f:
            pickle.dump(metadatas, f)
        print(f"✅ FAISS index saved to {index_parent} (manual format)")


if __name__ == "__main__":
    build_index()
