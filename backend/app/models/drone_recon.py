import uuid
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, JSON, Enum as SQLEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from app.core.database import Base

class DroneSessionStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    ENDED = "ENDED"
    ABORTED = "ABORTED"

class DroneEventType(str, enum.Enum):
    AREA_SEARCHED = "AREA_SEARCHED"
    SURVIVOR_LOCK = "SURVIVOR_LOCK"
    LZ_LOCK = "LZ_LOCK"
    ROAD_CUTOFF = "ROAD_CUTOFF"
    TEAM_DISPATCHED = "TEAM_DISPATCHED"
    SENSOR_CHANGED = "SENSOR_CHANGED"
    OPERATOR_NOTE = "OPERATOR_NOTE"

class DroneProvenance(str, enum.Enum):
    OPERATOR_MARKED = "OPERATOR_MARKED"
    DRILL_PRESET = "DRILL_PRESET"
    ML_INFERENCE = "ML_INFERENCE"

class DroneReconSession(Base):
    __tablename__ = "drone_recon_sessions"

    id = Column(String(50), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    user_id = Column(String(50), ForeignKey("users.id"))
    disaster_id = Column(String(50), nullable=True) # or theater name
    uav_callsign = Column(String(100), nullable=True)
    sensor_mode = Column(String(50), default="OPTICAL")
    is_simulation = Column(Boolean, default=False)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    ended_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(SQLEnum(DroneSessionStatus), default=DroneSessionStatus.ACTIVE)

    events = relationship("DroneReconEvent", back_populates="session", cascade="all, delete-orphan")
    user = relationship("User")

class DroneReconEvent(Base):
    __tablename__ = "drone_recon_events"

    id = Column(String(50), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    session_id = Column(String(50), ForeignKey("drone_recon_sessions.id"))
    event_type = Column(SQLEnum(DroneEventType))
    place_name = Column(String(200), nullable=True)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    bbox = Column(JSON, nullable=True)
    payload = Column(JSON, nullable=True)
    confidence = Column(Float, nullable=True)
    provenance = Column(SQLEnum(DroneProvenance), default=DroneProvenance.OPERATOR_MARKED)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=True, onupdate=func.now())
    is_deleted = Column(Boolean, default=False)
    deletion_reason = Column(String(255), nullable=True)
    is_verified = Column(Boolean, default=False)
    verified_by = Column(String(50), nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    edit_history = Column(JSON, nullable=True)

    session = relationship("DroneReconSession", back_populates="events")
