import os
import uuid
import httpx
from datetime import datetime, timezone
from typing import Optional, List
import rasterio
from rasterio.warp import transform_bounds
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from fastapi.responses import FileResponse, Response, JSONResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.models.satellite import SatelliteScene
from app.services.satellite_hub_service import satellite_hub_service
from app.services.raster_engine import raster_engine
from app.schemas.satellite import (
    AOIRequest,
    STACSearchRequest,
    AssignRoleRequest,
    IngestRequest,
    PreprocessingPipelineRequest,
    RenderRGBRequest,
    RenderFalseColorRequest,
    VectorizeFloodRequest,
    SendToGISRequest,
    PreprocessingRequest,
    PreprocessingResponse,
    FloodAnalysisExecutionRequest,
    IndexRequest,
    CompareScenesRequest
)
from app.schemas.common import success_response

router = APIRouter(prefix="/satellite", tags=["Satellite"])

# -------------------------------------------------------------
# 1. Target AOI
# -------------------------------------------------------------
@router.post("/aoi")
def set_target_aoi(payload: AOIRequest, db: Session = Depends(get_db)):
    """Validates and stores the satellite target AOI bounding box."""
    try:
        result = satellite_hub_service.set_aoi(
            operation_id=payload.operation_id or "EVT-8821-BGD",
            bbox=payload.bbox,
            db=db,
            region=payload.region,
            incident_name=payload.incident_name
        )
        return success_response(data=result, message="Target AOI configured successfully")
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))

@router.get("/aoi")
def get_target_aoi(operation_id: str = "EVT-8821-BGD", db: Session = Depends(get_db)):
    """Returns the current target AOI bounding box and spatial representation."""
    op_data = satellite_hub_service.get_active_operation(db, operation_id)
    bbox_dict = op_data.get("target_bbox", {})
    min_lon = bbox_dict.get("min_lon", 89.310)
    min_lat = bbox_dict.get("min_lat", 21.540)
    max_lon = bbox_dict.get("max_lon", 90.040)
    max_lat = bbox_dict.get("max_lat", 22.120)

    return success_response(data={
        "operation_id": op_data.get("id", operation_id),
        "bbox": [min_lon, min_lat, max_lon, max_lat],
        "target_bbox": bbox_dict,
        "region": op_data.get("region", "Delta Sector 4"),
        "crs": op_data.get("crs", "EPSG:32645 (WGS 84 / UTM 45N)")
    })

# -------------------------------------------------------------
# 2. Provider Connectivity
# -------------------------------------------------------------
@router.post("/providers/planetary-computer/connect")
async def connect_planetary_computer(db: Session = Depends(get_db)):
    """Verifies Microsoft Planetary Computer connectivity and status."""
    res = await satellite_hub_service.connect_planetary_computer(db)
    return success_response(data=res)

@router.get("/test-planetary-computer")
async def test_planetary_computer():
    """Verifies live Microsoft Planetary Computer STAC API connectivity and real search metadata."""
    stac_url = (settings.PLANETARY_COMPUTER_URL or "https://planetarycomputer.microsoft.com/api/stac/v1").rstrip('/')
    search_url = f"{stac_url}/search"
    collection_name = "sentinel-2-l2a"
    bbox = [72.80, 19.00, 72.95, 19.15]
    date_range = "2025-01-01T00:00:00Z/2026-09-27T23:59:59Z"

    payload = {
        "collections": [collection_name],
        "bbox": bbox,
        "datetime": date_range,
        "limit": 5
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            root_resp = await client.get(stac_url)
            root_resp.raise_for_status()

            search_resp = await client.post(search_url, json=payload)
            search_resp.raise_for_status()

            data = search_resp.json()
            features = data.get("features", [])

            parsed_items = []
            for f in features:
                props = f.get("properties", {})
                assets = f.get("assets", {})
                asset_names = list(assets.keys())

                check_bands = ["B02", "B03", "B04", "B08", "B11", "B12", "SCL"]
                confirmed_bands = {b: (b in assets) for b in check_bands}

                parsed_items.append({
                    "id": f.get("id"),
                    "collection": f.get("collection") or collection_name,
                    "acquisition_datetime": props.get("datetime"),
                    "cloud_cover": props.get("eo:cloud_cover"),
                    "bbox": f.get("bbox"),
                    "available_assets": len(asset_names),
                    "asset_names": asset_names,
                    "confirmed_bands": confirmed_bands
                })

            return {
                "connected": True,
                "stac_url": stac_url,
                "collection": collection_name,
                "result_count": len(parsed_items),
                "items": parsed_items
            }
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "connected": False,
                "stac_url": stac_url,
                "error": str(e),
                "error_type": type(e).__name__
            }
        )


