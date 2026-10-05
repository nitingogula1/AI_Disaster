from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.operation import Operation
from pydantic import BaseModel, Field
from app.schemas.common import success_response
from app.services.satellite_hub_service import satellite_hub_service

class OperationAOIRequest(BaseModel):
    name: Optional[str] = None
    region: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    bbox: Optional[List[float]] = None  # [min_lon, min_lat, max_lon, max_lat]

router = APIRouter(prefix="/operations", tags=["Operations"])

DEFAULT_TARGET_BBOX = {
    "min_lat": 21.540,
    "max_lat": 22.120,
    "min_lon": 89.310,
    "max_lon": 90.040
}

@router.get("/active")
def get_active_operation(db: Session = Depends(get_db)):
    """Returns current active operation with target bounding box."""
    op = db.query(Operation).filter(Operation.status == "ACTIVE").first()
    if not op:
        # Check EVT-8821-BGD or CY-2025-05B
        op = db.query(Operation).filter((Operation.id == "EVT-8821-BGD") | (Operation.id == "CY-2025-05B")).first()
    if not op:
        op = db.query(Operation).first()

    if not op:
        return success_response(data={
            "id": "EVT-8821-BGD",
            "name": "Cyclone Remal",
            "region": "Bay Area / Delta Sector 4",
            "severity": "CRITICAL",
            "status": "ACTIVE",
            "response_phase": "Phase 2 Evacuation & Rescue",
            "target_bbox": DEFAULT_TARGET_BBOX
        })

    target_bbox = op.target_bbox if op.target_bbox and isinstance(op.target_bbox, dict) else DEFAULT_TARGET_BBOX

    return success_response(data={
        "id": op.id,
        "name": op.name,
        "region": op.region,
        "severity": op.severity,
        "status": op.status,
        "response_phase": op.response_phase or "Phase 2 Evacuation & Rescue",
        "target_bbox": target_bbox
    })

@router.get("")
def list_operations(db: Session = Depends(get_db)):
    """Returns list of operations to allow switching between them in command center."""
    ops = db.query(Operation).all()
    if not ops:
        return success_response(data=[
            {
                "id": "EVT-8821-BGD",
                "name": "Cyclone Remal",
                "region": "Bay Area / Delta Sector 4",
                "severity": "CRITICAL",
                "status": "ACTIVE",
                "response_phase": "Phase 2 Evacuation & Rescue",
                "target_bbox": DEFAULT_TARGET_BBOX
            },
            {
                "id": "FL-2025-08A",
                "name": "Assam Valley Monsoon Inundation",
                "region": "Brahmaputra Basin / Sector 2",
                "severity": "HIGH",
                "status": "MONITORING",
                "response_phase": "Phase 1 Logistics & Staging",
                "target_bbox": {
                    "min_lat": 26.10,
                    "max_lat": 26.50,
                    "min_lon": 91.50,
                    "max_lon": 92.10
                }
            }
        ])

    return success_response(data=[
        {
            "id": op.id,
            "name": op.name,
            "region": op.region,
            "severity": op.severity,
            "status": op.status,
            "response_phase": op.response_phase or "Phase 2 Evacuation & Rescue",
            "target_bbox": op.target_bbox or DEFAULT_TARGET_BBOX
        }
        for op in ops
    ])

@router.get("/{id}")
def get_operation(id: str, db: Session = Depends(get_db)):
    op = db.query(Operation).filter(Operation.id == id).first()
    if not op:
        # Check alias or legacy fallback
        op = db.query(Operation).filter((Operation.id == "EVT-8821-BGD") | (Operation.id == "CY-2025-05B")).first()
    if not op:
        raise HTTPException(status_code=404, detail=f"Operation {id} not found")
    return success_response(data={
        "id": op.id,
        "name": op.name,
        "region": op.region,
        "severity": op.severity,
        "status": op.status,
        "response_phase": op.response_phase,
        "target_bbox": op.target_bbox or DEFAULT_TARGET_BBOX
    })

@router.post("/{id}/activate")
def activate_operation(id: str, db: Session = Depends(get_db)):
    target = db.query(Operation).filter(Operation.id == id).first()
    if not target:
        # Check fallback only if id matches legacy code
        if id in ("EVT-8821-BGD", "CY-2025-05B"):
            target = db.query(Operation).filter((Operation.id == "EVT-8821-BGD") | (Operation.id == "CY-2025-05B")).first()
    if not target:
        raise HTTPException(status_code=404, detail=f"Operation {id} not found")
    
    # Set all others to STANDBY/MONITORING
    db.query(Operation).update({Operation.status: "MONITORING"})
    target.status = "ACTIVE"
    db.commit()
    db.refresh(target)
    return success_response(data={
        "id": target.id,
        "name": target.name,
        "status": target.status,
        "target_bbox": target.target_bbox or DEFAULT_TARGET_BBOX
    }, message=f"Operation {target.id} is now ACTIVE")

@router.post("/{id}/aoi")
def set_operation_aoi(id: str, payload: OperationAOIRequest, db: Session = Depends(get_db)):
    """Sets or updates the operation location, name, region, and target AOI bounding box."""
    target = db.query(Operation).filter((Operation.id == id) | (Operation.id == "EVT-8821-BGD") | (Operation.id == "CY-2025-05B")).first()
    if not target:
        target = Operation(
            id=id,
            name=payload.name or f"Operation {id}",
            region=payload.region or "Disaster Zone",
            severity="CRITICAL",
            status="ACTIVE"
        )
        db.add(target)

    if payload.name:
        target.name = payload.name
    if payload.region:
        target.region = payload.region

    bbox = payload.bbox
    if not bbox and payload.latitude is not None and payload.longitude is not None:
        delta = 0.02
        bbox = [
            round(payload.longitude - delta, 4),
            round(payload.latitude - delta, 4),
            round(payload.longitude + delta, 4),
            round(payload.latitude + delta, 4),
        ]

    if bbox:
        if len(bbox) != 4:
            raise HTTPException(status_code=400, detail="bbox must be [min_lon, min_lat, max_lon, max_lat]")
        w, s, e, n = bbox
        if not (-180 <= w < e <= 180 and -90 <= s < n <= 90):
            raise HTTPException(status_code=400, detail="Invalid coordinates: must satisfy -180 <= west < east <= 180 and -90 <= south < north <= 90")
        target.target_bbox = {
            "min_lon": float(w),
            "min_lat": float(s),
            "max_lon": float(e),
            "max_lat": float(n)
        }
        # Also sync with satellite hub AOI
        satellite_hub_service.set_aoi(
            operation_id=target.id,
            bbox=[float(w), float(s), float(e), float(n)],
            db=db,
            region=target.region,
            incident_name=target.name
        )

    db.commit()
    db.refresh(target)

    bbox_list = [
        target.target_bbox["min_lon"],
        target.target_bbox["min_lat"],
        target.target_bbox["max_lon"],
        target.target_bbox["max_lat"]
    ] if target.target_bbox else None

    return success_response(data={
        "id": target.id,
        "name": target.name,
        "region": target.region,
        "status": target.status,
        "target_bbox": target.target_bbox,
        "bbox": bbox_list
    }, message=f"Operation {target.id} AOI updated successfully")

