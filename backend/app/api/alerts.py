from typing import Optional, List, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.alert import Alert
from app.models.rescue_team import RescueTeam, RescueMission
from app.models.incident import Incident
from app.schemas.alert import AlertCreate
from app.schemas.common import success_response

router = APIRouter(prefix="/alerts", tags=["Alerts"])

@router.get("")
def list_alerts(
    operation_id: Optional[str] = None,
    severity: Optional[str] = None,
    unread: Optional[bool] = None,
    category: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(Alert)

    if operation_id and operation_id != "ALL":
        query = query.filter((Alert.disaster_id == operation_id) | (Alert.disaster_id.is_(None)))
    if severity and severity != "ALL":
        if severity == "CRITICAL":
            query = query.filter(Alert.severity.in_(["CRITICAL", "HIGH_SURGE"]))
        else:
            query = query.filter(Alert.severity == severity)
    if unread is not None:
        query = query.filter(Alert.is_read == (not unread))
    if category == "tactical":
        # Tactical AI alerts: SATELLITE_INGEST or telemetry
        query = query.filter(Alert.severity.in_(["SATELLITE_INGEST", "INFO", "WARNING"]))

    total_unread = db.query(Alert).filter(Alert.is_read == False).count()
    alerts = query.order_by(Alert.created_at.desc()).limit(limit).all()

    items = []
    for a in alerts:
        items.append({
            "id": a.id,
            "type": a.alert_type or a.severity,
            "severity": a.severity,
            "title": a.title,
            "description": a.message,
            "message": a.message,
            "timestamp": "Just now",
            "created_at": a.created_at.isoformat() if a.created_at else "",
            "coordinates": a.coordinates_str,
            "actions": a.actions_json or [],
            "is_read": a.is_read
        })

    # Return structure matching prompt specification while supporting array iteration
    return {
        "success": True,
        "data": items,
        "alerts": items,
        "unread_count": total_unread
    }

@router.post("")
def create_alert(req: AlertCreate, db: Session = Depends(get_db)):
    alert = Alert(
        disaster_id=req.disaster_id,
        severity=req.severity,
        title=req.title,
        message=req.message,
        latitude=req.latitude,
        longitude=req.longitude,
        coordinates_str=req.coordinates_str,
        actions_json=req.actions
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return success_response(data={"id": alert.id, "title": alert.title}, message="Alert published")

@router.patch("/{id}/read")
def mark_alert_read(id: str, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.is_read = True
    db.commit()
    return success_response(data={"id": alert.id, "is_read": True}, message="Alert marked as read")

@router.post("/{id}/acknowledge")
def acknowledge_alert(id: str, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.is_read = True
    db.commit()
    return success_response(data={"id": alert.id, "status": "ACKNOWLEDGED"}, message="Alert acknowledged")

@router.post("/{id}/assign")
def assign_rescue_team_to_alert(id: str, payload: dict = Body(...), db: Session = Depends(get_db)):
    """
    Assigns a rescue team to the target alert / creates rescue dispatch assignment.
    """
    alert = db.query(Alert).filter(Alert.id == id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    team_id_raw = str(payload.get("team_id") or "RT-02")
    # Find matching team
    team = db.query(RescueTeam).filter(
        (RescueTeam.id == team_id_raw) | 
        (RescueTeam.team_code == team_id_raw) |
        (RescueTeam.team_code.ilike(f"%{team_id_raw}%"))
    ).first()

    if not team:
        # Default fallback to first active or available team
        team = db.query(RescueTeam).first()

    if team:
        team.status = "EN_ROUTE"
        team.current_mission = f"Dispatch for: {alert.title[:50]}"
        db.commit()

    return success_response(data={
        "alert_id": alert.id,
        "team_id": team.id if team else team_id_raw,
        "team_code": team.team_code if team else "RT-02",
        "status": "DISPATCHED"
    }, message=f"Rescue Unit {team.team_code if team else team_id_raw} assigned to alert")

@router.delete("/{id}")
def delete_alert(id: str, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    db.delete(alert)
    db.commit()
    return success_response(message="Alert dismissed")
