from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

class AOIRequest(BaseModel):
    operation_id: Optional[str] = "EVT-8821-BGD"
    bbox: List[float] = Field(..., description="[min_lon, min_lat, max_lon, max_lat]")
    region: Optional[str] = None
    incident_name: Optional[str] = None

class STACSearchRequest(BaseModel):
    operation_id: Optional[str] = "EVT-8821-BGD"
    bbox: Optional[List[float]] = None
    start_datetime: Optional[str] = None
    end_datetime: Optional[str] = None
    collections: Optional[List[str]] = ["sentinel-2-l2a"]
    max_cloud_cover: Optional[float] = 15.0
    limit: Optional[int] = 50

class AssignRoleRequest(BaseModel):
    operation_id: Optional[str] = "EVT-8821-BGD"
    role: str = Field(..., description="PRE_DISASTER or POST_DISASTER")

class IngestRequest(BaseModel):
    operation_id: Optional[str] = "EVT-8821-BGD"
    scene_role: Optional[str] = "POST_DISASTER"

class PreprocessingPipelineRequest(BaseModel):
    operation_id: Optional[str] = "EVT-8821-BGD"
    scene_id: Optional[str] = "scn-001"
    stages: Optional[List[str]] = [
        "RADIOMETRIC",
        "ATMOSPHERIC",
        "CLOUD_MASK",
        "COREGISTRATION"
    ]

class RenderRGBRequest(BaseModel):
    scene_id: Optional[str] = "scn-001"
    red: Optional[str] = "B04"
    green: Optional[str] = "B03"
    blue: Optional[str] = "B02"

class RenderFalseColorRequest(BaseModel):
    scene_id: Optional[str] = "scn-001"
    nir: Optional[str] = "B08"
    red: Optional[str] = "B04"
    green: Optional[str] = "B03"

class VectorizeFloodRequest(BaseModel):
    scene_id: Optional[str] = "scn-001"
    threshold: Optional[float] = 0.05

class SendToGISRequest(BaseModel):
    operation_id: Optional[str] = "EVT-8821-BGD"
    layer_name: Optional[str] = None

class AIDamageSegmentationRequest(BaseModel):
    operation_id: Optional[str] = "EVT-8821-BGD"
    pre_scene_id: Optional[str] = "scn-000"
    post_scene_id: Optional[str] = "scn-001"
    model: Optional[str] = "ResNet-UNet"
    confidence_threshold: Optional[float] = 0.70

class FloodSceneSearchRequest(BaseModel):
    operation_id: Optional[str] = "EVT-8821-BGD"
    hours: Optional[int] = 72
    start_datetime: Optional[str] = None
    end_datetime: Optional[str] = None
    max_cloud_cover: Optional[float] = 30.0
    satellites: Optional[List[str]] = ["Sentinel-1", "Sentinel-2", "Landsat"]
    limit: Optional[int] = 50

class FloodAnalysisExecutionRequest(BaseModel):
    operation_id: Optional[str] = "EVT-8821-BGD"
    method: Optional[str] = "MNDWI"  # MNDWI, NDWI, SAR Change, SAR Inundation
    threshold: Optional[float] = 0.05


# Legacy schemas for backward compatibility
class SatelliteSearchQuery(BaseModel):
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    bbox: Optional[List[float]] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    provider: Optional[str] = "PLANETARY_COMPUTER"
    satellite: Optional[str] = "Sentinel-2"
    max_cloud_cover: Optional[float] = 20.0
    resolution: Optional[str] = None

class SatelliteSceneResponse(BaseModel):
    id: str
    disaster_id: Optional[str] = None
    provider: str
    satellite: str
    product_id: str
    acquisition_date: datetime
    cloud_cover: float
    resolution: str
    sensor_type: str
    bands_count: int
    file_size: str
    bbox: Optional[List[float]] = None
    geometry: Optional[Dict[str, Any]] = None
    image_path: Optional[str] = None
    thumbnail_path: Optional[str] = None
    metadata_json: Optional[Dict[str, Any]] = None
    processing_status: str

    class Config:
        from_attributes = True

class PreprocessingRequest(BaseModel):
    disaster_id: str
    pre_image_id: Optional[str] = None
    post_image_id: Optional[str] = None
    calculate_mndwi: bool = True
    calculate_ndvi: bool = True
    cloud_masking: bool = True
    resample_resolution: str = "10m"

class PreprocessingResponse(BaseModel):
    job_id: str
    status: str
    stages: List[Dict[str, Any]]
    results: Dict[str, Any]
    processing_time_ms: int
