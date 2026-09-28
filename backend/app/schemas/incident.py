from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel

class IncidentBase(BaseModel):
    disaster_id: str
    title: str
    description: Optional[str] = None
    incident_type: str = "COLLAPSE"
    latitude: float
    longitude: float
    severity: str = "CRITICAL"
    status: str = "ACTIVE"
    population_affected: Optional[int] = 0
    medical_risk: Optional[float] = 0.5
    accessibility_score: Optional[float] = 0.5
    assigned_team_id: Optional[str] = None

class IncidentCreate(IncidentBase):
    incident_code: Optional[str] = None

class IncidentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = None
    assigned_team_id: Optional[str] = None
    population_affected: Optional[int] = None
    medical_risk: Optional[float] = None
    accessibility_score: Optional[float] = None

class IncidentResponse(IncidentBase):
    id: str
    incident_code: str
    priority_score: float
    priority_tier: str
    factors_json: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
