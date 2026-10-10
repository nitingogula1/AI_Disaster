from typing import Optional, List, Dict, Any, Union
from datetime import datetime
from pydantic import BaseModel, Field, field_validator, model_validator
from enum import Enum
from app.models.drone_recon import DroneEventType, DroneProvenance

class StructureState(str, Enum):
    STABLE = "STABLE"
    DAMAGED = "DAMAGED"
    COLLAPSING = "COLLAPSING"
    UNKNOWN = "UNKNOWN"

class WaterSituation(str, Enum):
    RISING = "RISING"
    STABLE = "STABLE"
    FALLING = "FALLING"
    UNKNOWN = "UNKNOWN"

class SelfEvacuateState(str, Enum):
    YES = "YES"
    NO = "NO"
    UNKNOWN = "UNKNOWN"

class VulnerableCategory(str, Enum):
    CHILDREN = "children"
    ELDERLY = "elderly"
    INJURED = "injured"
    DISABLED = "disabled"
    NONE = "none"
    UNKNOWN = "unknown"

class SurvivorLockPayload(BaseModel):
    people_count: Optional[int] = Field(None, ge=0, description="Exact or estimated number of people")
    people_min: Optional[int] = Field(None, ge=0, description="Minimum estimate of people")
    people_max: Optional[int] = Field(None, ge=0, description="Maximum estimate of people")
    vulnerable_present: List[str] = Field(default=["unknown"], description="Categories of vulnerable people present")
    vulnerable_count: Optional[int] = Field(None, ge=0, description="Estimated count of vulnerable individuals")
    structure_state: StructureState = StructureState.UNKNOWN
    water_situation: WaterSituation = WaterSituation.UNKNOWN
    water_depth_m: Optional[float] = Field(None, ge=0.0, description="Water depth in meters")
    can_self_evacuate: SelfEvacuateState = SelfEvacuateState.UNKNOWN
    observation_time: Optional[datetime] = None
    notes: Optional[str] = None

    @field_validator("vulnerable_present")
    @classmethod
    def validate_vulnerable(cls, v):
        valid = {c.value for c in VulnerableCategory}
        for item in v:
            if item.lower() not in valid:
                raise ValueError(f"Invalid vulnerable category: {item}. Must be one of {valid}")
        return [i.lower() for i in v]

    @model_validator(mode="after")
    def validate_ranges(self):
        if self.people_min is not None and self.people_max is not None:
            if self.people_min > self.people_max:
                raise ValueError("people_min cannot exceed people_max")
        if self.people_count is None and self.people_min is not None:
            self.people_count = self.people_min
        return self

class RoadCutoffType(str, Enum):
    BRIDGE_DESTROYED = "BRIDGE_DESTROYED"
    ROAD_SUBMERGED = "ROAD_SUBMERGED"
    DEBRIS = "DEBRIS"
    LANDSLIDE = "LANDSLIDE"
    OTHER = "OTHER"

class RoadCutoffSeverity(str, Enum):
    BLOCKED = "BLOCKED"
    PASSABLE_WITH_LIMITS = "PASSABLE_WITH_LIMITS"

class RoadCutoffGeometryType(str, Enum):
    POINT = "POINT"
    LINE_STRING = "LINE_STRING"

class RoadCutoffPayload(BaseModel):
    cutoff_type: RoadCutoffType = RoadCutoffType.OTHER
    severity: RoadCutoffSeverity = RoadCutoffSeverity.BLOCKED
    geometry_type: RoadCutoffGeometryType = RoadCutoffGeometryType.POINT
    coordinates: Optional[Union[List[float], List[List[float]]]] = Field(
        None, description="[lat, lng] for POINT or [[lat, lng], [lat, lng], ...] for LINE_STRING"
    )
    estimated_depth_m: Optional[float] = Field(None, ge=0.0)
    road_name: Optional[str] = None
    vehicle_limits: Optional[str] = None
    observation_time: Optional[datetime] = None
    notes: Optional[str] = None

class FloodingRisk(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    UNKNOWN = "UNKNOWN"

class LzLockPayload(BaseModel):
    size_m: Optional[str] = Field(None, description="Approximate dimensions e.g. '30x30'")
    surface: Optional[str] = Field(None, description="e.g. concrete, grass, asphalt, packed dirt")
    obstacles: List[str] = Field(default=["none"], description="wires, trees, structures, none")
    slope_estimate_deg: Optional[float] = Field(None, ge=0.0, le=90.0)
    flooding_risk: FloodingRisk = FloodingRisk.UNKNOWN
    suitable_for: List[str] = Field(default=["helicopter"], description="helicopter, boat_dock, vehicle")
    observation_time: Optional[datetime] = None
    notes: Optional[str] = None

class EventCreateRequest(BaseModel):
    event_type: DroneEventType
    place_name: Optional[str] = None
    lat: Optional[float] = Field(None, ge=-90.0, le=90.0)
    lng: Optional[float] = Field(None, ge=-180.0, le=180.0)
    bbox: Optional[List[float]] = None
    payload: Optional[Dict[str, Any]] = None
    confidence: Optional[float] = None
    provenance: DroneProvenance = DroneProvenance.OPERATOR_MARKED

    @model_validator(mode="after")
    def validate_rules(self):
        # Strict Rule: Marks are OPERATOR_MARKED and unverified until commander verifies.
        # No confidence percentages on operator marks.
        if self.provenance == DroneProvenance.OPERATOR_MARKED:
            self.confidence = None
        return self

class EventUpdateRequest(BaseModel):
    place_name: Optional[str] = None
    lat: Optional[float] = Field(None, ge=-90.0, le=90.0)
    lng: Optional[float] = Field(None, ge=-180.0, le=180.0)
    payload: Optional[Dict[str, Any]] = None
    edit_reason: str = Field(..., min_length=3, description="Mandatory reason for audit logging")

class EventSoftDeleteRequest(BaseModel):
    deletion_reason: str = Field(..., min_length=3, description="Mandatory reason for audit logging")

class EventVerifyRequest(BaseModel):
    notes: Optional[str] = None
