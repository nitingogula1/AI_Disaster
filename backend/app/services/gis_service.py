from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.models.disaster import DisasterEvent
from app.models.incident import Incident
from app.models.rescue_team import RescueTeam
from app.models.damage import DamageDetection

class GISService:
    def get_disaster_geojson(self, db: Session, disaster_id: str) -> Dict[str, Any]:
        disaster = db.query(DisasterEvent).filter(DisasterEvent.id == disaster_id).first()
        lat = disaster.latitude if disaster else 21.8412
        lng = disaster.longitude if disaster else 89.5422

        # Inundation polygon around coordinates
        polygon_coords = [
            [lng - 0.04, lat - 0.02],
            [lng + 0.02, lat - 0.03],
            [lng + 0.04, lat + 0.01],
            [lng + 0.02, lat + 0.03],
            [lng - 0.02, lat + 0.02],
            [lng - 0.04, lat - 0.02]
        ]

        features = [
            {
                "type": "Feature",
                "properties": {
                    "layer": "Perimeter",
                    "name": disaster.name if disaster else "Active Disaster Boundary",
                    "severity": disaster.severity if disaster else "CRITICAL",
                    "affected_area_km2": disaster.affected_area if disaster else 1420
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [polygon_coords]
                }
            },
            {
                "type": "Feature",
                "properties": {
                    "layer": "Epicenter",
                    "name": disaster.location_name if disaster else "Ground Zero",
                    "satellite_source": disaster.satellite_source if disaster else "Sentinel-2"
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": [lng, lat]
                }
            }
        ]

        return {
            "type": "FeatureCollection",
            "features": features
        }

    def get_damage_geojson(self, db: Session, disaster_id: str) -> Dict[str, Any]:
        detections = db.query(DamageDetection).filter(DamageDetection.disaster_id == disaster_id).all()
        features = []
        for d in detections:
            features.append({
                "type": "Feature",
                "properties": {
                    "id": d.id,
                    "asset_code": d.asset_code,
                    "location_name": d.location_name,
                    "category": d.category,
                    "damage_grade": d.damage_grade,
                    "damage_class": d.damage_class,
                    "confidence": d.confidence,
                    "flood_depth": d.flood_depth
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": [d.longitude, d.latitude]
                }
            })

        return {
            "type": "FeatureCollection",
            "features": features
        }

    def get_rescue_teams_geojson(self, db: Session) -> Dict[str, Any]:
        teams = db.query(RescueTeam).all()
        features = []
        for t in teams:
            features.append({
                "type": "Feature",
                "properties": {
                    "id": t.id,
                    "team_code": t.team_code,
                    "team_name": t.team_name,
                    "leader": t.leader_name,
                    "status": t.status,
                    "type": t.team_type,
                    "vehicle": t.vehicle_type,
                    "speed": t.speed_knots,
                    "fuel": t.fuel_percent
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": [t.longitude, t.latitude]
                }
            })

        return {
            "type": "FeatureCollection",
            "features": features
        }

    def get_shelters_geojson(self) -> Dict[str, Any]:
        shelters = [
            {"name": "Sector 4 Secondary High Shelter", "coords": [89.54, 21.84], "capacity": 1500, "occupancy": 1240},
            {"name": "Delta Red Crescent Field Hospital", "coords": [89.585, 21.865], "capacity": 300, "occupancy": 280},
            {"name": "North Embankment Cyclone Haven", "coords": [89.51, 21.88], "capacity": 2200, "occupancy": 1950}
        ]
        return {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {
                        "name": s["name"],
                        "capacity": s["capacity"],
                        "occupancy": s["occupancy"],
                        "type": "SHELTER"
                    },
                    "geometry": {
                        "type": "Point",
                        "coordinates": s["coords"]
                    }
                }
                for s in shelters
            ]
        }

gis_service = GISService()
