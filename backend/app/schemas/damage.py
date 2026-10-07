from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel

class AIDetectionRequest(BaseModel):
    disaster_id: str
    pre_scene_id: Optional[str] = None
    post_scene_id: Optional[str] = None
    model_name: Optional[str] = "Spectral Overlap Heuristic Engine (No ML Checkpoint)"
    confidence_threshold: Optional[float] = 0.85

class DamageDetectionItem(BaseModel):
    id: str
    asset_code: Optional[str] = None
    location_name: Optional[str] = None
    category: str
    object_type: str
    damage_grade: int
    damage_class: str
    failure_mode: Optional[str] = None
    flood_depth: float
    confidence: float
    latitude: float
    longitude: float
    verified: bool
    rescue_status: str

    class Config:
        from_attributes = True

class AIDetectionResponse(BaseModel):
    job_id: str
    status: str
    model_name: str
    inference_time_ms: int
    total_buildings_analyzed: int
    severe_collapse: int
    partial_damage: int
    destroyed_percent: float
    blocked_road_segments: int
    flood_footprint_km2: float
    detections: List[DamageDetectionItem]

class DamageSummary(BaseModel):
    total_inspected: int
    grade_5_destroyed: int
    grade_4_severe: int
    grade_3_moderate: int
    grade_2_minor: int
    grade_1_intact: int
    average_confidence: float
    estimated_loss_usd: str
    displaced_civilians: int
    by_category: Dict[str, int]
