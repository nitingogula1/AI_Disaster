import os
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.ai_detection_service import ai_detection_service
from app.services.satellite_hub_service import satellite_hub_service
from app.schemas.damage import AIDetectionRequest
from app.schemas.satellite import AIDamageSegmentationRequest
from app.schemas.common import success_response
from app.core.config import settings

router = APIRouter(prefix="/ai", tags=["AI Detection"])

@router.get("/status")
def get_ai_status():
    """Returns AI model and inference engine operational status."""
    return success_response(data={
        "model_name": "ResNet-UNet-v4.2b",
        "framework": "PyTorch",
        "version": "4.2b",
        "status": "READY",
        "last_inference": "14m ago",
        "inference_engine": "TorchScript TensorRT FP16",
        "model_status": "DEMO_MODEL"
    })

@router.post("/damage-segmentation")
def launch_ai_damage_segmentation(payload: AIDamageSegmentationRequest, db: Session = Depends(get_db)):
    """
    Launches asynchronous AI Damage Segmentation.
    Validates pre/post scenes, co-registration, and AI-ready products.
    """
    res = satellite_hub_service.launch_ai_damage_segmentation(
        operation_id=payload.operation_id or "EVT-8821-BGD",
        pre_scene_id=payload.pre_scene_id or "scn-000",
        post_scene_id=payload.post_scene_id or "scn-001",
        model=payload.model or "ResNet-UNet",
        confidence_threshold=payload.confidence_threshold or 0.70,
        db=db
    )
    return success_response(data=res, message="AI Damage Segmentation initiated")

@router.get("/jobs/{job_id}")
def get_ai_job(job_id: str):
    """Returns status and results of an AI damage segmentation job."""
    res = satellite_hub_service.get_ai_job(job_id)
    return success_response(data=res)

@router.post("/damage-detection")
def run_damage_detection(req: AIDetectionRequest, db: Session = Depends(get_db)):
    result = ai_detection_service.run_detection(
        disaster_id=req.disaster_id,
        model_name=req.model_name or "SIAMESE",
        confidence_threshold=req.confidence_threshold or 0.85,
        db=db
    )
    return success_response(data=result, message="AI inference completed successfully")

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
        detail=f"AI mask raster data for operation '{operation_id}' does not exist on disk. Run AI raster segmentation pipeline first."
    )
