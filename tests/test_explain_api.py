from fastapi.testclient import TestClient
from app.search_api import app

client = TestClient(app)

def test_explain_mock_response():
    """✅ Should return mock explanation and correct option"""
    payload = {
        "question_text": "Which Article prohibits discrimination?",
        "correct_option": "Article 15"
    }
    response = client.post("/explain", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "explanation" in data
    assert data["correct_option"] == "Article 15"
