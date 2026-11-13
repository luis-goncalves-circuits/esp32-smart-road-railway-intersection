import os
from fastapi.testclient import TestClient

os.environ["DB_PATH"] = "test-events.db"
from app import app

client = TestClient(app)

def test_health():
    assert client.get("/health").json() == {"status": "ok"}

def test_create_and_list_event():
    response = client.post("/events", json={"event_type": "test_violation", "approach": "N"})
    assert response.status_code == 201
    event_id = response.json()["id"]
    listed = client.get("/events?limit=10").json()
    assert any(item["id"] == event_id for item in listed)
