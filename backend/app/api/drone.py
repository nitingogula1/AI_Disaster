from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.drone_service import drone_service
from app.schemas.drone import (
    DroneMissionResponse,
    DroneMissionDetailResponse,
    DroneFlightAnalysisRequest,
    DispatchSurvivorRequest
)
from app.schemas.common import success_response

router = APIRouter(prefix="/drone", tags=["Tactical Drone Recon"])

@router.get("/missions")
def get_drone_missions(
    disaster_id: Optional[str] = Query(None, description="Filter by disaster ID"),
    db: Session = Depends(get_db)
):
    """
    Get all tactical drone / UAV reconnaissance missions.
    """
    missions = drone_service.get_missions(db, disaster_id=disaster_id)
    return success_response(data=[
        {
            "id": m.id,
            "mission_code": m.mission_code,
            "mission_name": m.mission_name,
            "disaster_id": m.disaster_id,
            "drone_model": m.drone_model,
            "flight_altitude_m": m.flight_altitude_m,
            "gsd_cm_px": m.gsd_cm_px,
            "sensor_type": m.sensor_type,
            "status": m.status,
            "target_sector": m.target_sector,
            "latitude": m.latitude,
            "longitude": m.longitude,
            "coverage_area_sqm": m.coverage_area_sqm,
            "water_surface_elevation_m": m.water_surface_elevation_m,
            "baseline_ground_elevation_m": m.baseline_ground_elevation_m,
            "max_water_depth_m": m.max_water_depth_m,
            "avg_water_depth_m": m.avg_water_depth_m,
            "flood_footprint_sqm": m.flood_footprint_sqm,
            "total_survivors_detected": m.total_survivors_detected,
            "blocked_routes_detected": m.blocked_routes_detected,
            "deep_learning_model": m.deep_learning_model,
            "ai_confidence": m.ai_confidence,
            "orthomosaic_url": m.orthomosaic_url,
            "dsm_url": m.dsm_url,
            "created_at": m.created_at
        }
        for m in missions
    ])

