from datetime import date, datetime
import re
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.disaster import DisasterEvent
from app.models.incident import Incident

router = APIRouter(prefix="/chat", tags=["Disaster Assistant"])


class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    history: list[ChatTurn] = Field(default_factory=list, max_length=12)

    @field_validator("message")
    @classmethod
    def strip_message(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Message cannot be blank")
        return value


class ChatSource(BaseModel):
    title: str
    url: str | None = None


class ChatResponse(BaseModel):
    answer: str
    sources: list[ChatSource] = Field(default_factory=list)
    mode: Literal["demo"] = "demo"


def _iso(value: datetime | date | None) -> str | None:
    return value.isoformat() if value else None


def search_sentinelaid_records(args: dict, db: Session) -> dict:
    query_text = str(args.get("query", "")).strip()[:120]
    record_type = args.get("record_type", "all")
    if record_type not in {"all", "disasters", "incidents"}:
        raise ValueError("Unsupported record type")
    try:
        limit = min(max(int(args.get("limit", 5)), 1), 8)
    except (TypeError, ValueError):
        limit = 5

    match_all = query_text.lower() in {"", "all", "*"}
    like = f"%{query_text}%"
    records: list[dict] = []

    if record_type in {"all", "disasters"}:
        query = db.query(DisasterEvent)
        if not match_all:
            query = query.filter(or_(
                DisasterEvent.name.ilike(like),
                DisasterEvent.event_code.ilike(like),
                DisasterEvent.disaster_type.ilike(like),
                DisasterEvent.country.ilike(like),
                DisasterEvent.state.ilike(like),
                DisasterEvent.district.ilike(like),
                DisasterEvent.location_name.ilike(like),
                DisasterEvent.description.ilike(like),
            ))
        events = query.order_by(DisasterEvent.created_at.desc()).limit(limit).all()
        records.extend({
            "record_type": "disaster_event",
            "id": event.event_code or event.id,
            "name": event.name,
            "hazard": event.disaster_type,
            "country": event.country,
            "location": event.location_name,
            "event_start": _iso(event.start_time),
            "status": event.status,
            "severity": event.severity,
            "affected_area_km2": event.affected_area,
            "population_recorded_as_affected": event.affected_population,
            "description": event.description,
        } for event in events)

    if record_type in {"all", "incidents"} and len(records) < limit:
        query = db.query(Incident, DisasterEvent).join(DisasterEvent, Incident.disaster_id == DisasterEvent.id)
        if not match_all:
            query = query.filter(or_(
                Incident.title.ilike(like),
                Incident.description.ilike(like),
                Incident.incident_type.ilike(like),
                Incident.status.ilike(like),
                DisasterEvent.name.ilike(like),
                DisasterEvent.country.ilike(like),
                DisasterEvent.location_name.ilike(like),
            ))
        incidents = query.order_by(Incident.created_at.desc()).limit(limit - len(records)).all()
        records.extend({
            "record_type": "incident",
            "id": incident.incident_code or incident.id,
            "title": incident.title,
            "incident_type": incident.incident_type,
            "event": event.name,
            "country": event.country,
            "location": event.location_name,
            "status": incident.status,
            "severity": incident.severity,
            "population_recorded_as_affected": incident.population_affected,
            "created_at": _iso(incident.created_at),
        } for incident, event in incidents)

    return {
        "source": "SentinelAid internal application database",
        "data_note": "Records may include seeded/demo entries. They are not verified global historical records or official impact statistics.",
        "query": query_text,
        "records": records,
    }


def _demo_reply(message: str, db: Session) -> ChatResponse:
    """Return prepared local replies without calling an external AI service."""
    normalized = message.casefold()

    def has_any(*terms: str) -> bool:
        return any(re.search(rf"\b{re.escape(term)}\b", normalized) for term in terms)

    if has_any("record", "incident", "database", "saved", "sentinelaid has"):
        record_type = "incidents" if "incident" in normalized else "all"
        result = search_sentinelaid_records(
            {"query": "all", "record_type": record_type, "limit": 5},
            db,
        )
        records = result["records"]
        if not records:
            return ChatResponse(
                mode="demo",
                answer=(
                    "No records are currently available in SentinelAid's local database. "
                    "This demo database is not a verified archive of real-world disasters."
                ),
            )

        lines = []
        for record in records:
            title = record.get("name") or record.get("title") or "Untitled record"
            details = [
                value for value in (
                    record.get("hazard") or record.get("incident_type"),
                    record.get("location") or record.get("country"),
                    record.get("status"),
                ) if value
            ]
            suffix = f" — {', '.join(str(value) for value in details)}" if details else ""
            lines.append(f"• {title}{suffix}")

        return ChatResponse(
            mode="demo",
            answer=(
                "SentinelAid local application records (these may be demo entries, not verified reports):\n"
                + "\n".join(lines)
            ),
            sources=[ChatSource(title="SentinelAid local application database (may contain demo data)")],
        )

    if has_any("emergency", "trapped", "rescue", "help now", "in danger"):
        answer = (
            "This is an offline demo and cannot monitor your location or provide live emergency instructions. "
            "If you may be in danger, contact your local emergency service and follow official local alerts. "
            "SentinelAid demo chat is not an emergency alert service."
        )
    elif has_any("hello", "hi", "hey", "good morning", "good evening"):
        answer = (
            "Hello! This is SentinelAid's no-cost demo assistant. I can show prepared sample replies or look up "
            "records saved in the local SentinelAid database. I do not use OpenAI or search the live web in demo mode."
        )
    elif has_any("flood", "cyclone", "earthquake", "wildfire", "landslide", "storm", "disaster"):
        answer = (
            "This is a prepared demo reply. The offline assistant cannot verify current conditions, event history, "
            "casualties, or damage, and it does not search live sources. For an actual emergency, follow official "
            "local alerts and instructions."
        )
    else:
        answer = (
            "This is SentinelAid's no-cost demo assistant. It uses prepared replies and local application records; "
            "it cannot search the live web or verify current disaster information. Try asking for saved SentinelAid records."
        )

    return ChatResponse(answer=answer, mode="demo")


@router.post("", response_model=ChatResponse)
def chat(payload: ChatRequest, db: Session = Depends(get_db)) -> ChatResponse:
    """No-cost chatbot using prepared replies and optional local database records."""
    return _demo_reply(payload.message, db)
