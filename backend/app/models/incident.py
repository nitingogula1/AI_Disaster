import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, DateTime, Text, JSON, ForeignKey
from app.core.database import Base

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    disaster_id = Column(String(36), ForeignKey("disaster_events.id"), nullable=False, index=True)
    incident_code = Column(String(50), unique=True, index=True, nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    incident_type = Column(String(50), nullable=False, default="COLLAPSE")
    
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    
    severity = Column(String(20), default="CRITICAL")  # CRITICAL, HIGH, MEDIUM, LOW
    status = Column(String(30), default="ACTIVE")  # ACTIVE, PENDING, EN_ROUTE, RESOLVED
    
    population_affected = Column(Integer, default=0)
    medical_risk = Column(Float, default=0.5)  # 0.0 to 1.0
    accessibility_score = Column(Float, default=0.5)  # 0.0 (blocked) to 1.0 (clear)
    priority_score = Column(Float, default=50.0)  # Calculated score 0 - 100
    priority_tier = Column(String(10), default="P1")  # P1, P2, P3
    
    factors_json = Column(JSON, nullable=True)
    assigned_team_id = Column(String(36), nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
