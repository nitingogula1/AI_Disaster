import time
import uuid
import requests
from typing import List, Dict, Any, Optional, Tuple, Union
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.core.logging import logger
from app.models.damage import BuildingFootprint

OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]

def parse_bbox(bbox: Union[Tuple[float, float, float, float], List[float], Dict[str, float]]) -> Tuple[float, float, float, float]:
    """
    Parses bbox into (south, west, north, east) / (min_lat, min_lon, max_lat, max_lon).
    Accepts tuple/list or dict with south/west/north/east or min_lat/min_lon/max_lat/max_lon.
    """
    if isinstance(bbox, dict):
        south = bbox.get("south", bbox.get("min_lat"))
        west = bbox.get("west", bbox.get("min_lon"))
        north = bbox.get("north", bbox.get("max_lat"))
        east = bbox.get("east", bbox.get("max_lon"))
        if None in (south, west, north, east):
            raise ValueError(f"Incomplete bbox dictionary: {bbox}")
        return float(south), float(west), float(north), float(east)
    elif isinstance(bbox, (list, tuple)) and len(bbox) == 4:
        return float(bbox[0]), float(bbox[1]), float(bbox[2]), float(bbox[3])
    else:
        raise ValueError(f"Invalid bbox format. Expected (south, west, north, east) or [min_lat, min_lon, max_lat, max_lon], got {bbox}")

def calculate_polygon_centroid_and_area(coords: List[List[float]]) -> Tuple[float, float, float]:
    """
    Computes (centroid_lat, centroid_lon, area_sqm) using approximate spherical/planar math.
    coords is list of [lon, lat].
    """
    if not coords or len(coords) < 3:
        return 0.0, 0.0, 0.0
    
    lons = [p[0] for p in coords]
    lats = [p[1] for p in coords]
    centroid_lon = sum(lons) / len(lons)
    centroid_lat = sum(lats) / len(lats)
    
    try:
        from shapely.geometry import Polygon
        poly = Polygon(coords)
        import math
        cos_lat = math.cos(math.radians(centroid_lat))
        area_sqm = poly.area * (111000.0 * 111000.0 * cos_lat)
        return float(centroid_lat), float(centroid_lon), float(max(area_sqm, 0.0))
    except Exception:
        return float(centroid_lat), float(centroid_lon), 0.0

def fetch_building_footprints(
    bbox: Union[Tuple[float, float, float, float], List[float], Dict[str, float]],
    disaster_id: Optional[str] = None,
    db: Optional[Session] = None,
    max_buildings: int = 500
) -> Dict[str, Any]:
    """
    Queries OpenStreetMap Overpass API for building footprints within the specified bbox.
    Stores extracted polygons in the building_footprints database table if db session is provided.
    
    Handles Overpass rate limits (HTTP 429), timeouts, and empty results gracefully.
    """
    try:
        south, west, north, east = parse_bbox(bbox)
    except Exception as e:
        logger.error(f"Invalid bbox provided to fetch_building_footprints: {e}")
        return {
            "status": "ERROR",
            "message": str(e),
            "count": 0,
            "footprints": []
        }

    if south >= north or west >= east:
        return {
            "status": "ERROR",
            "message": f"Malformed bbox coordinates: south={south} >= north={north} or west={west} >= east={east}",
            "count": 0,
            "footprints": []
        }

    overpass_query = f"""[out:json][timeout:25];
(
  way["building"]({south},{west},{north},{east});
);
out geom {max_buildings};
"""

    headers = {
        "User-Agent": "SentinelAid-DisasterResponse/1.0 (disaster-response-system; contact: ops@sentinelaid.internal)",
        "Accept": "application/json"
    }

    response_data = None
    last_error = None

    for endpoint in OVERPASS_ENDPOINTS:
        for attempt in range(2):
            try:
                resp = requests.post(
                    endpoint,
                    data={"data": overpass_query},
                    headers=headers,
                    timeout=30
                )
                if resp.status_code == 200:
                    response_data = resp.json()
                    break
                elif resp.status_code in (429, 504, 502):
                    logger.warning(f"Overpass endpoint {endpoint} returned status {resp.status_code}. Retrying...")
                    time.sleep(1.5 * (attempt + 1))
                else:
                    logger.warning(f"Overpass endpoint {endpoint} returned unexpected status {resp.status_code}: {resp.text[:100]}")
                    break
            except requests.exceptions.RequestException as re:
                last_error = str(re)
                logger.warning(f"Request exception connecting to {endpoint}: {re}")
                time.sleep(1.0)
        if response_data is not None:
            break

    if response_data is None:
        logger.error(f"All Overpass endpoints failed or timed out: {last_error}")
        return {
            "status": "RATE_LIMITED_OR_UNAVAILABLE",
            "message": f"Overpass API temporarily rate-limited or unavailable: {last_error}",
            "count": 0,
            "footprints": []
        }

    elements = response_data.get("elements", [])
    if not elements:
        return {
            "status": "SUCCESS",
            "message": "Zero building footprints found in specified bounding box.",
            "count": 0,
            "footprints": []
        }

    footprints = []
    new_db_records = []

    for elem in elements:
        if elem.get("type") != "way" or "geometry" not in elem:
            continue
        
        osm_id = str(elem.get("id"))
        tags = elem.get("tags", {})
        name = tags.get("name") or tags.get("addr:housename") or f"Building OSM-{osm_id}"
        
        raw_pts = elem.get("geometry", [])
        if len(raw_pts) < 3:
            continue
        
        coords = [[float(pt["lon"]), float(pt["lat"])] for pt in raw_pts]
        if coords[0] != coords[-1]:
            coords.append(coords[0])
            
        centroid_lat, centroid_lon, area_sqm = calculate_polygon_centroid_and_area(coords)
        
        geojson_geom = {
            "type": "Polygon",
            "coordinates": [coords]
        }
        
        footprint_dict = {
            "osm_id": osm_id,
            "name": name,
            "geometry": geojson_geom,
            "properties": tags,
            "centroid_lat": centroid_lat,
            "centroid_lon": centroid_lon,
            "area_sqm": area_sqm,
            "source": "OSM_OVERPASS"
        }
        footprints.append(footprint_dict)

        if db is not None:
            existing = None
            if disaster_id:
                existing = db.query(BuildingFootprint).filter(
                    BuildingFootprint.disaster_id == disaster_id,
                    BuildingFootprint.osm_id == osm_id
                ).first()
            else:
                existing = db.query(BuildingFootprint).filter(
                    BuildingFootprint.osm_id == osm_id
                ).first()
                
            if not existing:
                rec = BuildingFootprint(
                    id=str(uuid.uuid4()),
                    disaster_id=disaster_id,
                    osm_id=osm_id,
                    name=name,
                    geometry=geojson_geom,
                    properties=tags,
                    centroid_lat=centroid_lat,
                    centroid_lon=centroid_lon,
                    area_sqm=area_sqm,
                    source="OSM_OVERPASS",
                    created_at=datetime.now(timezone.utc)
                )
                new_db_records.append(rec)

    if db is not None and new_db_records:
        try:
            db.add_all(new_db_records)
            db.commit()
            logger.info(f"Persisted {len(new_db_records)} new building footprints to database.")
        except Exception as e:
            db.rollback()
            logger.error(f"Error persisting building footprints to database: {e}")

    return {
        "status": "SUCCESS",
        "count": len(footprints),
        "persisted_count": len(new_db_records),
        "footprints": footprints
    }
