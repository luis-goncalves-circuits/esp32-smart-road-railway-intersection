import os
import sqlite3
from datetime import datetime, timezone
from typing import Optional
import httpx
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

DB_PATH = os.getenv("DB_PATH", "events.db")
API_KEY = os.getenv("API_KEY")
WEBHOOK_URL = os.getenv("CLOUD_WEBHOOK_URL")
WEBHOOK_TOKEN = os.getenv("CLOUD_WEBHOOK_TOKEN")
app = FastAPI(title="Smart Intersection Events API", version="1.0.0")

class Event(BaseModel):
    event_type: str = Field(min_length=1, max_length=80)
    approach: Optional[str] = Field(default=None, max_length=8)
    plate_text: Optional[str] = Field(default=None, max_length=20)
    evidence_ref: Optional[str] = Field(default=None, max_length=500)
    details: Optional[str] = Field(default=None, max_length=2000)

def connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("""CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at TEXT NOT NULL, event_type TEXT NOT NULL,
        approach TEXT, plate_text TEXT, evidence_ref TEXT, details TEXT
    )""")
    return conn

def authorize(key: Optional[str]):
    if API_KEY and key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/events", status_code=201)
async def create_event(event: Event, x_api_key: Optional[str] = Header(default=None)):
    authorize(x_api_key)
    created_at = datetime.now(timezone.utc).isoformat()
    with connect() as conn:
        cur = conn.execute(
            "INSERT INTO events(created_at,event_type,approach,plate_text,evidence_ref,details) VALUES(?,?,?,?,?,?)",
            (created_at, event.event_type, event.approach, event.plate_text, event.evidence_ref, event.details),
        )
        event_id = cur.lastrowid
    payload = {"id": event_id, "created_at": created_at, **event.model_dump()}
    if WEBHOOK_URL:
        headers = {"Authorization": f"Bearer {WEBHOOK_TOKEN}"} if WEBHOOK_TOKEN else {}
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                response = await client.post(WEBHOOK_URL, json=payload, headers=headers)
                response.raise_for_status()
        except httpx.HTTPError:
            # O evento local mantém-se; o envio remoto deve ser monitorizado pelo operador.
            pass
    return payload

@app.get("/events")
def list_events(limit: int = 100, x_api_key: Optional[str] = Header(default=None)):
    authorize(x_api_key)
    limit = max(1, min(limit, 500))
    with connect() as conn:
        rows = conn.execute("SELECT * FROM events ORDER BY id DESC LIMIT ?", (limit,)).fetchall()
    return [dict(row) for row in rows]
