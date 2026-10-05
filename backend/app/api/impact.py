from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from app.services.worldpop_service import worldpop_service
from app.schemas.common import success_response

router = APIRouter(prefix="/impact", tags=["Impact"])

class PopulationExposureRequest(BaseModel):
    flood_geojson: Dict[str, Any] = Field(..., description="FeatureCollection or Geometry from the flood comparison")
    year: int = Field(default=2020, description="WorldPop dataset year to query")

@router.post("/population-exposure")
def calculate_population_exposure(request: PopulationExposureRequest):
    # Extract geometries from FeatureCollection
    geojson = request.flood_geojson
    if geojson.get("type") == "FeatureCollection":
        features = geojson.get("features", [])
        if not features:
            raise HTTPException(status_code=400, detail="FeatureCollection is empty")
        
        # We will pass the first feature's geometry, or construct a combined geometry
        # Let's collect all geometries and pass as GeometryCollection, worldpop_service will handle Shapely merge
        geometries = [f.get("geometry") for f in features if f.get("geometry")]
        if not geometries:
            raise HTTPException(status_code=400, detail="No geometries found in features")
        
        geometry_to_submit = {
            "type": "GeometryCollection",
            "geometries": geometries
        }
    else:
        # If it's already a Geometry, just use it
        geometry_to_submit = geojson

    result = worldpop_service.estimate_population(geometry_to_submit, request.year)
    return success_response(result)
