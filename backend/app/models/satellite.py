import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, DateTime, JSON, ForeignKey, Text, Boolean
from app.core.database import Base

class SatelliteProvider(Base):
    __tablename__ = "satellite_providers"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    provider_type = Column(String(50), nullable=False)  # PLANETARY_COMPUTER, COPERNICUS, USGS, NASA, LOCAL
    endpoint = Column(String(255), nullable=True)
    is_enabled = Column(Boolean, default=True)
    status = Column(String(50), default="CONNECTED")  # CONNECTED, DISCONNECTED, NOT_CONFIGURED, READY
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

class SatelliteScene(Base):
    __tablename__ = "satellite_scenes"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    scene_id = Column(String(150), index=True, nullable=False)
    provider_id = Column(String(64), ForeignKey("satellite_providers.id", ondelete="SET NULL"), nullable=True)
    collection = Column(String(100), default="sentinel-2-l2a")
    platform = Column(String(100), nullable=False, default="Sentinel-2B")
    constellation = Column(String(100), nullable=True)
    sensor = Column(String(100), default="MSI Sentinel-2B")
    acquisition_datetime = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    processing_level = Column(String(50), default="L2A")
    cloud_cover = Column(Float, default=0.0)
    resolution = Column(String(50), default="10m")
    bbox = Column(JSON, nullable=True)  # [min_lon, min_lat, max_lon, max_lat]
    geometry = Column(JSON, nullable=True)  # GeoJSON polygon
    crs = Column(String(100), default="EPSG:32645 (WGS 84 / UTM 45N)")
    epsg_code = Column(Integer, default=32645)
    thumbnail_url = Column(String(500), nullable=True)
    asset_metadata = Column(JSON, nullable=True)
    scene_metadata = Column(JSON, nullable=True)
    status = Column(String(50), default="DISCOVERED")  # DISCOVERED, READY, VERIFIED, INGESTING

    # Compatibility fields for existing callers
    disaster_id = Column(String(64), nullable=True)
    product_id = Column(String(150), index=True, nullable=True)
    provider = Column(String(50), nullable=True, default="PLANETARY_COMPUTER")
    satellite = Column(String(50), nullable=True, default="Sentinel-2B")
    acquisition_date = Column(DateTime, nullable=True)
    sensor_type = Column(String(100), default="Optical Multispectral (13 Bands)")
    bands_count = Column(Integer, default=13)
    file_size = Column(String(50), default="514 MB")
    image_path = Column(String(255), nullable=True)
    thumbnail_path = Column(String(255), nullable=True)
    metadata_json = Column(JSON, nullable=True)
    processing_status = Column(String(30), default="Ready")

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

class OperationSatelliteScene(Base):
    __tablename__ = "operation_satellite_scenes"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    operation_id = Column(String(64), nullable=False, index=True)
    scene_id = Column(String(64), nullable=False, index=True)
    scene_role = Column(String(50), nullable=False)  # PRE_DISASTER, POST_DISASTER, REFERENCE, TARGET
    selected = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class SatelliteIngestionJob(Base):
    __tablename__ = "satellite_ingestion_jobs"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    scene_id = Column(String(64), nullable=True, index=True)
    operation_id = Column(String(64), nullable=True, index=True)
    job_id = Column(String(64), unique=True, index=True, nullable=False)
    status = Column(String(50), default="QUEUED")  # QUEUED, DOWNLOADING, VALIDATING, PROCESSING, COMPLETED, FAILED, CANCELLED
    progress = Column(Integer, default=0)
    current_stage = Column(String(100), default="Queued")
    eta_seconds = Column(Integer, default=0)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
    source = Column(String(100), nullable=True)
    output_directory = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

class PreprocessingJob(Base):
    __tablename__ = "preprocessing_jobs"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    scene_id = Column(String(64), nullable=True, index=True)
    operation_id = Column(String(64), nullable=True, index=True)
    job_id = Column(String(64), unique=True, index=True, nullable=False)
    status = Column(String(50), default="QUEUED")  # QUEUED, RUNNING, COMPLETED, FAILED, CANCELLED
    progress = Column(Integer, default=0)
    current_stage = Column(String(100), default="Radiometric Calibration")
    eta_seconds = Column(Integer, default=0)
    stages_data = Column(JSON, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

class SatelliteBand(Base):
    __tablename__ = "satellite_bands"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    scene_id = Column(String(64), nullable=False, index=True)
    band_name = Column(String(50), nullable=False)  # B02, B03, B04, B08, B11, B12, SCL
    common_name = Column(String(100), nullable=True)  # Blue, Green, Red, NIR, SWIR-1, SWIR-2, Quality
    wavelength_nm = Column(String(50), nullable=True)  # "490 nm"
    resolution_m = Column(String(50), nullable=True)  # "10m"
    data_type = Column(String(50), default="UInt16")
    scale_factor = Column(Float, default=0.0001)
    offset = Column(Float, default=0.0)
    asset_path = Column(String(255), nullable=True)
    nodata_value = Column(Float, nullable=True)
    metadata_json = Column(JSON, nullable=True)

class ProcessingResult(Base):
    __tablename__ = "processing_results"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    job_id = Column(String(64), nullable=True, index=True)
    scene_id = Column(String(64), nullable=True, index=True)
    operation_id = Column(String(64), nullable=True, index=True)
    product_type = Column(String(50), nullable=False)  # RGB, FALSE_COLOR, NDVI, NDWI, MNDWI, NBR, CLOUD_MASK, SCL, ALIGNED, RESAMPLED, AI_READY
    file_path = Column(String(255), nullable=True)
    geometry = Column(JSON, nullable=True)
    crs = Column(String(100), default="EPSG:32645")
    resolution = Column(String(50), default="10m")
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class FloodAnalysisResult(Base):
    __tablename__ = "flood_analysis_results"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    scene_id = Column(String(150), nullable=False, index=True)
    operation_id = Column(String(64), nullable=False, index=True)
    method = Column(String(50), nullable=False, default="MNDWI")  # MNDWI, NDWI, SAR Change, SAR Inundation
    flood_area_km2 = Column(Float, default=0.0)
    water_pixels = Column(Integer, default=0)
    flood_relevance_score = Column(Float, default=0.0)
    confidence = Column(Float, default=0.0)
    geojson_path = Column(String(255), nullable=True)
    raster_path = Column(String(255), nullable=True)
    status = Column(String(50), default="COMPLETED")  # COMPLETED, PRELIMINARY, FAILED
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