@router.get("/missions/{mission_id}")
def get_drone_mission_detail(mission_id: str, db: Session = Depends(get_db)):
    """
    Get comprehensive results for a drone mission:
    - Orthomosaic metadata
    - Exact flood footprint
    - Elevation subtraction DSM - DEM water depth transect
    - Blocked evacuation routes
    - Stranded survivor locations
    """
    detail = drone_service.get_mission_detail(db, mission_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Drone mission not found")

    m = detail["mission"]
    return success_response(data={
        "mission": {
            "id": m.id,
            "mission_code": m.mission_code,
            "mission_name": m.mission_name,
            "disaster_id": m.disaster_id,
            "drone_model": m.drone_model,
            "flight_altitude_m": m.flight_altitude_m,
            "gsd_cm_px": m.gsd_cm_px,
            "sensor_type": m.sensor_type,
            "status": m.status,
            "target_sector": m.target_sector,
            "latitude": m.latitude,
            "longitude": m.longitude,
            "coverage_area_sqm": m.coverage_area_sqm,
            "water_surface_elevation_m": m.water_surface_elevation_m,
            "baseline_ground_elevation_m": m.baseline_ground_elevation_m,
            "max_water_depth_m": m.max_water_depth_m,
            "avg_water_depth_m": m.avg_water_depth_m,
            "flood_footprint_sqm": m.flood_footprint_sqm,
            "total_survivors_detected": m.total_survivors_detected,
            "blocked_routes_detected": m.blocked_routes_detected,
            "deep_learning_model": m.deep_learning_model,
            "ai_confidence": m.ai_confidence,
            "orthomosaic_url": m.orthomosaic_url,
            "dsm_url": m.dsm_url,
            "created_at": m.created_at
        },
        "elevation_profile": detail["elevation_profile"],
        "evacuation_routes": detail["evacuation_routes"],
        "detections": [
            {
                "id": d.id,
                "mission_id": d.mission_id,
                "detection_type": d.detection_type,
                "title": d.title,
                "description": d.description,
                "confidence": d.confidence,
                "latitude": d.latitude,
                "longitude": d.longitude,
                "elevation_m": d.elevation_m,
                "water_depth_m": d.water_depth_m,
                "headcount": d.headcount,
                "is_rescued": d.is_rescued,
                "assigned_team_id": d.assigned_team_id,
                "passable_for": d.passable_for,
                "road_segment_name": d.road_segment_name,
                "geometry": d.geometry,
                "metadata": d.metadata_json
            }
            for d in detail["detections"]
        ]
    })

@router.post("/missions/analyze")
def trigger_flight_analysis(payload: DroneFlightAnalysisRequest, db: Session = Depends(get_db)):
    """
    Run complete photogrammetry & AI pipeline on a tactical drone flight:
    1. Orthomosaic Stitching (WebODM integration)
    2. Deep Learning Segmentation (U-Net / YOLOv8-Seg)
    3. Elevation Subtraction (DSM minus DEM ground level)
    4. Exact Flood Footprint, Water Depth, Blocked Routes, and Survivor Extraction
    """
    mission = drone_service.process_flight_analysis(db, payload.model_dump())
    return success_response(
        message="Drone orthomosaic stitched and deep-learning elevation subtraction completed.",
        data={
            "mission_id": mission.id,
            "mission_code": mission.mission_code,
            "water_depth_avg_m": mission.avg_water_depth_m,
            "max_water_depth_m": mission.max_water_depth_m,
            "total_survivors_detected": mission.total_survivors_detected,
            "blocked_routes_detected": mission.blocked_routes_detected,
            "flood_footprint_sqm": mission.flood_footprint_sqm,
            "ai_confidence": mission.ai_confidence
        }
    )

@router.get("/missions/{mission_id}/geojson")
def get_mission_geojson(mission_id: str, db: Session = Depends(get_db)):
    """
    Get GeoJSON FeatureCollection of drone-detected flood footprint,
    water depth elevation points, road blockages, and survivor pins.
    """
    geojson = drone_service.get_mission_geojson(db, mission_id)
    return geojson

@router.post("/survivors/{detection_id}/dispatch")
def dispatch_rescue_to_survivor(detection_id: str, payload: DispatchSurvivorRequest, db: Session = Depends(get_db)):
    """
    Directly dispatch a Rescue Unit to a drone-detected survivor cluster.
    """
    try:
        result = drone_service.dispatch_survivor_rescue(
            db, detection_id=detection_id, team_id=payload.team_id, priority=payload.priority
        )
        return success_response(data=result, message=result["message"])
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/missions/{mission_id}/reset-detections")
def reset_mission_detections(mission_id: str, db: Session = Depends(get_db)):
    """
    Resets all survivor detections for a mission back to un-rescued status for testing.
    """
    try:
        res = drone_service.reset_mission_detections(db, mission_id)
        return success_response(data=res, message="Mission detections reset to un-dispatched state.")
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/survivors/{detection_id}/reset")
def reset_survivor_detection(detection_id: str, db: Session = Depends(get_db)):
    """
    Resets a single survivor detection back to un-dispatched state.
    """
    try:
        res = drone_service.reset_detection(db, detection_id)
        return success_response(data=res, message="Survivor detection reset.")
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/live-telemetry")
def get_live_drone_telemetry():
    """
    Simulated live telemetry for actively flying tactical UAV.
    """
    return success_response(data={
        "callsign": "UAV-EAGLE-01",
        "model": "DJI Matrice 300 RTK (Drill Profile)",
        "feed_status": "NOT_CONNECTED",
        "feed_type": "SIMULATION_PREVIEW",
        "is_hardware_connected": False,
        "is_simulation": True,
        "rtsp_stream_url": None,
        "camera_feed": "SIMULATION_SYNTHETIC_PREVIEW",
        "sensor_mode": "SYNTHETIC HUD OVERLAY",
        "telemetry_source": "SIMULATED_SCENARIO_GENERATOR",
        "battery_percent": 84,
        "flight_time_remaining_min": 32,
        "altitude_agl_m": 64.8,
        "speed_kmh": 28.4,
        "latitude": 21.8458,
        "longitude": 89.5442,
        "rtk_accuracy_cm": None,
        "message": "Drone hardware not connected. Displaying synthetic exercise HUD preview."
    })

@router.post("/flight-plan/generate")
def generate_drone_flight_plan(
    center_lat: float = Query(21.8450, description="Center latitude of search sector"),
    center_lng: float = Query(89.5450, description="Center longitude of search sector"),
    altitude_m: float = Query(65.0, description="Flight altitude AGL in meters")
):
    """
    Generates an automated lawnmower SAR grid flight path for a drone over a flooded zone.
    """
    plan = drone_service.generate_sar_flight_plan(
        center_lat=center_lat, center_lng=center_lng, altitude_m=altitude_m
    )
    return success_response(
        data=plan,
        message="Search-and-Rescue UAV grid flight path computed with 80% front / 75% side photogrammetry overlap."
    )

