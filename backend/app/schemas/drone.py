from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

class DroneDetectionItem(BaseModel):
    id: str
    mission_id: str
    detection_type: str  # SURVIVOR_CLUSTER, BLOCKED_ROAD, WATER_SURGE_POOL, COMPROMISED_ROOF
    title: str
    description: Optional[str] = None
    confidence: float
    latitude: float
    longitude: float
    elevation_m: float
    water_depth_m: float
    headcount: int = 0
    is_rescued: bool = False
    assigned_team_id: Optional[str] = None
    passable_for: str = "NONE"
    road_segment_name: Optional[str] = None
    geometry: Optional[Dict[str, Any]] = None
    metadata_json: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None

class DroneMissionResponse(BaseModel):
    id: str
    mission_code: str
    mission_name: str
    disaster_id: str
    drone_model: str
    flight_altitude_m: float
    gsd_cm_px: float
    sensor_type: str
    status: str
    target_sector: str
    latitude: float
    longitude: float
    coverage_area_sqm: float
    water_surface_elevation_m: float
    baseline_ground_elevation_m: float
    max_water_depth_m: float
    avg_water_depth_m: float
    flood_footprint_sqm: float
    total_survivors_detected: int
    blocked_routes_detected: int
    deep_learning_model: str
    ai_confidence: float
    orthomosaic_url: Optional[str] = None
    dsm_url: Optional[str] = None
    created_at: Optional[datetime] = None

class DroneMissionDetailResponse(DroneMissionResponse):
    detections: List[DroneDetectionItem] = []
    elevation_profile: Dict[str, Any] = {}
    evacuation_routes: List[Dict[str, Any]] = []

class DroneFlightAnalysisRequest(BaseModel):
    disaster_id: str = "evt-remal-001"
    target_sector: str = "Trishuli Secondary School Shelter"
    drone_model: str = "DJI Matrice 300 RTK + Zenmuse P1"
    flight_altitude_m: float = 65.0
    sensor_type: str = "RGB_NIR"
    baseline_ground_elevation_m: float = 2.6
    simulated_flood_surge_m: float = 3.8

class DispatchSurvivorRequest(BaseModel):
    team_id: str
    priority: str = "P1"
    notes: Optional[str] = None
