import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, DateTime, Text, JSON, Boolean
from app.core.database import Base

class DroneMission(Base):
    __tablename__ = "drone_missions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    mission_code = Column(String(50), unique=True, index=True, nullable=False)
    mission_name = Column(String(200), nullable=False)
    disaster_id = Column(String(64), nullable=False, default="evt-remal-001", index=True)
    drone_model = Column(String(100), default="DJI Matrice 300 RTK + Zenmuse P1")
    flight_altitude_m = Column(Float, default=65.0)
    gsd_cm_px = Column(Float, default=2.4)
    sensor_type = Column(String(50), default="RGB_NIR")
    status = Column(String(32), default="COMPLETED")  # COMPLETED, IN_FLIGHT, PROCESSING, FAILED
    
    target_sector = Column(String(100), default="Trishuli Secondary School Shelter")
    latitude = Column(Float, default=21.845)
    longitude = Column(Float, default=89.545)
    coverage_area_sqm = Column(Float, default=145000.0)  # ~0.145 km2
    
    orthomosaic_url = Column(String(255), nullable=True)
    dsm_url = Column(String(255), nullable=True)
    
    # Elevation Subtraction (DSM - DEM)
    water_surface_elevation_m = Column(Float, default=3.8)
    baseline_ground_elevation_m = Column(Float, default=2.6)
    max_water_depth_m = Column(Float, default=1.85)
    avg_water_depth_m = Column(Float, default=1.20)
    
    flood_footprint_sqm = Column(Float, default=68400.0)
    total_survivors_detected = Column(Integer, default=48)
    blocked_routes_detected = Column(Integer, default=3)
    
    deep_learning_model = Column(String(100), default="YOLOv8-Seg + SegFormer-B4")
    ai_confidence = Column(Float, default=96.8)
    
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

class DroneDetection(Base):
    __tablename__ = "drone_detections"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    mission_id = Column(String(36), nullable=False, index=True)
    detection_type = Column(String(50), nullable=False)  # SURVIVOR_CLUSTER, BLOCKED_ROAD, WATER_SURGE_POOL, COMPROMISED_ROOF
    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    confidence = Column(Float, default=0.95)
    
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    elevation_m = Column(Float, default=3.2)
    water_depth_m = Column(Float, default=1.2)
    
    # Survivor specific
    headcount = Column(Integer, default=0)
    is_rescued = Column(Boolean, default=False)
    assigned_team_id = Column(String(36), nullable=True)
    
    # Route specific
    passable_for = Column(String(50), default="NONE")  # NONE, AMPHIBIOUS_ONLY, HIGH_CLEARANCE, WALKABLE
    road_segment_name = Column(String(100), nullable=True)
    
    geometry = Column(JSON, nullable=True)
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
