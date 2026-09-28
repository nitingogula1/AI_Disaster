import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, DateTime, JSON, ForeignKey, Boolean
from app.core.database import Base

class DamageDetection(Base):
    __tablename__ = "damage_detections"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    disaster_id = Column(String(36), ForeignKey("disaster_events.id"), nullable=False, index=True)
    satellite_scene_id = Column(String(36), ForeignKey("satellite_scenes.id"), nullable=True)
    
    asset_code = Column(String(50), nullable=True)  # e.g. BLD-8821
    location_name = Column(String(200), nullable=True)
    category = Column(String(50), default="Residential")  # Medical, Transport, Education, Residential, Utility
    
    object_type = Column(String(50), nullable=False, default="BUILDING")  # BUILDING, ROAD, FLOOD, INFRASTRUCTURE
    damage_grade = Column(Integer, default=4)  # 1 to 5
    damage_class = Column(String(50), default="SEVERE")  # NO_DAMAGE, MINOR, MODERATE, SEVERE, DESTROYED
    failure_mode = Column(String(100), default="Roof Shearing")
    
    flood_depth = Column(Float, default=0.0)
    flood_type = Column(String(50), default="Surge")
    
    confidence = Column(Float, default=95.0)  # Percentage 0 - 100
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    geometry = Column(JSON, nullable=True)  # GeoJSON polygon/point
    area = Column(Float, default=0.0)  # sq meters
    
    model_name = Column(String(100), default="Dual-Stream Siamese U-Net + Transformer CV")
    model_version = Column(String(50), default="v1.4")
    inference_time_ms = Column(Integer, default=1240)
    
    verified = Column(Boolean, default=False)
    rescue_status = Column(String(50), default="ENQUEUED")
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
