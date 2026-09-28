from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel

class RescueTeamBase(BaseModel):
    team_code: str
    team_name: str
    leader_name: str
    team_size: int = 6
    team_type: str = "Amphibious"
    status: str = "AVAILABLE"
    current_location: str = "Command Station Alpha"
    latitude: float
    longitude: float
    vehicle_type: str = "Amphibious Craft B-14"
    equipment: Optional[str] = None
    speed_knots: Optional[float] = 18.4
    heading_deg: Optional[int] = 34
    fuel_percent: Optional[int] = 78
    phone: Optional[str] = None

class RescueTeamResponse(RescueTeamBase):
    id: str
    current_mission: Optional[str] = None
    mission_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class RescuePriorityCalculationRequest(BaseModel):
    disaster_id: str
    population_weight: float = 0.20
    damage_weight: float = 0.40
    water_surge_weight: float = 0.30
    cutoff_weight: float = 0.10

class RescuePriorityZoneResponse(BaseModel):
    rank: str
    zone: str
    grid_coords: str
    structural_damage: str
    population_at_risk: int
    population_detail: str
    cutoff_level: str
    cutoff_detail: str
    recommended_response: str
    assigned_unit: str
    unit_status: str
    priority: str
    score: float
    factors: Dict[str, float]

class MissionCreate(BaseModel):
    incident_id: Optional[str] = None
    team_id: str
    title: str
    description: Optional[str] = None
    destination_latitude: float
    destination_longitude: float
    priority: str = "P1"

class MissionResponse(BaseModel):
    id: str
    mission_code: str
    incident_id: Optional[str] = None
    team_id: str
    title: str
    description: Optional[str] = None
    destination_latitude: float
    destination_longitude: float
    priority: str
    status: str
    eta_minutes: int
    distance_km: float
    assigned_at: datetime

    class Config:
        from_attributes = True
