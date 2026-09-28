from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.operation import Operation
from app.schemas.common import success_response

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
    op = db.query(Operation).filter((Operation.id == id) | (Operation.id == "EVT-8821-BGD") | (Operation.id == "CY-2025-05B")).first()
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
    target = db.query(Operation).filter((Operation.id == id) | (Operation.id == "EVT-8821-BGD") | (Operation.id == "CY-2025-05B")).first()
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
