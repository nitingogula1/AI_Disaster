import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Boolean, DateTime, Text, JSON, ForeignKey
from app.core.database import Base

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    disaster_id = Column(String(36), ForeignKey("disaster_events.id"), nullable=True)
    alert_type = Column(String(50), default="TELEMETRY")
    severity = Column(String(30), default="CRITICAL")  # CRITICAL, HIGH_SURGE, SATELLITE_INGEST, WARNING, INFO
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    coordinates_str = Column(String(100), nullable=True)
    
    actions_json = Column(JSON, nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
