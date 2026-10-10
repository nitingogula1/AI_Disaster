from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.user import User
from app.models.drone_recon import (
    DroneReconSession, DroneReconEvent, DroneSessionStatus,
    DroneEventType, DroneProvenance
)
from app.schemas.drone_events import (
    EventCreateRequest, EventUpdateRequest, EventSoftDeleteRequest, EventVerifyRequest,
    SurvivorLockPayload, RoadCutoffPayload, LzLockPayload
)
from app.schemas.drone import (
    DroneFlightAnalysisRequest, DispatchSurvivorRequest
)
from app.services.drone_service import drone_service
from app.models.rescue_team import RescueTeam, RescueMission

router = APIRouter(prefix="/drone", tags=["Drone Recon"])

def success_response(data=None, message="Success"):
    return {"success": True, "message": message, "data": data}

def error_response(message: str, status_code: int = 400):
    raise HTTPException(status_code=status_code, detail={"success": False, "message": message})

@router.post("/sessions")
def start_session(
    disaster_id: Optional[str] = None,
    uav_callsign: Optional[str] = "Sentinel-1A",
    sensor_mode: Optional[str] = "OPTICAL",
    is_simulation: bool = False,
    req_body: Optional[Dict[str, Any]] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Support both query params and JSON body for frontend backward compatibility
    if req_body:
        disaster_id = req_body.get("disaster_id", disaster_id)
        uav_callsign = req_body.get("uav_callsign", uav_callsign)
        sensor_mode = req_body.get("sensor_mode", sensor_mode)
        is_simulation = req_body.get("is_simulation", is_simulation)

    session_id = f"drn-ses-{uuid.uuid4().hex[:8]}"
    db_session = DroneReconSession(
        id=session_id,
        user_id=current_user.id,
        disaster_id=disaster_id,
        uav_callsign=uav_callsign,
        sensor_mode=sensor_mode,
        is_simulation=is_simulation,
        status=DroneSessionStatus.ACTIVE
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return success_response(data={"session_id": db_session.id})

@router.post("/sessions/{session_id}/events")
def post_event(session_id: str, req: EventCreateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_session = db.query(DroneReconSession).filter(DroneReconSession.id == session_id).first()
    if not db_session:
        return error_response("Session not found", 404)
        
    # Validate payload strictly based on event_type
    validated_payload = req.payload or {}
    try:
        if req.event_type == DroneEventType.SURVIVOR_LOCK and req.payload:
            validated_payload = SurvivorLockPayload(**req.payload).model_dump(mode="json")
        elif req.event_type == DroneEventType.ROAD_CUTOFF and req.payload:
            validated_payload = RoadCutoffPayload(**req.payload).model_dump(mode="json")
        elif req.event_type == DroneEventType.LZ_LOCK and req.payload:
            validated_payload = LzLockPayload(**req.payload).model_dump(mode="json")
    except Exception as e:
        return error_response(f"Payload validation failed for {req.event_type.value}: {str(e)}", 422)

    # Force confidence to None for operator marks
    confidence = None if req.provenance == DroneProvenance.OPERATOR_MARKED else req.confidence

    event_id = f"evt-{uuid.uuid4().hex[:12]}"
    db_event = DroneReconEvent(
        id=event_id,
        session_id=session_id,
        event_type=req.event_type,
        place_name=req.place_name,
        lat=req.lat,
        lng=req.lng,
        bbox=req.bbox,
        payload=validated_payload,
        confidence=confidence,
        provenance=req.provenance,
        is_deleted=False,
        is_verified=False
    )
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return success_response(data={
        "event_id": db_event.id,
        "event_type": db_event.event_type.value,
        "is_verified": db_event.is_verified,
        "provenance": db_event.provenance.value
    }, message=f"{req.event_type.value} logged successfully")

@router.put("/events/{event_id}")
def update_event(event_id: str, req: EventUpdateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    event = db.query(DroneReconEvent).filter(DroneReconEvent.id == event_id).first()
    if not event:
        return error_response("Event not found", 404)
    if event.is_deleted:
        return error_response("Cannot update deleted event", 400)

    # Validate updated payload if provided
    if req.payload is not None:
        try:
            if event.event_type == DroneEventType.SURVIVOR_LOCK:
                req.payload = SurvivorLockPayload(**req.payload).model_dump(mode="json")
            elif event.event_type == DroneEventType.ROAD_CUTOFF:
                req.payload = RoadCutoffPayload(**req.payload).model_dump(mode="json")
            elif event.event_type == DroneEventType.LZ_LOCK:
                req.payload = LzLockPayload(**req.payload).model_dump(mode="json")
        except Exception as e:
            return error_response(f"Payload validation error: {str(e)}", 422)

    # Maintain immutable audit history
    history = list(event.edit_history or [])
    history.append({
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "user_id": current_user.id,
        "reason": req.edit_reason,
        "previous_payload": event.payload,
        "previous_lat": event.lat,
        "previous_lng": event.lng
    })
    event.edit_history = history

    if req.place_name is not None:
        event.place_name = req.place_name
    if req.lat is not None:
        event.lat = req.lat
    if req.lng is not None:
        event.lng = req.lng
    if req.payload is not None:
        event.payload = req.payload

    event.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(event)
    return success_response(data={"event_id": event.id}, message="Event updated with audit trail")

@router.delete("/events/{event_id}")
def soft_delete_event(event_id: str, req: EventSoftDeleteRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    event = db.query(DroneReconEvent).filter(DroneReconEvent.id == event_id).first()
    if not event:
        return error_response("Event not found", 404)
        
    event.is_deleted = True
    event.deletion_reason = req.deletion_reason
    event.updated_at = datetime.now(timezone.utc)
    db.commit()
    return success_response(message="Event soft-deleted with mandatory reason recorded")

@router.post("/events/{event_id}/verify")
def verify_event(event_id: str, req: Optional[EventVerifyRequest] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    event = db.query(DroneReconEvent).filter(DroneReconEvent.id == event_id).first()
    if not event:
        return error_response("Event not found", 404)
    if event.is_deleted:
        return error_response("Cannot verify a deleted event", 400)

    event.is_verified = True
    event.verified_by = current_user.id
    event.verified_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(event)
    return success_response(data={
        "event_id": event.id,
        "is_verified": event.is_verified,
        "verified_by": event.verified_by,
        "verified_at": event.verified_at.isoformat()
    }, message="Mark verified by commander")

@router.get("/sessions/{session_id}/findings")
@router.get("/sessions/{session_id}/events")
def get_session_findings(
    session_id: str,
    event_type: Optional[str] = None,
    include_deleted: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_session = db.query(DroneReconSession).filter(DroneReconSession.id == session_id).first()
    if not db_session:
        return error_response("Session not found", 404)

    query = db.query(DroneReconEvent).filter(DroneReconEvent.session_id == session_id)
    if not include_deleted:
        query = query.filter(DroneReconEvent.is_deleted == False)
    if event_type:
        query = query.filter(DroneReconEvent.event_type == event_type)

    events = query.order_by(DroneReconEvent.created_at.desc()).all()
    results = []
    for e in events:
        results.append({
            "id": e.id,
            "session_id": e.session_id,
            "event_type": e.event_type.value,
            "place_name": e.place_name,
            "lat": e.lat,
            "lng": e.lng,
            "bbox": e.bbox,
            "payload": e.payload,
            "confidence": e.confidence,
            "provenance": e.provenance.value,
            "is_verified": bool(e.is_verified),
            "verified_by": e.verified_by,
            "verified_at": e.verified_at.isoformat() if e.verified_at else None,
            "is_deleted": bool(e.is_deleted),
            "deletion_reason": e.deletion_reason,
            "created_at": e.created_at.isoformat() if e.created_at else None,
            "updated_at": e.updated_at.isoformat() if e.updated_at else None
        })
    return success_response(data=results)

@router.post("/sessions/{session_id}/end")
def end_session(session_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_session = db.query(DroneReconSession).filter(DroneReconSession.id == session_id).first()
    if not db_session:
        return error_response("Session not found", 404)
        
    db_session.status = DroneSessionStatus.ENDED
    db_session.ended_at = datetime.now(timezone.utc)
    db.commit()
    return success_response()

@router.get("/sessions")
def list_sessions(mine: bool = False, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(DroneReconSession)
    if mine:
        query = query.filter(DroneReconSession.user_id == current_user.id)
    sessions = query.order_by(DroneReconSession.started_at.desc()).all()
    
    res = []
    for s in sessions:
        res.append({
            "id": s.id,
            "disaster_id": s.disaster_id,
            "uav_callsign": s.uav_callsign,
            "sensor_mode": s.sensor_mode,
            "is_simulation": s.is_simulation,
            "started_at": s.started_at.isoformat() if s.started_at else None,
            "ended_at": s.ended_at.isoformat() if s.ended_at else None,
            "status": s.status.value if hasattr(s.status, "value") else str(s.status),
            "event_count": len([e for e in s.events if not e.is_deleted])
        })
    return success_response(data=res)

@router.get("/sessions/{session_id}")
def get_session(session_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_session = db.query(DroneReconSession).filter(DroneReconSession.id == session_id).first()
    if not db_session:
        return error_response("Session not found", 404)
        
    events = []
    for e in sorted(db_session.events, key=lambda x: x.created_at or datetime.min):
        events.append({
            "id": e.id,
            "event_type": e.event_type.value,
            "place_name": e.place_name,
            "lat": e.lat,
            "lng": e.lng,
            "bbox": e.bbox,
            "payload": e.payload,
            "confidence": e.confidence,
            "provenance": e.provenance.value,
            "is_verified": bool(e.is_verified),
            "verified_by": e.verified_by,
            "verified_at": e.verified_at.isoformat() if e.verified_at else None,
            "is_deleted": bool(e.is_deleted),
            "deletion_reason": e.deletion_reason,
            "created_at": e.created_at.isoformat() if e.created_at else None
        })
        
    return success_response(data={
        "id": db_session.id,
        "user_id": db_session.user_id,
        "disaster_id": db_session.disaster_id,
        "uav_callsign": db_session.uav_callsign,
        "sensor_mode": db_session.sensor_mode,
        "is_simulation": db_session.is_simulation,
        "started_at": db_session.started_at.isoformat() if db_session.started_at else None,
        "ended_at": db_session.ended_at.isoformat() if db_session.ended_at else None,
        "status": db_session.status.value if hasattr(db_session.status, "value") else str(db_session.status),
        "events": events
    })

# Retain existing mission endpoints for full backward compatibility
@router.get("/missions/active")
def get_active_mission(disaster_id: Optional[str] = "evt-remal-001", db: Session = Depends(get_db)):
    return success_response(data=drone_service.get_active_mission(db, disaster_id))

@router.get("/missions/{mission_id}")
def get_mission_detail(mission_id: str, db: Session = Depends(get_db)):
    detail = drone_service.get_mission_detail(db, mission_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Mission not found")
    return success_response(data=detail)

@router.post("/analysis/flight-elevation")
def analyze_flight_elevation(req: DroneFlightAnalysisRequest, db: Session = Depends(get_db)):
    return success_response(data=drone_service.analyze_flight_elevation(db, req))

@router.post("/dispatch-survivor/{detection_id}")
def dispatch_survivor(detection_id: str, req: DispatchSurvivorRequest, db: Session = Depends(get_db)):
    mission_code = f"MIS-AIR-{uuid.uuid4().hex[:4].upper()}"
    team = db.query(RescueTeam).filter((RescueTeam.id == req.team_id) | (RescueTeam.team_code == req.team_id)).first()
    team_name = team.team_name if team else req.team_id

    mission = RescueMission(
        mission_code=mission_code,
        team_id=team.id if team else req.team_id,
        title=f"Air SAR Extraction: {detection_id}",
        description=req.notes or f"Autonomous aerial drop and extraction dispatched for {detection_id}",
        destination_latitude=21.84,
        destination_longitude=89.54,
        priority=req.priority
    )
    db.add(mission)
    if team:
        team.status = "DISPATCHED"
    db.commit()

    return success_response(
        data={"mission_code": mission_code, "status": "DISPATCHED", "team": team_name},
        message=f"Rescue team {team_name} successfully dispatched to {detection_id}"
    )
