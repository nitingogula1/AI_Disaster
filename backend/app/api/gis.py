from typing import Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.gis_service import gis_service
from app.models.damage import DamageDetection
from app.models.rescue_team import RescueTeam
from app.models.incident import Incident
from app.schemas.common import success_response

router = APIRouter(prefix="/gis", tags=["GIS"])

def build_flood_geojson(db: Session, op_id: str = "CY-2025-05B") -> Dict[str, Any]:
    from app.models.satellite import ProcessingResult
    records = db.query(ProcessingResult).filter_by(operation_id=op_id).order_by(ProcessingResult.created_at.desc()).all()
    features, seen = [], set()
    for record in records:
        if record.scene_id in seen or not (record.metadata_json or {}).get("observation_type") == "SURFACE_WATER":
            continue
        seen.add(record.scene_id)
        for feature in (record.geometry or {}).get("features", []):
            features.append({**feature, "properties": {**feature["properties"],
                            "scene_id": record.scene_id, "is_demo": record.metadata_json.get("is_demo", False)}})
    return {"type": "FeatureCollection", "features": features, "observation_type": "SURFACE_WATER"}


def build_buildings_geojson(db: Session, op_id: str = "CY-2025-05B") -> Dict[str, Any]:
    bld_q = db.query(DamageDetection).filter(DamageDetection.object_type == "BUILDING").all()
    features = []
    
    # Priority target: Trishuli Secondary School Shelter
    features.append({
        "type": "Feature",
        "properties": {
            "id": "TGT-S4-SHELTER",
            "name": "Trishuli Secondary School Shelter",
            "is_priority_target": True,
            "structural_grade": "Grade 3 (Heavy)",
            "water_depth": "1.4m (Surging)",
            "confidence": 96.8,
            "drone_drop_zone": "Clear at Roof N",
            "civilians": 320,
            "description": "Access cut off by 1.4m standing delta flash water. 320 civilians reported sheltering on level 2 roof."
        },
        "geometry": {
            "type": "Point",
            "coordinates": [89.545, 21.845]
        }
    })

    for d in bld_q:
        features.append({
            "type": "Feature",
            "properties": {
                "id": d.id,
                "asset_code": d.asset_code or "BLD",
                "name": d.location_name or "Damaged Structure",
                "grade": d.damage_grade,
                "confidence": d.confidence,
                "category": d.category
            },
            "geometry": {
                "type": "Point",
                "coordinates": [d.longitude, d.latitude]
            }
        })

    return {
        "type": "FeatureCollection",
        "name": "AI Bounding Boxes (1.1k)",
        "features": features
    }

def build_roads_geojson(db: Session, op_id: str = "CY-2025-05B") -> Dict[str, Any]:
    return {
        "type": "FeatureCollection",
        "name": "Blocked Road Segments",
        "features": [
            {
                "type": "Feature",
                "properties": {
                    "id": "BLK-RD-01",
                    "name": "Arterial HWY-10 Embankment Cut",
                    "status": "IMPASSABLE",
                    "color": "#DC2626"
                },
                "geometry": {
                    "type": "LineString",
                    "coordinates": [[89.50, 21.845], [89.56, 21.86]]
                }
            },
            {
                "type": "Feature",
                "properties": {
                    "id": "BLK-RD-02",
                    "name": "Canal Access Causeway",
                    "status": "IMPASSABLE",
                    "color": "#DC2626"
                },
                "geometry": {
                    "type": "LineString",
                    "coordinates": [[89.53, 21.83], [89.58, 21.82]]
                }
            }
        ]
    }

def build_rescue_geojson(db: Session, op_id: str = "CY-2025-05B") -> Dict[str, Any]:
    teams = db.query(RescueTeam).all()
    features = []
    for t in teams:
        features.append({
            "type": "Feature",
            "properties": {
                "id": t.id,
                "team_code": t.team_code,
                "name": t.team_name,
                "type": t.team_type,
                "status": t.status,
                "members": t.team_size,
                "color": "#10B981"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [t.longitude, t.latitude]
            }
        })
    return {
        "type": "FeatureCollection",
        "name": "Rescue Teams",
        "features": features
    }

# ----------------- Layer Endpoints -----------------

@router.get("/layers")
def get_gis_layers():
    return success_response(data=[
        {"id": "lyr-flood", "name": "Flood Extent (MNDWI)", "active": True, "color": "#0284C7"},
        {"id": "lyr-buildings", "name": "AI Bounding Boxes (1.1k)", "active": True, "color": "#F97316"},
        {"id": "lyr-roads", "name": "Blocked Road Segments", "active": True, "color": "#DC2626"},
        {"id": "lyr-rescue", "name": "Rescue Teams (5)", "active": True, "color": "#10B981"}
    ])

@router.get("/layers/flood")
def get_layer_flood(db: Session = Depends(get_db)):
    return build_flood_geojson(db)

@router.get("/flood/{scene_id}")
def get_scene_flood_geojson(scene_id: str, db: Session = Depends(get_db)):
    from app.models.satellite import ProcessingResult
    record = db.query(ProcessingResult).filter_by(scene_id=scene_id).order_by(ProcessingResult.created_at.desc()).first()
    if not record or not (record.metadata_json or {}).get("observation_type") == "SURFACE_WATER":
        raise FileNotFoundError("No computed surface-water polygons exist for this scene.")
    return record.geometry

@router.get("/layers/buildings")
def get_layer_buildings(db: Session = Depends(get_db)):
    return build_buildings_geojson(db)

@router.get("/layers/roads")
def get_layer_roads(db: Session = Depends(get_db)):
    return build_roads_geojson(db)

@router.get("/layers/rescue")
def get_layer_rescue(db: Session = Depends(get_db)):
    return build_rescue_geojson(db)

# ----------------- Operation-Specific Endpoints -----------------

@router.get("/operations/{operation_id}/layers")
def get_operation_layers(operation_id: str, db: Session = Depends(get_db)):
    return {
        "flood_extent": build_flood_geojson(db, operation_id),
        "damage_buildings": build_buildings_geojson(db, operation_id),
        "blocked_roads": build_roads_geojson(db, operation_id),
        "rescue_teams": build_rescue_geojson(db, operation_id),
        "incidents": gis_service.get_shelters_geojson()
    }

@router.get("/operations/{operation_id}/flood")
def get_operation_flood(operation_id: str, db: Session = Depends(get_db)):
    return build_flood_geojson(db, operation_id)

@router.get("/operations/{operation_id}/buildings")
def get_operation_buildings(operation_id: str, db: Session = Depends(get_db)):
    return build_buildings_geojson(db, operation_id)

@router.get("/operations/{operation_id}/roads")
def get_operation_roads(operation_id: str, db: Session = Depends(get_db)):
    return build_roads_geojson(db, operation_id)

@router.get("/operations/{operation_id}/rescue-teams")
def get_operation_rescue_teams(operation_id: str, db: Session = Depends(get_db)):
    return build_rescue_geojson(db, operation_id)

# ----------------- Legacy / Component Endpoints -----------------

@router.get("/disasters/{id}")
def get_disaster_gis(id: str, db: Session = Depends(get_db)):
    return gis_service.get_disaster_geojson(db, id)

@router.get("/damage/{id}")
def get_damage_gis(id: str, db: Session = Depends(get_db)):
    return gis_service.get_damage_geojson(db, id)

@router.get("/rescue-teams")
def get_rescue_teams_gis(db: Session = Depends(get_db)):
    return gis_service.get_rescue_teams_geojson(db)

@router.get("/shelters")
def get_shelters_gis():
    return gis_service.get_shelters_geojson()
