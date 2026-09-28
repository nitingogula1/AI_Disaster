import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text, JSON
from app.core.database import Base

class Operation(Base):
    __tablename__ = "operations"

    id = Column(String(64), primary_key=True)  # e.g. "CY-2025-05B"
    name = Column(String(150), nullable=False)  # "Cyclone Remal"
    region = Column(String(150), nullable=False)  # "Bay Area / Delta Sector 4"
    severity = Column(String(30), nullable=False, default="CRITICAL")  # CRITICAL, HIGH, MEDIUM
    status = Column(String(30), nullable=False, default="ACTIVE")  # ACTIVE, STANDBY, RESOLVED
    response_phase = Column(String(100), default="Phase 2 Evacuation & Rescue")
    details = Column(Text, nullable=True)
    target_bbox = Column(JSON, nullable=True)
    metadata_json = Column(JSON, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
