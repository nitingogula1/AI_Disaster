import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, DateTime, Text, JSON
from app.core.database import Base

class DisasterEvent(Base):
    __tablename__ = "disaster_events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    operation_id = Column(String(64), nullable=True, default="CY-2025-05B", index=True)
    event_code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(150), nullable=False)
    disaster_type = Column(String(50), nullable=False)  # FLOOD, CYCLONE, EARTHQUAKE, etc.
    description = Column(Text, nullable=True)
    severity = Column(String(20), nullable=False, default="HIGH")  # CRITICAL, HIGH, MEDIUM, LOW
    status = Column(String(20), nullable=False, default="ACTIVE")  # ACTIVE, MONITORING, RESOLVED
    
    country = Column(String(100), nullable=True, default="Bangladesh")
    state = Column(String(100), nullable=True)
    district = Column(String(100), nullable=True)
    location_name = Column(String(200), nullable=False)
    
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    
    affected_area = Column(Float, default=0.0)  # sq km
    affected_population = Column(Integer, default=0)
    teams_deployed = Column(Integer, default=0)
    
    satellite_source = Column(String(100), nullable=True, default="Sentinel-2 L2A")
    ai_confidence = Column(Float, default=95.0)
    thumbnail_band = Column(String(100), nullable=True)
    metadata_json = Column(JSON, nullable=True)
    
    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    created_by = Column(String(36), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
