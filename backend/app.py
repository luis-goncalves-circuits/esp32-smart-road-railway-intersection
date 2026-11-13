import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterator, Literal, Optional

import httpx
from fastapi import FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="Smart Intersection Events API", version="1.1.0")

# Definir CORS_ORIGINS com origens explícitas, separadas por vírgulas.
# Não usar '*' com credenciais em ambientes expostos à Internet.
_default_origins = "http://localhost:5500,http://127.0.0.1:5500"
_allowed_origins = [item.strip() for item in os.getenv("CORS_ORIGINS", _default_origins).split(",") if item.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "X-API-Key"],
)


class Event(BaseModel):
    event_type: str = Field(min_length=1, max_length=80)
    approach: Optional[Literal["N", "E", "S", "O"]] = None
    plate_text: Optional[str] = Field(default=None, max_length=20)
    evidence_ref: Optional[str] = Field(default=None, max_length=500)
    details: Optional[str] = Field(default=None, max_length=2000)


@contextmanager
def database() -> Iterator[sqlite3.Connection]:
    """Abre e fecha uma ligação SQLite por operação e cria a directoria, se necessário."""
    db_path = Path(os.getenv("DB_PATH", "events.db")).expanduser()
    if str(db_path) != ":memory:":
        db_path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(str(db_path), timeout=10)
    connection.row_factory = sqlite3.Row
    try:
        connection.execute(
            """CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TEXT NOT NULL,
                event_type TEXT NOT NULL,
                approach TEXT,
                plate_text TEXT,
                evidence_ref TEXT,
                details TEXT
            )"""
        )
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def authorize(api_key: Optional[str]) -> None:
    expected_key = os.getenv("API_KEY")
    if expected_key and api_key != expected_key:
        raise HTTPException(status_code=401, detail="Chave API inválida")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "smart-intersection-api"}


@app.post("/events", status_code=201)
async def create_event(event: Event, x_api_key: Optional[str] = Header(default=None)) -> dict:
    authorize(x_api_key)
    created_at = datetime.now(timezone.utc).isoformat()
    with database() as connection:
        cursor = connection.execute(
            """INSERT INTO events(created_at, event_type, approach, plate_text, evidence_ref, details)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (created_at, event.event_type, event.approach, event.plate_text, event.evidence_ref, event.details),
        )
        event_id = cursor.lastrowid

    payload = {"id": event_id, "created_at": created_at, **event.model_dump()}
    webhook_url = os.getenv("CLOUD_WEBHOOK_URL")
    webhook_status = "not_configured"
    if webhook_url:
        token = os.getenv("CLOUD_WEBHOOK_TOKEN")
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.post(webhook_url, json=payload, headers=headers)
                response.raise_for_status()
            webhook_status = "delivered"
        except httpx.HTTPError:
            # A ocorrência já está gravada localmente; o estado remoto fica explícito na resposta.
            webhook_status = "failed"

    payload["webhook_status"] = webhook_status
    return payload


@app.get("/events")
def list_events(
    limit: int = Query(default=100, ge=1, le=500),
    x_api_key: Optional[str] = Header(default=None),
) -> list[dict]:
    authorize(x_api_key)
    with database() as connection:
        rows = connection.execute(
            "SELECT * FROM events ORDER BY id DESC LIMIT ?", (limit,)
        ).fetchall()
    return [dict(row) for row in rows]