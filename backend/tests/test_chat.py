from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.api.chat import _demo_reply, search_sentinelaid_records
from app.core.config import settings
from app.core.database import Base
from app.main import app
from app.models.disaster import DisasterEvent


def test_chat_demo_works_without_openai_api_key(monkeypatch):
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "")
    response = TestClient(app).post("/api/v1/chat", json={"message": "Hi"})
    assert response.status_code == 200
    assert response.json()["mode"] == "demo"
    assert "no-cost demo assistant" in response.json()["answer"]


def test_chat_rejects_blank_message():
    response = TestClient(app).post("/api/v1/chat", json={"message": "   "})
    assert response.status_code == 422


def test_internal_search_labels_database_records_as_unverified():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        db.add(DisasterEvent(
            event_code="TEST-CHAT-1",
            name="Test River Flood",
            disaster_type="FLOOD",
            location_name="Test District",
            country="Exampleland",
            latitude=0,
            longitude=0,
            affected_area=2.5,
            affected_population=100,
        ))
        db.commit()
        result = search_sentinelaid_records(
            {"query": "Test District", "record_type": "disasters", "limit": 4},
            db,
        )
        reply = _demo_reply("Show SentinelAid database records", db)
    assert result["records"][0]["id"] == "TEST-CHAT-1"
    assert "demo" in result["data_note"]
    assert reply.mode == "demo"
    assert "Test River Flood" in reply.answer
    assert "not verified reports" in reply.answer
