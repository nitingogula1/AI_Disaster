from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.models.incident import Incident

class RescueService:
    def calculate_priorities(
        self,
        db: Session,
        disaster_id: str,
        population_weight: float = 0.20,
        damage_weight: float = 0.40,
        water_surge_weight: float = 0.30,
        cutoff_weight: float = 0.10
    ) -> List[Dict[str, Any]]:
        # Curated triage zones matching frontend reference
        zones = [
            {
                "rank": "P1-01",
                "zone": "Zone 4B - Riverview",
                "grid_coords": "21°48'N 89°12'E",
                "structural_damage": "Level 5 Catastrophic - Multi-story collapse",
                "population_at_risk": 1240,
                "population_detail": "380 elderly/children",
                "cutoff_level": "100% Road Cutoff",
                "cutoff_detail": "Water depth 1.6m",
                "recommended_response": "Amphibious Boat + Medevac - Roof staging active",
                "assigned_unit": "RT-02 En Route (12m)",
                "unit_status": "EN_ROUTE",
                "priority": "P1",
                "raw_population": 1240,
                "raw_damage": 5.0,
                "raw_surge": 1.6,
                "raw_cutoff": 1.0
            },
            {
                "rank": "P1-02",
                "zone": "Sector 7 - Central Levee",
                "grid_coords": "21°51'N 89°17'E",
                "structural_damage": "Level 4 Severe Flood - Ground floors fully submerged",
                "population_at_risk": 920,
                "population_detail": "210 in nursing facility",
                "cutoff_level": "95% Road Cutoff",
                "cutoff_detail": "Water depth 1.9m",
                "recommended_response": "Heavy Lift Air Winch Drop - Critical medical transport",
                "assigned_unit": "RT-05 Pending",
                "unit_status": "STANDBY",
                "priority": "P1",
                "raw_population": 920,
                "raw_damage": 4.0,
                "raw_surge": 1.9,
                "raw_cutoff": 0.95
            },
            {
                "rank": "P1-03",
                "zone": "Old Town Island Sector 9",
                "grid_coords": "21°44'N 89°09'E",
                "structural_damage": "Level 5 Structural Shift - Embankment washed away",
                "population_at_risk": 860,
                "population_detail": "Hospital power severed",
                "cutoff_level": "100% Isolated",
                "cutoff_detail": "Debris in channel",
                "recommended_response": "Inflatable SAR Rafts + Patrol - Generator drop required",
                "assigned_unit": "UNASSIGNED",
                "unit_status": "UNASSIGNED",
                "priority": "P1",
                "raw_population": 860,
                "raw_damage": 5.0,
                "raw_surge": 1.4,
                "raw_cutoff": 1.0
            },
            {
                "rank": "P1-04",
                "zone": "East Port Harbor Basin",
                "grid_coords": "21°54'N 89°22'E",
                "structural_damage": "Level 4 Embankment Rupture - Industrial mudflow",
                "population_at_risk": 640,
                "population_detail": "Warehouse workers trapped",
                "cutoff_level": "85% Road Cutoff",
                "cutoff_detail": "Heavy mud blockage",
                "recommended_response": "Tracked All-Terrain (BV-206) - Bulldozer path clearing",
                "assigned_unit": "RT-09 Deployed",
                "unit_status": "DEPLOYED",
                "priority": "P1",
                "raw_population": 640,
                "raw_damage": 4.0,
                "raw_surge": 1.2,
                "raw_cutoff": 0.85
            },
            {
                "rank": "P1-05",
                "zone": "Kalyanpur Canal North",
                "grid_coords": "21°46'N 89°15'E",
                "structural_damage": "Level 4 Surge Overflow - Fast-moving current",
                "population_at_risk": 510,
                "population_detail": "Squatter settlement cluster",
                "cutoff_level": "90% Cutoff",
                "cutoff_detail": "Footbridge collapsed",
                "recommended_response": "Swiftwater Rescue Swimmers - Tethered raft system",
                "assigned_unit": "RT-11 Mobilizing",
                "unit_status": "EN_ROUTE",
                "priority": "P1",
                "raw_population": 510,
                "raw_damage": 4.0,
                "raw_surge": 1.5,
                "raw_cutoff": 0.90
            },
            {
                "rank": "P1-06",
                "zone": "Shilpa Nagar Substation",
                "grid_coords": "21°50'N 89°11'E",
                "structural_damage": "Level 4 Hazmat / Electrocution - Submerged power grid",
                "population_at_risk": 390,
                "population_detail": "Surrounding rowhomes",
                "cutoff_level": "80% Blocked",
                "cutoff_detail": "Live wire danger zone",
                "recommended_response": "Grid Isolation + Armored Evac - Grid shutdown underway",
                "assigned_unit": "RT-04 En Route (18m)",
                "unit_status": "EN_ROUTE",
                "priority": "P1",
                "raw_population": 390,
                "raw_damage": 4.0,
                "raw_surge": 1.1,
                "raw_cutoff": 0.80
            },
            {
                "rank": "P1-07",
                "zone": "Dakshin Para Community Clinic",
                "grid_coords": "21°43'N 89°18'E",
                "structural_damage": "Level 4 Oxygen Depletion - Generator flooded",
                "population_at_risk": 290,
                "population_detail": "45 ICU patients on battery",
                "cutoff_level": "100% Inaccessible",
                "cutoff_detail": "Access bridges swept away",
                "recommended_response": "Helicopter Rooftop Extraction - Portable O2 cylinders drop",
                "assigned_unit": "Air SAR-01 Inbound (8m)",
                "unit_status": "EN_ROUTE",
                "priority": "P1",
                "raw_population": 290,
                "raw_damage": 4.0,
                "raw_surge": 1.3,
                "raw_cutoff": 1.0
            }
        ]

        scored_zones = []
        for z in zones:
            pop_norm = min(z["raw_population"] / 1500.0, 1.0)
            dam_norm = z["raw_damage"] / 5.0
            sur_norm = min(z["raw_surge"] / 2.0, 1.0)
            cut_norm = z["raw_cutoff"]

            score = (
                (pop_norm * population_weight) +
                (dam_norm * damage_weight) +
                (sur_norm * water_surge_weight) +
                (cut_norm * cutoff_weight)
            ) * 100.0

            scored_zones.append({
                "rank": z["rank"],
                "zone": z["zone"],
                "grid_coords": z["grid_coords"],
                "structural_damage": z["structural_damage"],
                "population_at_risk": z["population_at_risk"],
                "population_detail": z["population_detail"],
                "cutoff_level": z["cutoff_level"],
                "cutoff_detail": z["cutoff_detail"],
                "recommended_response": z["recommended_response"],
                "assigned_unit": z["assigned_unit"],
                "unit_status": z["unit_status"],
                "priority": z["priority"],
                "score": round(score, 1),
                "factors": {
                    "population": round(pop_norm, 2),
                    "structural_collapse": round(dam_norm, 2),
                    "water_surge": round(sur_norm, 2),
                    "road_cutoff": round(cut_norm, 2)
                }
            })

        # Sort descending by priority score
        scored_zones.sort(key=lambda x: x["score"], reverse=True)
        return scored_zones

rescue_service = RescueService()
