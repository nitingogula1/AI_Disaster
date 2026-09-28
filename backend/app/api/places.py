from typing import Optional
from fastapi import APIRouter, Query
from app.services.places_service import places_service
from app.schemas.common import success_response

router = APIRouter(prefix="/places", tags=["Places"])

@router.get("/search")
async def search_places(q: str = Query(..., min_length=1, description="Place name, landmark, city, or coordinates")):
    """Searches for places via Google Geocoding or fallback open provider, with coordinate parsing."""
    result = await places_service.search_places(q)
    return success_response(data=result)

@router.get("/status")
def get_places_status():
    """Reports configuration status of place search providers."""
    return success_response(data={
        "google_maps_configured": places_service.is_google_configured(),
        "provider": "google" if places_service.is_google_configured() else "nominatim_fallback",
        "manual_entry_supported": True,
        "instructions": "Set GOOGLE_MAPS_API_KEY in backend/.env for official Google Places API, or enter coordinates directly."
    })
