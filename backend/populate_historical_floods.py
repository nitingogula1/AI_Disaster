import uuid
from datetime import datetime, timezone
from app.core.database import SessionLocal
from app.models.disaster import DisasterEvent
from app.models.operation import Operation
from app.models.drone import DroneMission, DroneDetection

def populate_historical_floods():
    db = SessionLocal()
    try:
        print("Populating historical flood events...")

        # 1. Operations
        historical_ops = [
            {
                "id": "OP-NEPAL-2024",
                "name": "Nepal Monsoon Floods & Bagmati Basin Surge",
                "region": "Kathmandu Valley & Dhading Sector",
                "severity": "CRITICAL",
                "status": "MONITORING",
                "response_phase": "Phase 3 Recovery & Infrastructure Assessment",
                "details": "Torrential 320mm cloudburst causing catastrophic Bagmati river flooding and landslides across Dhading and Kavre.",
                "target_bbox": {"min_lat": 27.60, "max_lat": 27.85, "min_lon": 85.15, "max_lon": 85.45}
            },
            {
                "id": "OP-PAK-2022",
                "name": "Pakistan Indus River Basin Mega Inundation",
                "region": "Sindh Province & Lake Manchar Basin",
                "severity": "CRITICAL",
                "status": "MONITORING",
                "response_phase": "Phase 4 Post-Disaster Reconstruction",
                "details": "Catastrophic 2022 monsoon flood submerging one-third of Pakistan; Indus River formed 100km inland sea.",
                "target_bbox": {"min_lat": 26.50, "max_lat": 28.50, "min_lon": 67.50, "max_lon": 69.20}
            },
            {
                "id": "OP-BGD-2024",
                "name": "Bangladesh 2024 Feni & Muhuri River Flash Floods",
                "region": "Feni, Cumilla & Sylhet Division",
                "severity": "CRITICAL",
                "status": "MONITORING",
                "response_phase": "Phase 3 Rehabilitation",
                "details": "Severe upstream flash flood engulfing Muhuri and Surma-Kushiyara river corridors, affecting 5.8M people.",
                "target_bbox": {"min_lat": 22.80, "max_lat": 23.25, "min_lon": 91.20, "max_lon": 91.60}
            },
            {
                "id": "OP-IND-WAYANAD",
                "name": "Wayanad 2024 Debris Surge & Torrential Flash Flood",
                "region": "Chooralmala & Meppadi, Kerala",
                "severity": "CRITICAL",
                "status": "MONITORING",
                "response_phase": "Phase 3 Geotechnical Stabilization",
                "details": "572mm precipitation in 48 hours triggered devastating landslide surges and flash mudflows down the Iruvanjippuzha river.",
                "target_bbox": {"min_lat": 11.45, "max_lat": 11.62, "min_lon": 76.05, "max_lon": 76.25}
            },
            {
                "id": "OP-LBY-2023",
                "name": "Storm Daniel Derna Dam Breach & Flash Surge",
                "region": "Wadi Derna Canyon, Cyrenaica, Libya",
                "severity": "CRITICAL",
                "status": "MONITORING",
                "response_phase": "Phase 4 Civil Engineering Reconstruction",
                "details": "Collapse of Abu Mansur and Derna dams releasing a 20-meter tsunami wave through Derna city center.",
                "target_bbox": {"min_lat": 32.70, "max_lat": 32.82, "min_lon": 22.58, "max_lon": 22.70}
            }
        ]

        for op_data in historical_ops:
            existing = db.query(Operation).filter(Operation.id == op_data["id"]).first()
            if not existing:
                db.add(Operation(**op_data))
                print(f"Added Operation: {op_data['name']}")
            else:
                existing.name = op_data["name"]
                existing.region = op_data["region"]
                existing.target_bbox = op_data["target_bbox"]
                existing.details = op_data["details"]

        # 2. Disaster Events
        historical_disasters = [
            {
                "id": "evt-nepal-001",
                "operation_id": "OP-NEPAL-2024",
                "event_code": "EVT-2024-NPL",
                "name": "Nepal 2024 Monsoon Flash Floods & Landslides",
                "disaster_type": "FLOOD",
                "severity": "CRITICAL",
                "status": "HISTORICAL",
                "country": "Nepal",
                "location_name": "Kathmandu Basin, Dhading & Kavrepalanchok",
                "latitude": 27.7172,
                "longitude": 85.3240,
                "affected_area": 1850.0,
                "affected_population": 165000,
                "teams_deployed": 18,
                "satellite_source": "Sentinel-1 SAR VV/VH + Sentinel-2 L2A",
                "ai_confidence": 97.2,
                "thumbnail_band": "Band 8A / 11 NDWI Overlaid",
                "description": "Unprecedented 320mm cloudburst caused Bagmati & Bishnumati river breach, submerging Kathmandu valley wards and blocking Dhading highway."
            },
            {
                "id": "evt-pak-002",
                "operation_id": "OP-PAK-2022",
                "event_code": "EVT-2022-PAK",
                "name": "Pakistan 2022 Indus River Basin Mega Inundation",
                "disaster_type": "FLOOD",
                "severity": "CRITICAL",
                "status": "HISTORICAL",
                "country": "Pakistan",
                "location_name": "Sindh Province & Lake Manchar, Indus Valley",
                "latitude": 27.5590,
                "longitude": 68.2120,
                "affected_area": 32000.0,
                "affected_population": 33000000,
                "teams_deployed": 45,
                "satellite_source": "Sentinel-1 SAR C-Band",
                "ai_confidence": 98.6,
                "thumbnail_band": "SAR Dual Polarization VV/VH",
                "description": "Historic monster monsoon flood that submerged 1/3 of Pakistan, creating a 100km wide inland lake across Sindh."
            },
            {
                "id": "evt-feni-003",
                "operation_id": "OP-BGD-2024",
                "event_code": "EVT-2024-BGD",
                "name": "Bangladesh 2024 Feni & Muhuri River Flash Floods",
                "disaster_type": "FLOOD",
                "severity": "CRITICAL",
                "status": "HISTORICAL",
                "country": "Bangladesh",
                "location_name": "Feni, Cumilla & Sylhet Division",
                "latitude": 23.0159,
                "longitude": 91.3976,
                "affected_area": 2100.0,
                "affected_population": 5800000,
                "teams_deployed": 14,
                "satellite_source": "Sentinel-1 SAR + PlanetScope",
                "ai_confidence": 96.4,
                "thumbnail_band": "NDWI + High-Res Optical",
                "description": "Upstream catchment discharge caused extreme Muhuri levee overtopping, isolating 12 Upazilas for 8 days."
            },
            {
                "id": "evt-wayanad-004",
                "operation_id": "OP-IND-WAYANAD",
                "event_code": "EVT-2024-WYD",
                "name": "Wayanad 2024 Torrential Debris Surge & Mudflow",
                "disaster_type": "FLOOD",
                "severity": "CRITICAL",
                "status": "HISTORICAL",
                "country": "India",
                "location_name": "Meppadi & Chooralmala, Wayanad, Kerala",
                "latitude": 11.5332,
                "longitude": 76.1558,
                "affected_area": 380.0,
                "affected_population": 12400,
                "teams_deployed": 8,
                "satellite_source": "Sentinel-2 MSI + ALOS PALSAR",
                "ai_confidence": 94.8,
                "thumbnail_band": "SWIR Debris Flow Mask",
                "description": "572mm precipitation triggered massive mudflow down Iruvanjippuzha river, wiping out Chooralmala bridge."
            },
            {
                "id": "evt-libya-005",
                "operation_id": "OP-LBY-2023",
                "event_code": "EVT-2023-LBY",
                "name": "Libya Storm Daniel Derna Dam Collapse Catastrophe",
                "disaster_type": "FLOOD",
                "severity": "CRITICAL",
                "status": "HISTORICAL",
                "country": "Libya",
                "location_name": "Wadi Derna Canyon, Cyrenaica",
                "latitude": 32.7667,
                "longitude": 22.6367,
                "affected_area": 940.0,
                "affected_population": 44000,
                "teams_deployed": 10,
                "satellite_source": "Sentinel-2 MSI + WorldView-3",
                "ai_confidence": 99.1,
                "thumbnail_band": "Pre/Post Disaster Differential",
                "description": "Structural dam failure created 20m high catastrophic wave surging through Derna city into the Mediterranean."
            }
        ]

        for d_data in historical_disasters:
            existing = db.query(DisasterEvent).filter(
                (DisasterEvent.id == d_data["id"]) | (DisasterEvent.event_code == d_data["event_code"])
            ).first()
            if not existing:
                db.add(DisasterEvent(**d_data))
                print(f"Added DisasterEvent: {d_data['name']}")
            else:
                existing.name = d_data["name"]
                existing.location_name = d_data["location_name"]
                existing.latitude = d_data["latitude"]
                existing.longitude = d_data["longitude"]
                existing.affected_area = d_data["affected_area"]
                existing.affected_population = d_data["affected_population"]
                existing.satellite_source = d_data["satellite_source"]
                existing.description = d_data["description"]
                existing.status = d_data["status"]

        # Clean up any misspelled/test records
        misspelled = db.query(DisasterEvent).filter(DisasterEvent.name.in_(["nephal", "srikakulam"])).all()
        for m in misspelled:
            if m.name == "nephal":
                m.name = "Nepal Dhading Monsoon Inundation"
                m.country = "Nepal"
                m.latitude = 27.7172
                m.longitude = 85.3240
                m.disaster_type = "FLOOD"
                m.status = "HISTORICAL"
            elif m.name == "srikakulam":
                m.name = "Srikakulam Nagavali River Coastal Flood"
                m.country = "India"
                m.latitude = 18.2969
                m.longitude = 83.8968
                m.status = "HISTORICAL"

        # 3. Add Drone Mission for Nepal Bagmati River
        existing_nepal_msn = db.query(DroneMission).filter(DroneMission.id == "drn-msn-nepal").first()
        if not existing_nepal_msn:
            nepal_msn = DroneMission(
                id="drn-msn-nepal",
                mission_code="UAV-NPL-BAGMATI",
                mission_name="Nepal Bagmati Basin & Balkhu Flash Flood Drone Recon",
                disaster_id="evt-nepal-001",
                drone_model="DJI Matrice 300 RTK + Zenmuse P1 / L1 LiDAR",
                flight_altitude_m=70.0,
                gsd_cm_px=2.8,
                sensor_type="RGB_NIR_LIDAR",
                status="COMPLETED",
                target_sector="Bagmati River Corridor - Balkhu Underpass Sector",
                latitude=27.6850,
                longitude=85.2950,
                coverage_area_sqm=185000.0,
                water_surface_elevation_m=1298.40,
                baseline_ground_elevation_m=1296.20,
                max_water_depth_m=2.20,
                avg_water_depth_m=1.45,
                flood_footprint_sqm=84200.0,
                total_survivors_detected=62,
                blocked_routes_detected=4,
                deep_learning_model="YOLOv8-Seg (Survivors) + SegFormer-B4 (Inundation DSM)",
                ai_confidence=98.1,
                orthomosaic_url="/static/drone/ortho_nepal.png",
                dsm_url="/static/drone/dsm_nepal.png"
            )
            db.add(nepal_msn)
            db.commit()

            # Add detections for Nepal
            detections = [
                DroneDetection(
                    id="drn-det-npl-001",
                    mission_id=nepal_msn.id,
                    detection_type="SURVIVOR_CLUSTER",
                    title="Balkhu Vegetable Market Rooftop Cluster",
                    description="42 vendors and residents stranded on 2nd-floor terrace above 1.9m turbulent Bagmati flood waters.",
                    confidence=0.985,
                    latitude=27.6842,
                    longitude=85.2945,
                    elevation_m=1298.2,
                    water_depth_m=1.90,
                    headcount=42,
                    is_rescued=False,
                    geometry={"type": "Point", "coordinates": [85.2945, 27.6842]},
                    metadata_json={"priority": "CRITICAL_IMMEDIATE", "structure": "REINFORCED_CONCRETE"}
                ),
                DroneDetection(
                    id="drn-det-npl-002",
                    mission_id=nepal_msn.id,
                    detection_type="SURVIVOR_CLUSTER",
                    title="Dhading Riverside Secondary School Roof",
                    description="20 students and teachers trapped by swollen tributary; access road completely washed out.",
                    confidence=0.978,
                    latitude=27.6870,
                    longitude=85.2965,
                    elevation_m=1297.8,
                    water_depth_m=2.10,
                    headcount=20,
                    is_rescued=False,
                    geometry={"type": "Point", "coordinates": [85.2965, 27.6870]},
                    metadata_json={"priority": "HIGH", "structure": "SCHOOL_MAIN_BLOCK"}
                ),
                DroneDetection(
                    id="drn-det-npl-003",
                    mission_id=nepal_msn.id,
                    detection_type="BLOCKED_ROAD",
                    title="Balkhu Ring Road Underpass Inundation",
                    description="2.20m deep raging water covering arterial ring road; completely impassable for emergency vehicles.",
                    confidence=0.992,
                    latitude=27.6835,
                    longitude=85.2930,
                    elevation_m=1295.6,
                    water_depth_m=2.20,
                    headcount=0,
                    is_rescued=False,
                    passable_for="NONE_IMPASSABLE",
                    road_segment_name="Kathmandu Ring Road - Balkhu Sector",
                    geometry={"type": "LineString", "coordinates": [[85.2920, 27.6830], [85.2940, 27.6840]]}
                )
            ]
            db.add_all(detections)
            print("Added Nepal Drone Mission and Detections.")

        db.commit()
        print("Historical floods successfully populated in SQLite!")

    except Exception as e:
        db.rollback()
        print(f"Error populating historical floods: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    populate_historical_floods()
