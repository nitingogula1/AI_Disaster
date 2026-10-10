from datetime import datetime, timezone, timedelta
from typing import Optional, Any, Dict, List
from enum import Enum
from pydantic import BaseModel, Field

class ProvenanceType(str, Enum):
    LIVE_SENSOR = "LIVE_SENSOR"
    SATELLITE_DERIVED = "SATELLITE_DERIVED"
    FORECAST_MODEL = "FORECAST_MODEL"
    FIELD_REPORT = "FIELD_REPORT"
    ESTIMATE = "ESTIMATE"
    SIMULATED = "SIMULATED"

STALENESS_THRESHOLDS = {
    ProvenanceType.LIVE_SENSOR.value: timedelta(hours=6),
    ProvenanceType.FORECAST_MODEL.value: timedelta(hours=6),
    ProvenanceType.FIELD_REPORT.value: timedelta(hours=12),
    ProvenanceType.SATELLITE_DERIVED.value: timedelta(days=10),
    ProvenanceType.ESTIMATE.value: timedelta(days=365),
    ProvenanceType.SIMULATED.value: timedelta(seconds=0),
}

class MetricEnvelope(BaseModel):
    value: Optional[Any] = None
    unit: str = ""
    provenance: str = ProvenanceType.SIMULATED.value
    as_of: Optional[str] = None
    fetched_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    stale: bool = False
    label: Optional[str] = None
    sublabel: Optional[str] = None
    icon: Optional[str] = None

def build_metric(
    value: Any,
    unit: str,
    provenance: str,
    as_of: Optional[datetime] = None,
    fetched_at: Optional[datetime] = None,
    label: Optional[str] = None,
    sublabel: Optional[str] = None,
    icon: Optional[str] = None,
    stale_override: Optional[bool] = None
) -> Dict[str, Any]:
    now = datetime.now(timezone.utc)
    if fetched_at is None:
        fetched_at = now
    
    stale = False
    if stale_override is not None:
        stale = stale_override
    elif as_of is not None:
        as_of_aware = as_of if as_of.tzinfo is not None else as_of.replace(tzinfo=timezone.utc)
        max_age = STALENESS_THRESHOLDS.get(provenance, timedelta(hours=12))
        if (now - as_of_aware) > max_age:
            stale = True
    elif provenance != ProvenanceType.SIMULATED.value:
        stale = True

    return {
        "value": value,
        "unit": unit,
        "provenance": provenance if provenance in [p.value for p in ProvenanceType] else ProvenanceType.SIMULATED.value,
        "as_of": as_of.isoformat() if as_of else None,
        "fetched_at": fetched_at.isoformat(),
        "stale": stale,
        "label": label,
        "sublabel": sublabel,
        "icon": icon
    }
