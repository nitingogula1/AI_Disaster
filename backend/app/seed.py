import uuid
from datetime import datetime, timezone
from app.core.database import SessionLocal, init_db
from app.core.security import get_password_hash
from app.models.user import User
from app.models.operation import Operation
from app.models.disaster import DisasterEvent
from app.models.incident import Incident
from app.models.satellite import SatelliteScene
from app.models.damage import DamageDetection
from app.models.rescue_team import RescueTeam
from app.models.route import OptimizedRoute
from app.models.alert import Alert
from app.models.report import Report
from app.models.command import TacticalCommand
from app.core.logging import logger

def seed_database():
    logger.info("Initializing database schema...")
    init_db()
    db = SessionLocal()

    try:
        # 1. Seed Users
        existing_admin = db.query(User).filter(User.email == "admin@sentinelaid.gov").first()
        if not existing_admin:
            logger.info("Seeding users...")
            users = [
                User(
                    name="Cmdr. Sarah Jenkins",
                    email="admin@sentinelaid.gov",
                    password_hash=get_password_hash("password"),
                    role="ADMIN",
                    title="Disaster Response Officer",
                    organization="SentinelAid Incident Command",
                    avatar="/assets/commander-jenkins.png"
                ),
                User(
                    name="Officer Jenkins",
                    email="officer.jenkins@sentinelaid.gov",
                    password_hash=get_password_hash("password"),
                    role="DISASTER_OFFICER",
                    title="Disaster Operations Officer",
                    organization="Disaster Management Directorate",
                    avatar="/assets/commander-jenkins.png"
                ),
                User(
                    name="Lt. Marcus Vance",
                    email="rt02.lead@sar.ops",
                    password_hash=get_password_hash("password"),
                    role="RESCUE_TEAM",
                    title="Rescue Team Lead RT-02",
                    organization="Tactical Water Rescue SAR"
                ),
                User(
                    name="Dr. Elena Rostova",
                    email="gis.analyst@sentinelaid.gov",
                    password_hash=get_password_hash("password"),
                    role="GIS_ANALYST",
                    title="Lead Remote Sensing Specialist",
                    organization="Geospatial Analysis Center"
                ),
                User(
                    name="Alex Chen",
                    email="ai.analyst@sentinelaid.gov",
                    password_hash=get_password_hash("password"),
                    role="AI_ANALYST",
                    title="Computer Vision Research Engineer",
                    organization="Deep Learning Defense Lab"
                )
            ]
            db.add_all(users)
            db.commit()

        # 2. Seed Operations
        existing_op = db.query(Operation).filter(Operation.id == "CY-2025-05B").first()
        if not existing_op:
            logger.info("Seeding operations...")
            ops = [
                Operation(
                    id="CY-2025-05B",
                    name="Cyclone Remal",
                    region="Bay Area / Delta Sector 4",
                    severity="CRITICAL",
                    status="ACTIVE",
                    response_phase="Phase 2 Evacuation & Rescue",
                    details="Delta Flash Flood & Structural Impact Response"
                ),
                Operation(
                    id="FL-2025-08A",
                    name="Assam Valley Monsoon",
                    region="Brahmaputra Basin / Sector 2",
                    severity="HIGH",
                    status="MONITORING",
                    response_phase="Phase 1 Logistics & Staging",
                    details="Early Flood Watch"
                )
            ]
            db.add_all(ops)
            db.commit()

        # 3. Seed Disaster Events (ensuring the 4 active disasters total 4,500 km² as in dashboard)
        existing_remal = db.query(DisasterEvent).filter(DisasterEvent.event_code == "EVT-8821-BGD").first()
        if not existing_remal:
            logger.info("Seeding disaster events...")
            disasters = [
                DisasterEvent(
                    id="evt-remal-001",
                    operation_id="CY-2025-05B",
                    event_code="EVT-8821-BGD",
                    name="Cyclone Remal & Estuary Inundation",
                    disaster_type="CYCLONE",
                    severity="CRITICAL",
                    status="ACTIVE",
                    location_name="Bay of Bengal & South Delta Coastline",
                    latitude=21.8412,
                    longitude=89.5422,
                    affected_area=1420.0,
                    affected_population=42000,
                    teams_deployed=12,
                    satellite_source="Sentinel-2 L2A",
                    ai_confidence=98.0,
                    description="Response Active - AI Damage Detected",
                    thumbnail_band="Band 8A / 11 NDWI Overlaid"
                ),
                DisasterEvent(
                    id="evt-srikakulam-002",
                    operation_id="CY-2025-05B",
                    event_code="EVT-3597-SAR",
                    name="srikakulam",
                    disaster_type="FLOOD",
                    severity="CRITICAL",
                    status="ACTIVE",
                    location_name="razam",
                    latitude=21.841,
                    longitude=89.542,
                    affected_area=1200.0,
                    affected_population=24000,
                    teams_deployed=5,
                    satellite_source="Sentinel-2 L2A",
                    ai_confidence=95.0,
                    description="Coastal flash surge inundating agricultural lowland."
                ),
                DisasterEvent(
                    id="evt-nephal-003",
                    operation_id="CY-2025-05B",
                    event_code="EVT-A38C-SAR",
                    name="nephal",
                    disaster_type="CYCLONE",
                    severity="CRITICAL",
                    status="ACTIVE",
                    location_name="dhading",
                    latitude=21.841,
                    longitude=89.542,
                    affected_area=1200.0,
                    affected_population=28000,
                    teams_deployed=6,
                    satellite_source="Sentinel-2 L2A",
                    ai_confidence=96.0,
                    description="High velocity cyclone path impacting coastal infrastructure."
                ),
                DisasterEvent(
                    id="evt-assam-004",
                    operation_id="CY-2025-05B",
                    event_code="EVT-8819-IND",
                    name="Assam Valley Flash Flooding",
                    disaster_type="FLOOD",
                    severity="HIGH",
                    status="ACTIVE",
                    location_name="Brahmaputra Basin, Sector 2",
                    latitude=26.1445,
                    longitude=91.7362,
                    affected_area=680.0,
                    affected_population=18500,
                    teams_deployed=4,
                    satellite_source="Sentinel-1 SAR + Sentinel-2 MSI",
                    ai_confidence=91.0,
                    description="AI Analysis Complete - 4 Rescue Teams Active",
                    thumbnail_band="Dual Polarization SAR VV/VH"
                ),
                DisasterEvent(
                    id="evt-merapi-005",
                    operation_id="CY-2025-05B",
                    event_code="EVT-8815-IDN",
                    name="Mount Merapi Volcanic Ash & Mudflow",
                    disaster_type="WILDFIRE",
                    severity="MEDIUM",
                    status="MONITORING",
                    location_name="Central Highlands, Yogyakarta",
                    latitude=-7.5407,
                    longitude=110.4457,
                    affected_area=240.0,
                    affected_population=8200,
                    teams_deployed=0,
                    satellite_source="Sentinel-2 MSI",
                    ai_confidence=84.0,
                    description="Early Warning Monitoring",
                    thumbnail_band="SWIR Thermal Infrared Radiance"
                )
            ]
            db.add_all(disasters)
            db.commit()

        # 4. Seed Rescue Teams
        if db.query(RescueTeam).count() == 0:
            logger.info("Seeding rescue teams...")
            teams = [
                RescueTeam(
                    id="rt-01-uuid",
                    team_code="RT-01",
                    team_name="Rescue Team RT-01",
                    team_type="Amphibious",
                    status="DEPLOYED",
                    team_size=8,
                    leader_name="Capt. David Thorne",
                    current_location="Zone 4B - South Delta",
                    current_mission="Flood Rescue & Evacuation",
                    mission_id="INC-402",
                    vehicle_type="Amphibious Craft B-14",
                    latitude=21.84,
                    longitude=89.55,
                    speed_knots=18.4,
                    heading_deg=34,
                    fuel_percent=78
                ),
                RescueTeam(
                    id="rt-02-uuid",
                    team_code="RT-02",
                    team_name="Rescue Team RT-02",
                    team_type="Water Rescue",
                    status="EN_ROUTE",
                    team_size=6,
                    leader_name="Lt. Marcus Vance",
                    current_location="En Route to Zone 4B",
                    current_mission="Trishuli Valley Flood Extraction",
                    vehicle_type="Amphibious Craft B-14",
                    latitude=21.850,
                    longitude=89.550,
                    speed_knots=18.4,
                    heading_deg=34,
                    fuel_percent=78
                ),
                RescueTeam(
                    id="rt-03-uuid",
                    team_code="RT-03",
                    team_name="Rescue Team RT-03",
                    team_type="Field Medic",
                    status="ON_SITE",
                    team_size=5,
                    leader_name="Dr. Aris Thorne",
                    current_location="Coastal Hospital #2",
                    current_mission="Medical Evacuation",
                    latitude=21.820,
                    longitude=89.500,
                    fuel_percent=65
                ),
                RescueTeam(
                    id="rt-04-uuid",
                    team_code="RT-04",
                    team_name="Rescue Team RT-04",
                    team_type="Hazmat",
                    status="EN_ROUTE",
                    team_size=7,
                    leader_name="Sgt. Chloe Vance",
                    current_location="En Route to Shilpa Nagar",
                    latitude=21.830,
                    longitude=89.480,
                    fuel_percent=82
                ),
                RescueTeam(
                    id="rt-05-uuid",
                    team_code="RT-05",
                    team_name="Rescue Team RT-05",
                    team_type="Heavy Lift",
                    status="STANDBY",
                    team_size=6,
                    leader_name="Chief Miller",
                    current_location="Command Station Alpha",
                    latitude=21.870,
                    longitude=89.600,
                    fuel_percent=95
                )
            ]
            db.add_all(teams)
            db.commit()

        # 5. Seed Damage Detections
        if db.query(DamageDetection).count() < 10:
            logger.info("Seeding damage detections...")
            damages = [
                DamageDetection(
                    disaster_id="evt-remal-001",
                    asset_code="BLD-8821",
                    location_name="Coastal District Hospital - Wing B",
                    category="Medical",
                    object_type="BUILDING",
                    damage_grade=4,
                    damage_class="SEVERE",
                    failure_mode="Roof Shearing",
                    flood_depth=1.3,
                    flood_type="Surge",
                    confidence=96.4,
                    latitude=21.7439,
                    longitude=89.3068,
                    area=1126.0,
                    rescue_status="ENQUEUED P1-01"
                ),
                DamageDetection(
                    disaster_id="evt-remal-001",
                    asset_code="BRG-0019",
                    location_name="Old Tidal Sluice Causeway Bridge",
                    category="Transport",
                    object_type="ROAD",
                    damage_grade=5,
                    damage_class="DESTROYED",
                    failure_mode="Span Washed Away",
                    flood_depth=2.8,
                    flood_type="Channel",
                    confidence=98.0,
                    latitude=21.7381,
                    longitude=89.2942,
                    area=18400.0,
                    rescue_status="ROUTE SEVERED"
                ),
                DamageDetection(
                    disaster_id="evt-remal-001",
                    asset_code="SCH-0402",
                    location_name="Sector 4 Higher Secondary Shelter",
                    category="Commercial & Municipal",
                    object_type="BUILDING",
                    damage_grade=3,
                    damage_class="MODERATE",
                    failure_mode="Perimeter Breached",
                    flood_depth=0.6,
                    flood_type="Courtyard",
                    confidence=92.1,
                    latitude=21.7512,
                    longitude=89.3120,
                    area=180.0,
                    rescue_status="ENQUEUED P2-06"
                ),
                DamageDetection(
                    disaster_id="evt-remal-001",
                    asset_code="RES-8840",
                    location_name="Riverside Embankment Cluster B (820 units)",
                    category="Residential Buildings",
                    object_type="BUILDING",
                    damage_grade=5,
                    damage_class="DESTROYED",
                    failure_mode="Roof Submerged / Collapsed",
                    flood_depth=2.1,
                    flood_type="High Surge",
                    confidence=96.4,
                    latitude=21.7290,
                    longitude=89.2811,
                    area=820.0,
                    rescue_status="+ Add to Rescue"
                ),
                DamageDetection(
                    disaster_id="evt-remal-001",
                    asset_code="WTR-0114",
                    location_name="Municipal Water Filtration Booster Plant & Grid",
                    category="Power Grids & Water Stations",
                    object_type="INFRASTRUCTURE",
                    damage_grade=2,
                    damage_class="MINOR",
                    failure_mode="Substation Offline",
                    flood_depth=0.2,
                    flood_type="Drainable",
                    confidence=89.5,
                    latitude=21.7588,
                    longitude=89.3245,
                    area=14.0,
                    rescue_status="OPERATIONAL"
                ),
                DamageDetection(
                    disaster_id="evt-remal-001",
                    asset_code="FLD-001",
                    location_name="Delta Inundation Basin",
                    category="Flood",
                    object_type="FLOOD",
                    damage_grade=4,
                    damage_class="SEVERE",
                    failure_mode="MNDWI Inundation Mask",
                    flood_depth=1.8,
                    flood_type="High Surge",
                    confidence=98.0,
                    latitude=21.845,
                    longitude=89.54,
                    area=18600.0,
                    rescue_status="MONITORED"
                )
            ]
            db.add_all(damages)
            db.commit()

        # 6. Seed Incidents (7 Red Zones with 4,850 civilians at risk)
        if db.query(Incident).count() == 0:
            logger.info("Seeding incidents...")
            incidents = [
                Incident(
                    disaster_id="evt-remal-001",
                    incident_code="INC-402",
                    title="Trishuli Secondary School Shelter",
                    description="Access cut off by 1.4m standing delta flash water. 320 civilians reported sheltering on level 2 roof.",
                    incident_type="FLASH_FLOOD",
                    severity="CRITICAL",
                    status="ACTIVE",
                    latitude=21.845,
                    longitude=89.545,
                    population_affected=320,
                    priority_score=96.8,
                    priority_tier="P1"
                ),
                Incident(
                    disaster_id="evt-remal-001",
                    incident_code="INC-403",
                    title="Coastal Hospital #2 ICU Flood",
                    description="Water rising at 45cm/hr threatening generator floor.",
                    incident_type="FACILITY_FLOOD",
                    severity="CRITICAL",
                    status="ACTIVE",
                    latitude=21.820,
                    longitude=89.500,
                    population_affected=140,
                    priority_score=98.2,
                    priority_tier="P1"
                ),
                Incident(
                    disaster_id="evt-remal-001",
                    incident_code="INC-404",
                    title="Embankment Cluster B Islanded",
                    description="Tidal surge isolated 820 residential cluster units.",
                    incident_type="STRANDED_ISLAND",
                    severity="CRITICAL",
                    status="ACTIVE",
                    latitude=21.729,
                    longitude=89.281,
                    population_affected=1850,
                    priority_score=94.5,
                    priority_tier="P1"
                ),
                Incident(
                    disaster_id="evt-remal-001",
                    incident_code="INC-405",
                    title="Sector 7 Secondary Levee Overflow",
                    description="Secondary levee breached, residential areas inundated.",
                    incident_type="LEVEE_BREACH",
                    severity="CRITICAL",
                    status="ACTIVE",
                    latitude=21.785,
                    longitude=89.340,
                    population_affected=940,
                    priority_score=92.0,
                    priority_tier="P1"
                ),
                Incident(
                    disaster_id="evt-remal-001",
                    incident_code="INC-406",
                    title="Highway 10 Bridge Cut Stranded Buses",
                    description="Bypass collapsed leaving transit vehicles trapped between channels.",
                    incident_type="ROAD_CUT",
                    severity="CRITICAL",
                    status="ACTIVE",
                    latitude=21.845,
                    longitude=89.500,
                    population_affected=210,
                    priority_score=91.4,
                    priority_tier="P1"
                ),
                Incident(
                    disaster_id="evt-remal-001",
                    incident_code="INC-407",
                    title="Shilpa Nagar Industrial Worker Colony",
                    description="Flash flood in low-lying employee housing.",
                    incident_type="FLASH_FLOOD",
                    severity="CRITICAL",
                    status="ACTIVE",
                    latitude=21.830,
                    longitude=89.480,
                    population_affected=890,
                    priority_score=89.6,
                    priority_tier="P1"
                ),
                Incident(
                    disaster_id="evt-remal-001",
                    incident_code="INC-408",
                    title="North Embankment Fisherman Hamlet",
                    description="Tidal surge washed out sea-dike access road.",
                    incident_type="COASTAL_SURGE",
                    severity="CRITICAL",
                    status="ACTIVE",
                    latitude=21.870,
                    longitude=89.520,
                    population_affected=500,
                    priority_score=88.5,
                    priority_tier="P1"
                )
            ]
            db.add_all(incidents)
            db.commit()

        # 7. Seed Alerts
        if db.query(Alert).count() == 0:
            logger.info("Seeding alerts...")
            alerts = [
                Alert(
                    disaster_id="CY-2025-05B",
                    alert_type="SATELLITE_INGEST",
                    severity="SATELLITE_INGEST",
                    title="Sentinel-2 L2A Ingestion Completed",
                    message="New satellite pass ingested and preprocessed. Ready for AI damage detection pipeline.",
                    is_read=False
                ),
                Alert(
                    disaster_id="CY-2025-05B",
                    alert_type="WARNING",
                    severity="WARNING",
                    title="Levee Breach Warning - Sector 7",
                    message="Secondary levee overflow projected at 19:40. Rations safe; potable water distributed for 72 hrs.",
                    is_read=False
                ),
                Alert(
                    disaster_id="CY-2025-05B",
                    alert_type="CRITICAL",
                    severity="CRITICAL",
                    title="Bridge Collapse on Arterial HWY-10",
                    message="Sector 3 connector bridge swept away by surge. Route blocked for Unit RT-02. Safe bypass computed via Canal Bypass Rd (+18m ETA).",
                    coordinates_str="21°49'10\"N, 89°14'02\"E",
                    actions_json=[{"label": "View Route", "type": "primary"}],
                    is_read=False
                ),
                Alert(
                    disaster_id="CY-2025-05B",
                    alert_type="HIGH_SURGE",
                    severity="HIGH_SURGE",
                    title="Rapid Water Surge near Coastal Hospital #2",
                    message="Telemetry buoy delta-3 registering +45cm/hr water rise. ICU backup power generators at ground tier vulnerable. Evacuation advisory activated.",
                    actions_json=[
                        {"label": "140 patients needing transfer", "type": "secondary"},
                        {"label": "Assign Unit →", "type": "primary"}
                    ],
                    is_read=False
                )
            ]
            db.add_all(alerts)
            db.commit()

        # 8. Seed Tactical Commands
        if db.query(TacticalCommand).count() == 0:
            cmd = TacticalCommand(
                operation_id="CY-2025-05B",
                issued_by="Cmdr. Sarah Jenkins",
                command="Dispatch rescue team RT-02 to Sector 7",
                command_type="DISPATCH_TEAM",
                status="ACCEPTED",
                executed_at=datetime.now(timezone.utc)
            )
            db.add(cmd)
            db.commit()

        logger.info("Database seeding successfully verified and completed!")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
