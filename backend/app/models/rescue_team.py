import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, DateTime, JSON, ForeignKey
from app.core.database import Base

class RescueTeam(Base):
    __tablename__ = "rescue_teams"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    team_code = Column(String(50), unique=True, index=True, nullable=False)  # e.g. RT-01, RT-02
    team_name = Column(String(100), nullable=False)
    leader_name = Column(String(100), nullable=False)
    team_size = Column(Integer, default=6)
    team_type = Column(String(50), default="Amphibious")  # Amphibious, Water Rescue, Field Medic, Hazmat, Heavy Lift
    
    status = Column(String(30), default="AVAILABLE")  # AVAILABLE, EN_ROUTE, ON_MISSION, ON_SITE, AT_SCENE, OFFLINE, EMERGENCY
    current_location = Column(String(150), default="Command Station Alpha")
    current_mission = Column(String(200), nullable=True)
    mission_id = Column(String(50), nullable=True)
    
    latitude = Column(Float, nullable=False, default=21.8412)
    longitude = Column(Float, nullable=False, default=89.5422)
    
    vehicle_type = Column(String(100), default="Amphibious Craft B-14")
    equipment = Column(String(255), nullable=True)
    speed_knots = Column(Float, default=18.4)
    heading_deg = Column(Integer, default=34)
    fuel_percent = Column(Integer, default=78)
    phone = Column(String(30), nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

class RescueMission(Base):
    __tablename__ = "rescue_missions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    incident_id = Column(String(36), ForeignKey("incidents.id"), nullable=True)
    team_id = Column(String(36), ForeignKey("rescue_teams.id"), nullable=False)
    
    mission_code = Column(String(50), unique=True, index=True, nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(String(500), nullable=True)
    
    destination_latitude = Column(Float, nullable=False)
    destination_longitude = Column(Float, nullable=False)
    
    priority = Column(String(20), default="P1")
    status = Column(String(30), default="IN_PROGRESS")  # ASSIGNED, IN_PROGRESS, COMPLETED, ABORTED
    
    eta_minutes = Column(Integer, default=14)
    distance_km = Column(Float, default=4.2)
    
    assigned_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
