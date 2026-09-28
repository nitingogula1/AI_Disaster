from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel

class AlertCreate(BaseModel):
    disaster_id: Optional[str] = None
    severity: str = "CRITICAL"
    title: str
    message: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    coordinates_str: Optional[str] = None
    actions: Optional[List[Dict[str, Any]]] = None

class AlertResponse(BaseModel):
    id: str
    disaster_id: Optional[str] = None
    severity: str
    title: str
    description: str
    timestamp: str
    coordinates: Optional[str] = None
    actions: Optional[List[Dict[str, Any]]] = None
    is_read: bool

    class Config:
        from_attributes = True

class ReportGenerateRequest(BaseModel):
    disaster_id: str
    report_type: str = "Executive Brief"  # Executive Brief, AI Damage Audit, International Aid Protocol, Logistics & GIS
    format: str = "PDF"  # PDF, GeoJSON, CSV

class ReportResponse(BaseModel):
    id: str
    report_code: str
    disaster_id: Optional[str] = None
    title: str
    type: str
    date: str
    author: str
    size: str
    status: str
    downloads: int
    download_url: str

    class Config:
        from_attributes = True
