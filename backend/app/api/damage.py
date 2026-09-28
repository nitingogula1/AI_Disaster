from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.damage import DamageDetection
from app.services.damage_service import damage_service
from app.schemas.damage import DamageDetectionItem, DamageSummary
from app.schemas.common import success_response

router = APIRouter(prefix="/damage", tags=["Damage"])

@router.get("/summary/{operation_id}")
def get_damage_summary_by_operation(operation_id: str, db: Session = Depends(get_db)):
    summary = damage_service.get_disaster_damage_summary(db, operation_id)
    return success_response(data=summary)

@router.get("/{disaster_id}")

def list_disaster_damage_assets(
    disaster_id: str,
    category: Optional[str] = None,
    grade: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(DamageDetection).filter(DamageDetection.disaster_id == disaster_id)
    if category and category != "ALL":
        query = query.filter(DamageDetection.category == category)
    if grade:
        query = query.filter(DamageDetection.damage_grade == grade)

    assets = query.all()
    # Format to match frontend fields
    items = []
    for a in assets:
        items.append({
            "id": a.asset_code or a.id,
            "db_id": a.id,
            "location": a.location_name or "Coastal Sector Target",
            "category": a.category,
            "damageGrade": a.damage_grade,
            "failureMode": a.failure_mode,
            "floodDepth": a.flood_depth,
            "floodType": a.flood_type,
            "aiConfidence": a.confidence,
            "coordinates": {"lat": a.latitude, "lng": a.longitude},
            "rescueStatus": a.rescue_status,
            "verified": a.verified
        })

    return success_response(data=items)

@router.get("/{disaster_id}/summary")
def get_damage_summary(disaster_id: str, db: Session = Depends(get_db)):
    summary = damage_service.get_disaster_damage_summary(db, disaster_id)
    return success_response(data=summary)

@router.patch("/{id}/verify")
def verify_damage_asset(id: str, verified: bool = Query(True), db: Session = Depends(get_db)):
    updated = damage_service.verify_asset(db, id, verified)
    if not updated:
        raise HTTPException(status_code=404, detail="Damage asset record not found")
    return success_response(data={"id": updated.id, "verified": updated.verified}, message="Asset verified")
