"""Place search provider abstraction supporting Google Geocoding/Places, Coordinate parsing, and Nominatim."""
import re
import math
from typing import List, Dict, Any, Optional
from urllib.parse import quote
import httpx
from pydantic import BaseModel
from app.core.config import settings

class PlaceResult(BaseModel):
    name: str
    latitude: float
    longitude: float
    bbox: List[float]  # [min_lon, min_lat, max_lon, max_lat]
    country: str = ""
    region: str = ""

def parse_coordinates(query: str) -> Optional[PlaceResult]:
    """Detects raw coordinate strings like '22.8456, 89.5403' or '22.8°N, 89.5°E'."""
    pattern = r"^\s*([+-]?\d+(?:\.\d+)?)\s*(?:°|\s*[NSEW])?\s*[,;\s]\s*([+-]?\d+(?:\.\d+)?)\s*(?:°|\s*[NSEW])?\s*$"
    match = re.match(pattern, query.strip(), re.IGNORECASE)
    if not match:
        return None
    try:
        lat = float(match.group(1))
        lon = float(match.group(2))
        if not (-90 <= lat <= 90 and -180 <= lon <= 180):
            return None
        # Default ~0.02 deg bounding box (~2km) around point
        delta = 0.015
        bbox = [
            round(max(-180.0, lon - delta), 4),
            round(max(-90.0, lat - delta), 4),
            round(min(180.0, lon + delta), 4),
            round(min(90.0, lat + delta), 4),
        ]
        return PlaceResult(
            name=f"Coordinates ({lat:.4f}, {lon:.4f})",
            latitude=round(lat, 5),
            longitude=round(lon, 5),
            bbox=bbox,
            country="Manual Coordinates",
            region="Custom AOI"
        )
    except (ValueError, TypeError):
        return None

class PlacesService:
    def __init__(self):
        self.google_key = settings.GOOGLE_MAPS_API_KEY.strip()

    def is_google_configured(self) -> bool:
        return bool(self.google_key)

    async def search_google(self, query: str) -> List[PlaceResult]:
        """Queries Google Geocoding API if key is present."""
        if not self.google_key:
            return []
        url = f"https://maps.googleapis.com/maps/api/geocode/json?address={quote(query)}&key={self.google_key}"
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()

        results = []
        for item in data.get("results", []):
            loc = item["geometry"]["location"]
            lat = float(loc["lat"])
            lon = float(loc["lng"])

            # Use viewport/bounds if available
            viewport = item["geometry"].get("viewport") or item["geometry"].get("bounds")
            if viewport:
                ne = viewport["northeast"]
                sw = viewport["southwest"]
                bbox = [float(sw["lng"]), float(sw["lat"]), float(ne["lng"]), float(ne["lat"])]
            else:
                delta = 0.02
                bbox = [round(lon - delta, 4), round(lat - delta, 4), round(lon + delta, 4), round(lat + delta, 4)]

            country = ""
            region = ""
            for comp in item.get("address_components", []):
                types = comp.get("types", [])
                if "country" in types:
                    country = comp.get("long_name", "")
                elif "administrative_area_level_1" in types or "administrative_area_level_2" in types:
                    region = comp.get("long_name", "")

            results.append(PlaceResult(
                name=item.get("formatted_address", query),
                latitude=lat,
                longitude=lon,
                bbox=bbox,
                country=country,
                region=region
            ))
        return results

    async def search_nominatim(self, query: str) -> List[PlaceResult]:
        """Free OpenStreetMap Nominatim geocoding fallback."""
        url = f"https://nominatim.openstreetmap.org/search?q={quote(query)}&format=json&addressdetails=1&limit=6"
        headers = {"User-Agent": "SentinelAid-AI-Disaster-Response/1.0"}
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, headers=headers)
            resp.raise_for_status()
            items = resp.json()

        results = []
        for item in items:
            lat = float(item["lat"])
            lon = float(item["lon"])
            raw_box = item.get("boundingbox", [])
            if len(raw_box) == 4:
                # Nominatim order: [south, north, west, east]
                s, n, w, e = float(raw_box[0]), float(raw_box[1]), float(raw_box[2]), float(raw_box[3])
                bbox = [w, s, e, n]
            else:
                delta = 0.02
                bbox = [round(lon - delta, 4), round(lat - delta, 4), round(lon + delta, 4), round(lat + delta, 4)]

            addr = item.get("address", {})
            country = addr.get("country", "")
            region = addr.get("state") or addr.get("county") or addr.get("region") or ""

            results.append(PlaceResult(
                name=item.get("display_name", query),
                latitude=lat,
                longitude=lon,
                bbox=bbox,
                country=country,
                region=region
            ))
        return results

    async def search_places(self, query: str) -> Dict[str, Any]:
        """Orchestrates place search across coordinate parser, Google API, or open fallback."""
        query = (query or "").strip()
        if not query:
            return {
                "places": [],
                "provider": "none",
                "google_configured": self.is_google_configured(),
                "message": "Enter a place name, region, or coordinates (e.g. '22.84, 89.54')."
            }

        # 1. Check raw coordinates first
        coord_result = parse_coordinates(query)
        if coord_result:
            return {
                "places": [coord_result.model_dump()],
                "provider": "coordinates",
                "google_configured": self.is_google_configured(),
                "message": "Direct geographic coordinates parsed."
            }

        # 2. Check Google API if configured
        if self.is_google_configured():
            try:
                google_results = await self.search_google(query)
                return {
                    "places": [r.model_dump() for r in google_results],
                    "provider": "google",
                    "google_configured": True,
                    "message": f"Found {len(google_results)} places via Google Geocoding API."
                }
            except Exception as e:
                # Fall through to open fallback if Google fails
                pass

        # 3. Open geocoding fallback
        try:
            nom_results = await self.search_nominatim(query)
            return {
                "places": [r.model_dump() for r in nom_results],
                "provider": "nominatim",
                "google_configured": False,
                "message": "Google Maps API key not configured. Using OpenStreetMap geocoding."
            }
        except Exception as e:
            return {
                "places": [],
                "provider": "manual",
                "google_configured": self.is_google_configured(),
                "message": "Place search service unreachable. Enter coordinates or bounding box manually."
            }

places_service = PlacesService()
