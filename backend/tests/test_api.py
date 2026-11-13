from pathlib import Path
import sys

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app import app

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_create_and_list_event(tmp_path, monkeypatch):
    monkeypatch.setenv("DB_PATH", str(tmp_path / "nested" / "events.db"))
    response = client.post("/events", json={"event_type": "test_violation", "approach": "N"})
    assert response.status_code == 201
    body = response.json()
    assert body["event_type"] == "test_violation"
    assert body["webhook_status"] == "not_configured"
    listed = client.get("/events?limit=10")
    assert listed.status_code == 200
    assert any(item["id"] == body["id"] for item in listed.json())


def test_api_key_is_read_at_request_time(monkeypatch, tmp_path):
    monkeypatch.setenv("DB_PATH", str(tmp_path / "events.db"))
    monkeypatch.setenv("API_KEY", "test-secret")
    assert client.get("/events").status_code == 401
    assert client.get("/events", headers={"X-API-Key": "test-secret"}).status_code == 200


def test_event_validation():
    response = client.post("/events", json={"event_type": ""})
    assert response.status_code == 422


def test_limit_validation():
    assert client.get("/events?limit=0").status_code == 422


def test_simulator_cors_preflight():
    response = client.options(
        "/events",
        headers={
            "Origin": "http://localhost:5500",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5500"


def test_invalid_approach_is_rejected():
    response = client.post("/events", json={"event_type": "test", "approach": "NORTH"})
    assert response.status_code == 422