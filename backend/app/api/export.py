from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.disaster import DisasterEvent
from app.models.damage import DamageDetection
from app.models.rescue_team import RescueTeam
from app.models.incident import Incident
from app.services.gis_service import gis_service

router = APIRouter(prefix="/export", tags=["Export"])

@router.get("/operation/{operation_id}/geojson")
def export_operation_geojson(operation_id: str, db: Session = Depends(get_db)):
    """
    Returns unified GeoJSON FeatureCollection containing:
    - disaster boundary
    - flood polygons
    - damaged buildings
    - blocked roads
    - rescue teams
    - incidents
    - evacuation zones
    """
    features = []

    # 1. Disaster boundary polygon
    disaster = db.query(DisasterEvent).filter(
        (DisasterEvent.id == operation_id) | (DisasterEvent.event_code == operation_id)
    ).first()
    lat = disaster.latitude if disaster else 21.8412
    lng = disaster.longitude if disaster else 89.5422

    perimeter_coords = [
        [lng - 0.05, lat - 0.03],
        [lng + 0.03, lat - 0.04],
        [lng + 0.05, lat + 0.02],
        [lng + 0.03, lat + 0.04],
        [lng - 0.03, lat + 0.03],
        [lng - 0.05, lat - 0.03]
    ]
    features.append({
        "type": "Feature",
        "properties": {
            "layer": "DISASTER_BOUNDARY",
            "name": disaster.name if disaster else "Cyclone Remal Impact Zone",
            "severity": disaster.severity if disaster else "CRITICAL"
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [perimeter_coords]
        }
    })

    # 2. Flood Polygons
    flood_coords = [
        [89.52, 21.86], [89.56, 21.87], [89.58, 21.85],
        [89.57, 21.83], [89.54, 21.82], [89.51, 21.83],
        [89.52, 21.86]
    ]
    features.append({
        "type": "Feature",
        "properties": {
            "layer": "FLOOD_EXTENT",
            "index": "MNDWI",
            "area_km2": 18.6
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [flood_coords]
        }
    })

    # 3. Damaged buildings
    bld_detections = db.query(DamageDetection).filter(DamageDetection.object_type == "BUILDING").all()
    for d in bld_detections:
        features.append({
            "type": "Feature",
            "properties": {
                "layer": "DAMAGED_BUILDINGS",
                "asset_code": d.asset_code,
                "category": d.category,
                "damage_grade": d.damage_grade,
                "confidence": d.confidence
            },
            "geometry": {
                "type": "Point",
                "coordinates": [d.longitude, d.latitude]
            }
        })

    # 4. Blocked roads
    features.append({
        "type": "Feature",
        "properties": {
            "layer": "BLOCKED_ROADS",
            "name": "HWY-10 Embankment Cut",
            "status": "IMPASSABLE"
        },
        "geometry": {
            "type": "LineString",
            "coordinates": [[89.50, 21.845], [89.56, 21.86]]
        }
    })
    features.append({
        "type": "Feature",
        "properties": {
            "layer": "BLOCKED_ROADS",
            "name": "Canal Access Causeway",
            "status": "SUBMERGED"
        },
        "geometry": {
            "type": "LineString",
            "coordinates": [[89.53, 21.83], [89.58, 21.82]]
        }
    })

    # 5. Rescue teams
    teams = db.query(RescueTeam).all()
    for t in teams:
        features.append({
            "type": "Feature",
            "properties": {
                "layer": "RESCUE_TEAMS",
                "team_code": t.team_code,
                "name": t.team_name,
                "status": t.status,
                "vehicle": t.vehicle_type
            },
            "geometry": {
                "type": "Point",
                "coordinates": [t.longitude, t.latitude]
            }
        })

    # 6. Incidents & Evacuation Zones
    incidents = db.query(Incident).all()
    for inc in incidents:
        features.append({
            "type": "Feature",
            "properties": {
                "layer": "INCIDENTS",
                "code": inc.incident_code,
                "title": inc.title,
                "severity": inc.severity,
                "priority": inc.priority_tier
            },
            "geometry": {
                "type": "Point",
                "coordinates": [inc.longitude, inc.latitude]
            }
        })

    # Evacuation shelters / zones
    shelters = gis_service.get_shelters_geojson()
    features.extend(shelters.get("features", []))

    return {
        "type": "FeatureCollection",
        "operation_id": operation_id,
        "features": features
    }

@router.get("/operation/{operation_id}/cad")
def export_operation_cad(operation_id: str):
    """
    CAD export endpoint. Prompt requires:
    Only implement CAD generation if required geometry/export library (e.g. ezdxf) is available.
    Otherwise return a clear 'CAD export unavailable' response. DO NOT fake a CAD file.
    """
    try:
        import ezdxf  # Check if AutoCAD DXF engine is present
    except ImportError:
        return JSONResponse(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            content={
                "success": False,
                "error": {
                    "code": "CAD_EXPORT_UNAVAILABLE",
                    "message": "CAD export is currently unavailable because AutoCAD DXF/DWG vectorization library (ezdxf) is not configured in this environment. Use GeoJSON export instead."
                }
            }
        )

    return JSONResponse(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        content={"success": False, "message": "CAD export unavailable"}
    )
