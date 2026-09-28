import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, DateTime, JSON, ForeignKey
from app.core.database import Base

class OptimizedRoute(Base):
    __tablename__ = "routes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    mission_id = Column(String(36), ForeignKey("rescue_missions.id"), nullable=True)
    disaster_id = Column(String(36), ForeignKey("disaster_events.id"), nullable=True)
    
    route_code = Column(String(50), nullable=False)  # e.g. ROUTE-A, ROUTE-B
    name = Column(String(150), nullable=False)  # e.g. West Levee Bypass
    label = Column(String(100), default="ROUTE A • RECOMMENDED")
    status = Column(String(50), default="RECOMMENDED")  # RECOMMENDED, HAZARD, CONGESTED
    
    start_latitude = Column(Float, nullable=False)
    start_longitude = Column(Float, nullable=False)
    destination_latitude = Column(Float, nullable=False)
    destination_longitude = Column(Float, nullable=False)
    
    distance_km = Column(Float, nullable=False)
    estimated_time_minutes = Column(Integer, nullable=False)
    risk_factor = Column(String(20), default="LOW")  # LOW, MEDIUM, CRITICAL
    risk_percent = Column(Integer, default=12)
    blocked_segments = Column(Integer, default=0)
    max_flood_depth = Column(Float, default=0.15)
    
    waypoints = Column(JSON, nullable=True)  # list of [{name, position: [lat, lng]}]
    geometry = Column(JSON, nullable=False)  # GeoJSON LineString coordinates [[lat, lng], ...]
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
