import pytest
from fastapi.testclient import TestClient
from app.search_api import app

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_index():
    # Trigger FastAPI startup event to load FAISS index and config
    with TestClient(app) as c:
        yield c

def test_search_basic_query():
    """✅ Should return at least one result for a valid question"""
    payload = {"query": "Article of Indian Constitution"}
    response = client.post("/search", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "results" in data
    assert len(data["results"]) > 0

def test_search_question_text_cleaned():
    """✅ Question text should NOT contain 'Options:'"""
    payload = {"query": "Article of Indian Constitution"}
    response = client.post("/search", json=payload)
    assert response.status_code == 200
    question_texts = [r["question_text"] for r in response.json()["results"]]
    assert all("Options:" not in q for q in question_texts)

def test_search_filter_exam():
    """✅ Should filter results by exam"""
    payload = {"query": "Article", "exam": "UPSC"}
    response = client.post("/search", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert all(r["exam"] == "UPSC" for r in data["results"])

def test_search_pagination():
    """✅ Should paginate results correctly"""
    payload = {"query": "Article", "page": 2}
    response = client.post("/search", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["page"] == 2
