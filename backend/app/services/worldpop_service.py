import time
import requests
from typing import Dict, Any
from fastapi import HTTPException
from app.core.config import settings
from shapely.geometry import shape, mapping
from shapely.ops import unary_union

class WorldPopService:
    BASE_URL = "https://api.worldpop.org/v2"

    def estimate_population(self, geojson: Dict[str, Any], year: int) -> Dict[str, Any]:
        """
        Submits a population estimate task to WorldPop and polls for the result.
        """
        # Ensure we send a Polygon or MultiPolygon by merging if it's a FeatureCollection or GeometryCollection
        try:
            if geojson.get("type") == "FeatureCollection":
                geometries = [shape(f["geometry"]) for f in geojson.get("features", []) if f.get("geometry")]
                merged = unary_union(geometries)
            elif geojson.get("type") == "GeometryCollection":
                geometries = [shape(g) for g in geojson.get("geometries", [])]
                merged = unary_union(geometries)
            else:
                merged = shape(geojson)
            
            # If the result is something else (like GeometryCollection after union), we just take the polygons
            if merged.geom_type not in ("Polygon", "MultiPolygon"):
                # Filter out points/lines if any, just keep polygons
                if merged.geom_type == "GeometryCollection":
                    polygons = [geom for geom in merged.geoms if geom.geom_type in ("Polygon", "MultiPolygon")]
                    if not polygons:
                        raise HTTPException(status_code=400, detail="No valid polygon geometries found")
                    merged = unary_union(polygons)
                else:
                    raise HTTPException(status_code=400, detail=f"Unsupported geometry type: {merged.geom_type}")
                    
            final_geojson = mapping(merged)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid geometry data: {str(e)}")

        # 1. Submit task
        submit_url = f"{self.BASE_URL}/population"
        payload = {
            "dataset": "wpgp", # WorldPop Global Project
            "year": year,
            "geojson": final_geojson,
            "runasync": True # usually async for api.worldpop.org
        }
        
        try:
            submit_resp = requests.post(submit_url, json=payload, timeout=10)
            submit_resp.raise_for_status()
        except requests.exceptions.RequestException as e:
            raise HTTPException(status_code=502, detail=f"Failed to submit WorldPop task: {str(e)}")

        submit_data = submit_resp.json()
        task_id = submit_data.get("task_id")
        if not task_id:
            raise HTTPException(status_code=502, detail="No task_id returned from WorldPop")

        # 2. Poll for completion
        task_url = f"{self.BASE_URL}/tasks/{task_id}"
        max_retries = 30
        for _ in range(max_retries):
            time.sleep(2)
            try:
                task_resp = requests.get(task_url, timeout=10)
                task_resp.raise_for_status()
            except requests.exceptions.RequestException as e:
                raise HTTPException(status_code=502, detail=f"Failed to poll WorldPop task: {str(e)}")
            
            task_data = task_resp.json()
            status = task_data.get("status")
            
            if status == "success":
                data = task_data.get("result", {})
                return {
                    "population": data.get("total_population", 0),
                    "year": year,
                    "resolution": "100m",
                    "source": data.get("data_source", "WorldPop"),
                    "area_km2": data.get("area_km2") # if returned by worldpop
                }
            elif status == "error":
                error_msg = task_data.get("error", "Unknown error from WorldPop")
                raise HTTPException(status_code=500, detail=f"WorldPop task failed: {error_msg}")
        
        # Timeout
        raise HTTPException(status_code=504, detail="WorldPop task timed out")

worldpop_service = WorldPopService()
