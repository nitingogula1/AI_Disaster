import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.incident import Incident
from app.schemas.incident import IncidentCreate, IncidentUpdate, IncidentResponse
from app.schemas.common import success_response

router = APIRouter(prefix="/incidents", tags=["Incidents"])

@router.get("")
def list_incidents(disaster_id: Optional[str] = None, severity: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Incident)
    if disaster_id:
        query = query.filter(Incident.disaster_id == disaster_id)
    if severity:
        query = query.filter(Incident.severity == severity)
    incidents = query.order_by(Incident.priority_score.desc()).all()
    return success_response(data=[IncidentResponse.model_validate(inc).model_dump() for inc in incidents])

@router.get("/{id}")
def get_incident(id: str, db: Session = Depends(get_db)):
    inc = db.query(Incident).filter(Incident.id == id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    return success_response(data=IncidentResponse.model_validate(inc).model_dump())

@router.post("", status_code=status.HTTP_201_CREATED)
def create_incident(req: IncidentCreate, db: Session = Depends(get_db)):
    code = req.incident_code or f"INC-{uuid.uuid4().hex[:4].upper()}"
    inc = Incident(
        disaster_id=req.disaster_id,
        incident_code=code,
        title=req.title,
        description=req.description,
        incident_type=req.incident_type,
        latitude=req.latitude,
        longitude=req.longitude,
        severity=req.severity,
        status=req.status,
        population_affected=req.population_affected,
        medical_risk=req.medical_risk,
        accessibility_score=req.accessibility_score,
        assigned_team_id=req.assigned_team_id
    )
    db.add(inc)
    db.commit()
    db.refresh(inc)
    return success_response(data=IncidentResponse.model_validate(inc).model_dump(), message="Incident created")

@router.patch("/{id}/status")
def patch_incident_status(id: str, status_val: str = Query(..., alias="status"), db: Session = Depends(get_db)):
    inc = db.query(Incident).filter(Incident.id == id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    inc.status = status_val
    db.commit()
    db.refresh(inc)
    return success_response(data=IncidentResponse.model_validate(inc).model_dump(), message="Status updated")

@router.put("/{id}")
def update_incident(id: str, req: IncidentUpdate, db: Session = Depends(get_db)):
    inc = db.query(Incident).filter(Incident.id == id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    for field, val in req.model_dump(exclude_unset=True).items():
        setattr(inc, field, val)
    db.commit()
    db.refresh(inc)
    return success_response(data=IncidentResponse.model_validate(inc).model_dump(), message="Incident updated")

@router.delete("/{id}")
def delete_incident(id: str, db: Session = Depends(get_db)):
    inc = db.query(Incident).filter(Incident.id == id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    db.delete(inc)
    db.commit()
    return success_response(message="Incident deleted successfully")
