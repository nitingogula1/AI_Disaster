from typing import Optional, List, Any
from datetime import datetime
from pydantic import BaseModel

class DisasterEventBase(BaseModel):
    name: str
    disaster_type: str
    description: Optional[str] = None
    severity: str = "HIGH"
    status: str = "ACTIVE"
    country: Optional[str] = "Bangladesh"
    state: Optional[str] = None
    district: Optional[str] = None
    location_name: str
    latitude: float
    longitude: float
    affected_area: Optional[float] = 0.0
    affected_population: Optional[int] = 0
    teams_deployed: Optional[int] = 0
    satellite_source: Optional[str] = "Sentinel-2 L2A"
    ai_confidence: Optional[float] = 95.0
    thumbnail_band: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None

class DisasterEventCreate(DisasterEventBase):
    event_code: Optional[str] = None

class DisasterEventUpdate(BaseModel):
    name: Optional[str] = None
    disaster_type: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = None
    affected_area: Optional[float] = None
    affected_population: Optional[int] = None
    teams_deployed: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class DisasterEventResponse(DisasterEventBase):
    id: str
    event_code: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
