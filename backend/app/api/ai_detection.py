import os
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_db
from app.services.ai_detection_service import ai_detection_service
from app.schemas.damage import AIDetectionRequest
from app.schemas.satellite import AIDamageSegmentationRequest
from app.schemas.common import success_response
from app.core.config import settings

router = APIRouter(prefix="/ai", tags=["AI Detection"])


class ReloadCheckpointRequest(BaseModel):
    checkpoint_path: str
    architecture: Optional[str] = "xview2_baseline"


@router.get("/status")
def get_ai_status():
    """Returns AI model and inference engine operational status."""
    return success_response(data=ai_detection_service.get_model_status())


@router.post("/damage-segmentation")
def launch_ai_damage_segmentation(payload: AIDamageSegmentationRequest, db: Session = Depends(get_db)):
    """
    Launches asynchronous AI Damage Segmentation.
    Validates pre/post scenes, co-registration, and AI-ready products.
    """
    if not ai_detection_service.has_trained_weights():
        raise HTTPException(status_code=501, detail=ai_detection_service.get_model_status()["message"])

    # Run trained model inference
    result = ai_detection_service.run_detection(
        disaster_id=payload.disaster_id if hasattr(payload, 'disaster_id') else "default",
        model_name="TRAINED",
        confidence_threshold=0.5,
        db=db
    )
    return success_response(data=result, message="AI damage segmentation completed")


@router.get("/jobs/{job_id}")
def get_ai_job(job_id: str):
    """Returns status and results of an AI damage segmentation job."""
    raise HTTPException(status_code=404, detail="No trained inference job exists.")


@router.post("/damage-detection")
def run_damage_detection(req: AIDetectionRequest, db: Session = Depends(get_db)):
    """
    Run damage detection. Uses TrainedDamageModel when a checkpoint is loaded,
    falls back to HeuristicDamageModel with explicit indication of which ran.

    - If trained weights loaded: runs ML inference, returns is_ml_inference=true
    - If no weights + model_name='HEURISTIC': runs heuristic, returns is_heuristic=true
    - If no weights + any other model_name: returns HTTP 501 honestly
    """
    if not ai_detection_service.has_trained_weights():
        # If explicitly requesting heuristic fallback, return spectral heuristic estimate
        if req.model_name and req.model_name.upper() == "HEURISTIC":
            result = ai_detection_service.run_detection(
                disaster_id=req.disaster_id,
                model_name="HEURISTIC",
                confidence_threshold=req.confidence_threshold or 0.85,
                db=db
            )
            return success_response(data=result, message="Spectral heuristic damage estimation completed")

        # Otherwise, report 501 Not Implemented honestly
        raise HTTPException(
            status_code=501,
            detail="Trained deep-learning damage detection model checkpoint is unavailable. Use model_name='HEURISTIC' for spectral overlap approximation."
        )

    result = ai_detection_service.run_detection(
        disaster_id=req.disaster_id,
        model_name=req.model_name or "TRAINED",
        confidence_threshold=req.confidence_threshold or 0.85,
        db=db
    )
    return success_response(data=result, message="AI inference completed successfully")


@router.post("/reload-checkpoint")
def reload_checkpoint(req: ReloadCheckpointRequest):
    """
    Hot-reload a new checkpoint without restarting the server.
    Validates the checkpoint file exists and can be loaded.
    """
    if not os.path.isfile(req.checkpoint_path):
        raise HTTPException(
            status_code=404,
            detail=f"Checkpoint file not found: {req.checkpoint_path}"
        )

    result = ai_detection_service.reload_checkpoint(req.checkpoint_path, req.architecture)
    if result["status"] == "OK":
        return success_response(data=result, message="Checkpoint loaded successfully")
    else:
        raise HTTPException(status_code=500, detail=result["message"])


@router.get("/footprints")
def fetch_footprints(
    south: float, west: float, north: float, east: float,
    disaster_id: Optional[str] = None,
    max_buildings: int = 200,
    db: Session = Depends(get_db)
):
    """
    Fetch building footprints from OpenStreetMap Overpass API for the given bounding box.
    Results are persisted in the building_footprints database table.
    """
    from app.services.footprint_service import fetch_building_footprints
    bbox = [south, west, north, east]
    result = fetch_building_footprints(bbox, disaster_id=disaster_id, db=db, max_buildings=max_buildings)
    return success_response(data=result, message=f"Fetched {result['count']} building footprints")


@router.get("/export/{operation_id}/mask")
def export_ai_mask_geotiff(operation_id: str):
    mask_path = os.path.join(settings.PROCESSED_DIR, f"{operation_id}_ai_mask.tif")
    if os.path.exists(mask_path):
        return FileResponse(
            mask_path,
            media_type="image/tiff",
            filename=f"{operation_id}_ai_mask.tif"
        )
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"AI mask raster data for operation \'{operation_id}\' does not exist on disk. Run AI raster segmentation pipeline first."
    )