@router.post("/providers/nasa/connect")
async def connect_nasa(db: Session = Depends(get_db)):
    """Verifies NASA Earth Science & CMR STAC connectivity using configured NASA_API_KEY."""
    res = await satellite_hub_service.connect_nasa(db)
    raise NotImplementedError("NASA imagery ingestion is unavailable. EONET event metadata is not satellite imagery.")

@router.get("/providers/nasa/events")
async def get_nasa_disasters(db: Session = Depends(get_db)):
    """Returns live global natural disaster events from NASA EONET and CMR STAC."""
    nasa_prov = satellite_hub_service.get_provider("NASA")
    scenes = await nasa_prov.search(bbox=None)
    return success_response(data=scenes, message=f"Fetched {len(scenes)} live disaster events from NASA")

@router.get("/providers")
def list_satellite_providers(db: Session = Depends(get_db)):
    """Returns configured STAC & catalog satellite providers."""
    providers = satellite_hub_service.get_providers_list(db)
    return success_response(data=providers)

# -------------------------------------------------------------
# 3. STAC Discovery & Catalog Query
# -------------------------------------------------------------
@router.post("/stac/search")
async def search_stac_scenes(payload: STACSearchRequest, db: Session = Depends(get_db)):
    """Queries live STAC catalog, normalizes scene records, and updates database."""
    bbox = payload.bbox
    if bbox is None:
        operation = satellite_hub_service.get_active_operation(db, payload.operation_id)
        target = operation["target_bbox"]
        bbox = [target.get(k) for k in ("min_lon", "min_lat", "max_lon", "max_lat")]
    res = await satellite_hub_service.search_stac(
        operation_id=payload.operation_id or "EVT-8821-BGD",
        bbox=bbox,
        start_datetime=payload.start_datetime,
        end_datetime=payload.end_datetime,
        collections=payload.collections,
        max_cloud_cover=payload.max_cloud_cover,
        limit=payload.limit or 50,
        db=db
    )
    return success_response(data=res, message="STAC catalog search complete")

