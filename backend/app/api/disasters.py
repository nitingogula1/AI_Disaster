import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.core.database import get_db
from app.models.disaster import DisasterEvent
from app.schemas.disaster import DisasterEventCreate, DisasterEventUpdate, DisasterEventResponse
from app.schemas.common import success_response, PaginationMeta

router = APIRouter(prefix="/disasters", tags=["Disasters"])

@router.get("")
def list_disasters(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    disaster_type: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(DisasterEvent)

    if status and status != "ALL":
        query = query.filter(DisasterEvent.status == status)
    if severity and severity != "ALL":
        query = query.filter(DisasterEvent.severity == severity)
    if disaster_type and disaster_type != "ALL":
        query = query.filter(DisasterEvent.disaster_type == disaster_type)
    if search:
        search_filter = or_(
            DisasterEvent.name.ilike(f"%{search}%"),
            DisasterEvent.location_name.ilike(f"%{search}%"),
            DisasterEvent.event_code.ilike(f"%{search}%")
        )
        query = query.filter(search_filter)

    total = query.count()
    events = query.order_by(DisasterEvent.created_at.desc()).offset((page - 1) * limit).limit(limit).all()

    # Formatted to seamlessly match frontend fields
    items = []
    for e in events:
        items.append({
            "id": e.event_code or e.id,
            "db_id": e.id,
            "name": e.name,
            "type": e.disaster_type,
            "hazardTypes": [e.disaster_type],
            "location": e.location_name,
            "coordinates": {"lat": e.latitude, "lng": e.longitude},
            "severity": e.severity,
            "status": e.status,
            "affectedArea": e.affected_area,
            "affectedPopulation": e.affected_population,
            "teamsDeployed": e.teams_deployed,
            "floodCrest": "+3.8m",
            "satelliteSource": e.satellite_source,
            "lastSatellitePass": "14 mins ago",
            "aiConfidence": int(e.ai_confidence),
            "createdAt": e.created_at.isoformat() if e.created_at else "",
            "updatedAt": e.updated_at.isoformat() if e.updated_at else "",
            "description": e.description or "",
            "thumbnailBand": e.thumbnail_band or "Band 8A / 11 NDWI Overlaid"
        })

    pages = (total + limit - 1) // limit if total > 0 else 1
    pagination = PaginationMeta(page=page, limit=limit, total=total, pages=pages)

    return success_response(data=items, pagination=pagination)

@router.get("/active")
def list_active_disasters(
    hazard_type: Optional[str] = None,
    severity: Optional[str] = None,
    region: Optional[str] = None,
    search: Optional[str] = None,
    min_area: Optional[float] = None,
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(DisasterEvent).filter(DisasterEvent.status == "ACTIVE")

    if hazard_type and hazard_type != "ALL":
        query = query.filter(DisasterEvent.disaster_type == hazard_type)
    if severity and severity != "ALL":
        query = query.filter(DisasterEvent.severity == severity)
    if region and region != "ALL":
        query = query.filter(DisasterEvent.location_name.ilike(f"%{region}%"))
    if min_area:
        query = query.filter(DisasterEvent.affected_area >= min_area)
    if search:
        search_filter = or_(
            DisasterEvent.name.ilike(f"%{search}%"),
            DisasterEvent.location_name.ilike(f"%{search}%"),
            DisasterEvent.event_code.ilike(f"%{search}%")
        )
        query = query.filter(search_filter)

    total = query.count()

    # Sorting
    if sort_by == "affected_area":
        order_col = DisasterEvent.affected_area.desc() if sort_order == "desc" else DisasterEvent.affected_area.asc()
    elif sort_by == "name":
        order_col = DisasterEvent.name.desc() if sort_order == "desc" else DisasterEvent.name.asc()
    else:
        order_col = DisasterEvent.created_at.desc() if sort_order == "desc" else DisasterEvent.created_at.asc()

    events = query.order_by(order_col).offset((page - 1) * limit).limit(limit).all()

    items = []
    for e in events:
        items.append({
            "id": e.event_code or e.id,
            "db_id": e.id,
            "name": e.name,
            "type": e.disaster_type,
            "hazardTypes": [e.disaster_type],
            "location": e.location_name,
            "coordinates": {"lat": e.latitude, "lng": e.longitude},
            "severity": e.severity,
            "status": e.status,
            "affectedArea": e.affected_area,
            "affectedPopulation": e.affected_population,
            "teamsDeployed": e.teams_deployed,
            "floodCrest": "+3.8m",
            "satelliteSource": e.satellite_source,
            "lastSatellitePass": "14 mins ago",
            "aiConfidence": int(e.ai_confidence),
            "createdAt": e.created_at.isoformat() if e.created_at else "",
            "description": e.description or ""
        })

    pages = (total + limit - 1) // limit if total > 0 else 1
    pagination = PaginationMeta(page=page, limit=limit, total=total, pages=pages)

    return success_response(data=items, pagination=pagination)

@router.get("/{id}")
def get_disaster(id: str, db: Session = Depends(get_db)):

    event = db.query(DisasterEvent).filter(
        or_(DisasterEvent.id == id, DisasterEvent.event_code == id)
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Disaster event not found")
    
    return success_response(data=DisasterEventResponse.model_validate(event).model_dump())

@router.post("", status_code=status.HTTP_201_CREATED)
def create_disaster(req: DisasterEventCreate, db: Session = Depends(get_db)):
    code = req.event_code or f"EVT-{uuid.uuid4().hex[:4].upper()}-SAR"
    event = DisasterEvent(
        event_code=code,
        name=req.name,
        disaster_type=req.disaster_type,
        description=req.description,
        severity=req.severity,
        status=req.status,
        country=req.country,
        state=req.state,
        district=req.district,
        location_name=req.location_name,
        latitude=req.latitude,
        longitude=req.longitude,
        affected_area=req.affected_area,
        affected_population=req.affected_population,
        teams_deployed=req.teams_deployed,
        satellite_source=req.satellite_source,
        ai_confidence=req.ai_confidence,
        thumbnail_band=req.thumbnail_band,
        start_time=req.start_time,
        end_time=req.end_time
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return success_response(data=DisasterEventResponse.model_validate(event).model_dump(), message="Disaster event created")

@router.put("/{id}")
def update_disaster(id: str, req: DisasterEventUpdate, db: Session = Depends(get_db)):
    event = db.query(DisasterEvent).filter(
        or_(DisasterEvent.id == id, DisasterEvent.event_code == id)
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Disaster event not found")

    for field, val in req.model_dump(exclude_unset=True).items():
        setattr(event, field, val)

    db.commit()
    db.refresh(event)
    return success_response(data=DisasterEventResponse.model_validate(event).model_dump(), message="Disaster event updated")

@router.patch("/{id}/status")
def patch_disaster_status(id: str, status_val: str = Query(..., alias="status"), db: Session = Depends(get_db)):
    event = db.query(DisasterEvent).filter(
        or_(DisasterEvent.id == id, DisasterEvent.event_code == id)
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Disaster event not found")

    event.status = status_val.upper()
    db.commit()
    db.refresh(event)
    return success_response(data={"id": event.id, "status": event.status}, message="Status updated successfully")

@router.delete("/{id}")
def delete_disaster(id: str, db: Session = Depends(get_db)):
    event = db.query(DisasterEvent).filter(
        or_(DisasterEvent.id == id, DisasterEvent.event_code == id)
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Disaster event not found")

    db.delete(event)
    db.commit()
    return success_response(message="Disaster event deleted successfully")
