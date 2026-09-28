from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.disaster import DisasterEvent
from app.models.incident import Incident
from app.schemas.common import success_response
from app.core.config import settings

router = APIRouter(prefix="/system", tags=["System & Telemetry"])

@router.get("/threat-level")
def get_threat_level(db: Session = Depends(get_db)):
    """
    Threat level dynamically calculated from active disaster severity and critical incidents.
    Level 4: CRITICAL (Critical disasters / critical incidents active)
    Level 3: HIGH
    Level 2: ELEVATED
    Level 1: LOW / NORMAL
    """
    active_disasters = db.query(DisasterEvent).filter(DisasterEvent.status == "ACTIVE").all()
    critical_incidents = db.query(Incident).filter(
        Incident.status == "ACTIVE",
        Incident.severity == "CRITICAL"
    ).count()

    has_critical = any(d.severity == "CRITICAL" for d in active_disasters) or critical_incidents > 0
    has_high = any(d.severity in ["HIGH", "SEVERE"] for d in active_disasters)

    if has_critical:
        level = 4
        label = "CRITICAL"
    elif has_high:
        level = 3
        label = "HIGH"
    elif active_disasters:
        level = 2
        label = "ELEVATED"
    else:
        level = 1
        label = "NORMAL"

    return success_response(data={
        "level": level,
        "label": label,
        "updated_at": datetime.now(timezone.utc).isoformat()
    })


@router.get("/satellite-status")
async def get_satellite_status():
    from app.services.satellite_providers import PlanetaryComputerProvider
    return success_response(data=await PlanetaryComputerProvider().check_connection())

@router.get("/telemetry")
def get_telemetry_status():
    return success_response(data={"sync_percentage": None, "latency_ms": None, "status": "NOT_MEASURED"})

@router.get("/status")
def get_full_system_status(db: Session = Depends(get_db)):
    from sqlalchemy import text
    db.execute(text("SELECT 1"))
    return success_response(data={"database": "ONLINE", "ai_engine": "UNAVAILABLE",
                                  "satellite_pipeline": "AVAILABLE", "stac_api": "NOT_CHECKED",
                                  "telemetry_stream": "NOT_MEASURED"})