# -------------------------------------------------------------
# 4. Recent Flood-Relevant Satellite Scenes & Analysis
# -------------------------------------------------------------
@router.get("/flood-scenes")
def get_flood_scenes(
    operation_id: Optional[str] = Query("EVT-8821-BGD"),
    hours: int = Query(72, ge=1, le=720),
    max_cloud_cover: float = Query(30.0, ge=0.0, le=100.0),
    satellites: Optional[str] = Query(None, description="Comma separated platforms e.g. Sentinel-1,Sentinel-2,Landsat"),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Returns recent satellite scenes evaluated for flood relevance for active disaster AOI."""
    sat_list = [s.strip() for s in satellites.split(",")] if satellites else None
    res = satellite_hub_service.get_flood_scenes(
        db=db,
        operation_id=operation_id,
        hours=hours,
        max_cloud_cover=max_cloud_cover,
        satellites=sat_list,
        limit=limit
    )
    return success_response(data=res.get("scenes", []), message=f"Fetched {len(res.get('scenes', []))} flood-relevant satellite scenes")

@router.post("/flood-scenes/search")
async def search_flood_scenes(payload: STACSearchRequest, db: Session = Depends(get_db)):
    return await search_stac_scenes(payload, db)

@router.get("/flood-scenes/events")
def get_flood_disaster_events(db: Session = Depends(get_db)):
    """Returns active flood disaster events with scene statistics."""
    events = satellite_hub_service.get_flood_events(db)
    return success_response(data=events)

@router.post("/scenes/{scene_id}/flood-analysis")
def execute_scene_flood_analysis(
    scene_id: str,
    payload: FloodAnalysisExecutionRequest,
    db: Session = Depends(get_db)
):
    """Measures observed surface water, not new inundation."""
    op_id = payload.operation_id
    method = payload.method
    res = satellite_hub_service.run_scene_flood_analysis(
        scene_id=scene_id,
        operation_id=op_id,
        method=method,
        threshold=payload.threshold,
        db=db
    )
    return success_response(data=res, message="Surface-water analysis completed; new inundation is not assessed")

@router.get("/scenes")
def list_satellite_scenes(
    operation_id: Optional[str] = Query(None),
    cloud_max: Optional[float] = Query(None),
    platform: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    sort: Optional[str] = Query("acquisition_desc"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Lists satellite passes with backend filtering (cloud < 15%, sorting, pagination)."""
    res = satellite_hub_service.list_scenes(
        db=db,
        operation_id=operation_id,
        cloud_max=cloud_max,
        platform=platform,
        date_from=date_from,
        date_to=date_to,
        status=status,
        sort=sort,
        page=page,
        limit=limit
    )
    return success_response(data=res.get("scenes", []))


@router.get("/scenes/{id}")
def get_satellite_scene(id: str, db: Session = Depends(get_db)):
    from app.models.satellite import SatelliteScene
    scene = db.query(SatelliteScene).filter((SatelliteScene.id == id) | (SatelliteScene.scene_id == id)).first()
    if scene:
        return success_response(data={
            "id": scene.scene_id or scene.id,
            "scene_id": scene.scene_id or scene.id,
            "provider": scene.provider,
            "platform": scene.platform,
            "acquisition_date": scene.acquisition_datetime.isoformat() if scene.acquisition_datetime else "",
            "cloud_cover": scene.cloud_cover,
            "resolution": scene.resolution,
            "sensor_type": scene.sensor,
            "bands_count": scene.bands_count,
            "bbox": scene.bbox,
            "processing_status": scene.status,
            "thumbnail_url": scene.thumbnail_url,
            "metadata_json": scene.scene_metadata
        })
    raise HTTPException(status_code=404, detail="Satellite scene not found")

# -------------------------------------------------------------
# 5. Image Previews & Raster Output
# -------------------------------------------------------------
@router.get("/scenes/{id}/preview")
def get_scene_preview(id: str, db: Session = Depends(get_db)):
    """Returns visual thumbnail preview PNG for the specified scene."""
    try:
        png_path = raster_engine.render_rgb(id)
        if os.path.exists(png_path):
            return FileResponse(png_path, media_type="image/png")
    except FileNotFoundError as fnf:
        raise HTTPException(status_code=404, detail=str(fnf))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error rendering preview for scene '{id}': {str(e)}")
    raise HTTPException(status_code=404, detail=f"Preview for scene '{id}' not available")

@router.get("/scenes/{id}/image")
def get_scene_image(id: str, type: str = "rgb", db: Session = Depends(get_db)):
    """Returns preview image rendered according to selected spectral composite or index."""
    try:
        if type == "false_color":
            path = raster_engine.render_false_color(id)
        elif type == "ndwi":
            res = raster_engine.calculate_ndwi(id)
            path = res["preview_path"]
        elif type == "mndwi":
            res = raster_engine.calculate_mndwi(id)
            path = res["preview_path"]
        else:
            path = raster_engine.render_rgb(id)

        if os.path.exists(path):
            return FileResponse(path, media_type="image/png")
    except FileNotFoundError as fnf:
        raise HTTPException(status_code=404, detail=str(fnf))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error rendering image for scene '{id}': {str(e)}")
    raise HTTPException(status_code=404, detail=f"Image product '{type}' for scene '{id}' not found")

@router.get("/previews/{filename}")
def get_preview_file(filename: str):
    """Serves generated raster previews, mask overlays, and thumbnails."""
    safe_name = os.path.basename(filename)
    for folder in [raster_engine.previews_dir, settings.UPLOAD_DIR]:
        path = os.path.join(folder, safe_name)
        if os.path.isfile(path):
            return FileResponse(path, media_type="image/png")
    raise HTTPException(status_code=404, detail=f"Preview file '{safe_name}' not found")

@router.post("/compare")
def compare_satellite_scenes(payload: CompareScenesRequest, db: Session = Depends(get_db)):
    """Aligns pre- and post-disaster rasters, measures surface water from actual pixels, and calculates new inundation."""
    try:
        result = raster_engine.compare_scenes(
            pre_scene_id=payload.pre_scene_id,
            post_scene_id=payload.post_scene_id,
            method=payload.method or "MNDWI",
            threshold=payload.threshold if payload.threshold is not None else 0.05
        )
        return success_response(data=result, message="Flood comparison calculated successfully from raster pixels")
    except FileNotFoundError as fnf:
        raise HTTPException(status_code=404, detail=str(fnf))
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except NotImplementedError as nie:
        raise HTTPException(status_code=501, detail=str(nie))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Flood comparison failed: {str(e)}")

# -------------------------------------------------------------
# 6. Direct Ingestion & Roles
# -------------------------------------------------------------
@router.post("/scenes/{id}/assign-role")
def assign_scene_role(id: str, payload: AssignRoleRequest, db: Session = Depends(get_db)):
    """Assigns scene to PRE_DISASTER reference baseline or POST_DISASTER target."""
    res = satellite_hub_service.assign_scene_role(
        scene_id=id,
        operation_id=payload.operation_id or "EVT-8821-BGD",
        role=payload.role,
        db=db
    )
    return success_response(data=res, message=f"Scene {id} assigned to {payload.role}")

@router.post("/scenes/{id}/ingest")
def direct_ingest_scene(id: str, payload: IngestRequest, db: Session = Depends(get_db)):
    """Triggers asynchronous ingestion job for the given scene."""
    res = satellite_hub_service.direct_ingest(
        scene_id=id,
        operation_id=payload.operation_id or "EVT-8821-BGD",
        scene_role=payload.scene_role or "POST_DISASTER",
        db=db
    )
    return success_response(data=res, message=f"Ingestion job {res['job_id']} queued")

@router.get("/ingestion/queue")
def get_ingestion_queue(db: Session = Depends(get_db)):
    """Returns ingestion batch queue counts (pending, processing, completed, failed) and job list."""
    res = satellite_hub_service.get_ingestion_queue(db)
    return success_response(data=res)

@router.get("/jobs/queue")
def get_batch_queue(
    job_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Batch queue endpoint for ingestion, preprocessing, benchmark, and AI jobs."""
    res = satellite_hub_service.get_ingestion_queue(db)
    return success_response(data=res)

@router.get("/jobs/{job_id}")
def get_job_status(job_id: str, db: Session = Depends(get_db)):
    """Returns status, percentage, stage, and ETA for a specific ingestion job."""
    res = satellite_hub_service.get_job_status(job_id, db)
    return success_response(data=res)

@router.post("/jobs/{job_id}/cancel")
def cancel_job(job_id: str, db: Session = Depends(get_db)):
    """Cancels a queued or running job."""
    res = satellite_hub_service.cancel_job(job_id, db)
    return success_response(data=res)

# -------------------------------------------------------------
# 7. Multispectral Bands & Metadata
# -------------------------------------------------------------
@router.get("/scenes/{id}/bands")
def get_scene_bands(id: str, db: Session = Depends(get_db)):
    """Returns multispectral bands list for Sentinel-2 / satellite scene."""
    bands = satellite_hub_service.get_scene_bands(id, db)
    return success_response(data={"scene_id": id, "bands": bands})

@router.get("/scenes/{id}/bands/{band_name}")
def inspect_scene_band(id: str, band_name: str, db: Session = Depends(get_db)):
    """Inspects a single band: resolution, wavelength, min, max, mean, nodata, histogram."""
    stats = satellite_hub_service.get_band_detail(id, band_name, db)
    return success_response(data=stats)

@router.get("/scenes/{id}/band-summary")
def get_band_summary(id: str, db: Session = Depends(get_db)):
    """Returns bit depth, scale factor, tile dimensions, and CRS for model tensor allocation."""
    summary = satellite_hub_service.get_band_summary(id, db)
    return success_response(data=summary)

# -------------------------------------------------------------
# 8. Spectral Composites & Water Indices
# -------------------------------------------------------------
@router.post("/render/rgb")
def render_rgb_composite(payload: RenderRGBRequest, db: Session = Depends(get_db)):
    """Generates True Color RGB composite (B04, B03, B02)."""
    res = satellite_hub_service.render_rgb(
        scene_id=payload.scene_id,
        red=payload.red or "B04",
        green=payload.green or "B03",
        blue=payload.blue or "B02",
        db=db
    )
    return success_response(data=res, message="RGB True Color preview generated")

@router.post("/render/false-color")
def render_false_color_composite(payload: RenderFalseColorRequest, db: Session = Depends(get_db)):
    """Generates False-Color Infrared (B8-B4-B3) composite."""
    res = satellite_hub_service.render_false_color(
        scene_id=payload.scene_id,
        nir=payload.nir or "B08",
        red=payload.red or "B04",
        green=payload.green or "B03",
        db=db
    )
    return success_response(data=res, message="False-Color Infrared preview generated")

@router.post("/indices/ndwi")
def calculate_ndwi_index(payload: IndexRequest, db: Session = Depends(get_db)):
    """Calculates NDWI: (Green - NIR) / (Green + NIR)."""
    scene_id = payload.scene_id
    res = satellite_hub_service.calculate_ndwi(scene_id, db, payload.threshold)
    return success_response(data=res, message="NDWI water index computed")

@router.post("/indices/mndwi")
def calculate_mndwi_index(payload: IndexRequest, db: Session = Depends(get_db)):
    """Calculates Modified NDWI: (Green - SWIR) / (Green + SWIR)."""
    scene_id = payload.scene_id
    res = satellite_hub_service.calculate_mndwi(scene_id, db, payload.threshold)
    return success_response(data=res, message="MNDWI inundation index computed")

@router.post("/flood/vectorize")
def vectorize_flood_inundation(payload: VectorizeFloodRequest, db: Session = Depends(get_db)):
    """Converts water index raster into GeoJSON polygons with area and confidence."""
    res = satellite_hub_service.vectorize_flood(
        scene_id=payload.scene_id,
        threshold=payload.threshold,
        db=db
    )
    return success_response(data=res, message="Flood inundation boundary vectorized successfully")

# -------------------------------------------------------------
# 9. 4-Stage Preprocessing Pipeline
# -------------------------------------------------------------
@router.post("/preprocess")
def run_preprocessing_pipeline(payload: PreprocessingPipelineRequest, db: Session = Depends(get_db)):
    """Executes the automated 4-stage preprocessing pipeline."""
    res = satellite_hub_service.execute_preprocessing(
        operation_id=payload.operation_id or "EVT-8821-BGD",
        scene_id=payload.scene_id,
        stages=payload.stages or ["RADIOMETRIC", "ATMOSPHERIC", "CLOUD_MASK", "COREGISTRATION"],
        db=db
    )
    return success_response(data=res, message="4-stage preprocessing pipeline initiated")

@router.get("/preprocess/jobs/{job_id}")
def get_preprocessing_job_status(job_id: str, db: Session = Depends(get_db)):
    """Returns real-time status and progress for the 4 preprocessing stages."""
    res = satellite_hub_service.get_preprocessing_job(job_id, db)
    return success_response(data=res)

# -------------------------------------------------------------
# 10. GIS Canvas Transfer & Benchmark
# -------------------------------------------------------------
@router.post("/products/{product_id}/send-to-gis")
def send_product_to_gis(product_id: str, payload: Optional[SendToGISRequest] = None, db: Session = Depends(get_db)):
    """Registers satellite raster product with the GIS Disaster Map Canvas."""
    op_id = payload.operation_id if payload and payload.operation_id else "EVT-8821-BGD"
    res = satellite_hub_service.send_to_gis(product_id, op_id, db)
    return success_response(data=res, message=res["message"])

@router.post("/benchmark")
def run_pipeline_benchmark():
    """Runs high-performance raster ingestion, resampling, and spectral benchmark."""
    res = satellite_hub_service.run_benchmark()
    return success_response(data=res, message="Pipeline benchmark executed successfully")

@router.get("/benchmark/{job_id}")
def get_benchmark_results(job_id: str):
    """Returns benchmark latency, throughput, and memory measurements."""
    res = satellite_hub_service.benchmark_jobs.get(job_id) or satellite_hub_service.run_benchmark()
    return success_response(data=res)

# -------------------------------------------------------------
# 11. Legacy Endpoints (Backward Compatibility)
# -------------------------------------------------------------
@router.get("/cloud-status")
def get_cloud_status():
    return success_response(data={"status": "NOT_ASSESSED", "valid": False, "cloud_cover": None, "quality": "Select and analyze a scene"})

@router.get("/search")
async def search_scenes_legacy(
    provider: str = Query("PLANETARY_COMPUTER"),
    satellite: str = Query("Sentinel-2"),
    min_lng: Optional[float] = None,
    min_lat: Optional[float] = None,
    max_lng: Optional[float] = None,
    max_lat: Optional[float] = None,
    start_date: Optional[str] = "",
    end_date: Optional[str] = "",
    max_cloud_cover: float = Query(20.0),
    db: Session = Depends(get_db)
):
    bbox = [min_lng, min_lat, max_lng, max_lat] if all(v is not None for v in [min_lng, min_lat, max_lng, max_lat]) else [89.310, 21.540, 90.040, 22.120]
    res = await satellite_hub_service.search_stac(
        operation_id="EVT-8821-BGD",
        bbox=bbox,
        start_datetime=start_date,
        end_datetime=end_date,
        collections=["sentinel-2-l2a"],
        max_cloud_cover=max_cloud_cover,
        limit=50,
        db=db
    )
    return success_response(data=res.get("scenes", []))


@router.post("/download")
async def download_satellite_scene(payload: dict, db: Session = Depends(get_db)):
    if payload.get("provider", "PLANETARY_COMPUTER") != "PLANETARY_COMPUTER":
        raise NotImplementedError("Only Planetary Computer acquisition is implemented.")
    scene_id = payload.get("product_id")
    if not scene_id:
        raise ValueError("product_id is required.")
    if not db.query(SatelliteScene).filter_by(scene_id=scene_id).first():
        item = await satellite_hub_service.get_provider("PLANETARY_COMPUTER").get_scene(scene_id)
        satellite_hub_service.upsert_scene(item, db)
        db.commit()
    result = satellite_hub_service.direct_ingest(scene_id, payload.get("operation_id", "EVT-8821-BGD"),
                                                 "POST_DISASTER", db)
    return success_response(data=result, message="Download queued; poll job_id for validated completion.")


@router.post("/upload")
async def upload_satellite_image(
    disaster_id: Optional[str] = Form(None),
    image_type: Optional[str] = Form("satellite"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    from pathlib import Path
    from app.services.scene_registry import inspect_raster, register_file
    from app.models.satellite import OperationSatelliteScene
    if Path(file.filename or "").suffix.lower() not in (".tif", ".tiff"):
        raise ValueError("Upload a georeferenced GeoTIFF with named B02, B03, B04, B08, B11 and SCL bands. RGB JPG/PNG is unsupported.")
    sid = "UPLOAD-" + uuid.uuid4().hex
    # User-supplied filenames and disaster IDs never become filesystem path components.
    directory = Path(raster_engine.raw_dir) / "uploads"
    directory.mkdir(parents=True, exist_ok=True)
    dest = directory / (sid + ".tif")
    size = 0
    try:
        with dest.open("wb") as output:
            while chunk := await file.read(1024 * 1024):
                size += len(chunk)
                if size > 500 * 1024 * 1024:
                    raise HTTPException(status_code=413, detail="Maximum upload size is 500 MB.")
                output.write(chunk)
        try:
            info = inspect_raster(dest)
        except rasterio.errors.RasterioError as exc:
            raise ValueError("Invalid or corrupted GeoTIFF raster content.") from exc
        raw_date = info.get("acquisition_datetime")
        acquired = datetime.fromisoformat(raw_date.replace("Z", "+00:00")) if raw_date else None
        scene = SatelliteScene(id=sid, scene_id=sid, product_id=sid, provider="LOCAL", source="UPLOAD",
                               collection="uploaded-dataset", platform="User Upload", sensor="User multispectral dataset",
                               acquisition_datetime=acquired, acquisition_date=acquired, cloud_cover=None,
                               processing_level="USER_DECLARED", disaster_id=disaster_id)
        register_file(scene, dest, "UPLOAD", info["is_demo"])
        db.add(scene)
        if disaster_id:
            db.add(OperationSatelliteScene(scene_id=sid, operation_id=disaster_id, scene_role="TARGET"))
        db.commit()
        return success_response(data={"scene_id": sid, "bands": info["count"], "crs": info["crs"],
                                     "width": info["width"], "height": info["height"], "bbox": info["bbox"],
                                     "acquisition_datetime": acquired.isoformat() if acquired else None,
                                     "is_demo": scene.is_demo, "source": scene.source, "status": "READY"},
                                message="Validated dataset registered. Select it for processing.")
    except Exception:
        db.rollback()
        if dest.exists(): dest.unlink()
        raise
    finally:
        await file.close()

@router.get("/products/{product_id}/{kind}")
def get_product_output(product_id: str, kind: str, db: Session = Depends(get_db)):
    from app.models.satellite import ProcessingResult
    product = db.get(ProcessingResult, product_id)
    if not product:
        raise FileNotFoundError("Analysis product not found.")
    metadata = product.metadata_json or {}
    if kind == "geojson":
        return product.geometry or {"type": "FeatureCollection", "features": []}
    key, media = {"preview": ("preview_path", "image/png"), "mask": ("mask_preview_path", "image/png"),
                  "raster": ("file_path", "image/tiff"), "mask-raster": ("mask_path", "image/tiff")}.get(kind, (None, None))
    if not key or not metadata.get(key) or not os.path.isfile(metadata[key]):
        raise FileNotFoundError("Requested product file is unavailable.")
    return FileResponse(metadata[key], media_type=media)

@router.post("/process")
def process_satellite_imagery(req: PreprocessingRequest, db: Session = Depends(get_db)):
    res = satellite_hub_service.execute_preprocessing(
        operation_id="EVT-8821-BGD",
        scene_id=req.post_image_id or "scn-001",
        stages=["RADIOMETRIC", "ATMOSPHERIC", "CLOUD_MASK", "COREGISTRATION"],
        db=db
    )
    return success_response(data=res)
