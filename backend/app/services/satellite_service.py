"""Compatibility facade over the implemented provider; no synthetic fallbacks."""
from app.services.satellite_providers import PlanetaryComputerProvider, CopernicusProvider, USGSProvider, NASAProvider, LocalDemoProvider
class SatelliteService:
    def __init__(self):
        self.providers = {"PLANETARY_COMPUTER": PlanetaryComputerProvider(), "COPERNICUS": CopernicusProvider(),
                          "USGS": USGSProvider(), "NASA": NASAProvider(), "LOCAL": LocalDemoProvider()}
    def get_provider(self, provider_name):
        if provider_name not in self.providers:
            raise ValueError("Unknown satellite provider.")
        return self.providers[provider_name]
    async def search_scenes(self, provider="PLANETARY_COMPUTER", bbox=None, start_date="", end_date="", max_cloud_cover=20):
        return await self.get_provider(provider).search(bbox, start_date or None, end_date or None,
                                                       max_cloud_cover=max_cloud_cover)
satellite_service = SatelliteService()
