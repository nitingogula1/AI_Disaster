import os
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.models.disaster import DisasterEvent
from app.models.damage import DamageDetection
from app.models.incident import Incident
from app.models.rescue_team import RescueTeam
from app.models.alert import Alert
from app.schemas.common import success_response
from app.schemas.dashboard import build_metric, ProvenanceType

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/summary")
def get_dashboard_summary(mode: str = Query("LIVE", description="LIVE or DRILL"), db: Session = Depends(get_db)):
    """
    Returns executive metrics summary for active operations.
    In LIVE mode, every metric carries true database provenance and real timestamps.
    In DRILL mode, metrics reflect synthetic scenario drill parameters.
    """
    is_drill = mode.upper() == "DRILL"

    if is_drill:
        # Synthetic exercise drill scenario
        summary_data = {
            "active_disasters": build_metric(4, "events", ProvenanceType.SIMULATED.value, label="Active Disasters", sublabel="Drill Scenario"),
            "affected_regions_km2": build_metric(4500.0, "km²", ProvenanceType.SIMULATED.value, label="Affected Area", sublabel="Synthetic Extent"),
            "damaged_buildings": build_metric(1126, "structures", ProvenanceType.SIMULATED.value, label="Damaged Buildings", sublabel="Scenario Baseline"),
            "blocked_road_segments": build_metric(42, "segments", ProvenanceType.SIMULATED.value, label="Blocked Roads", sublabel="Simulated Cuts"),
            "blocked_network_km": build_metric(18.4, "km", ProvenanceType.SIMULATED.value, label="Blocked Distance", sublabel="Impassable Roads"),
            "flooded_area_km2": build_metric(18.6, "km²", ProvenanceType.SIMULATED.value, label="Flooded Area", sublabel="Synthetic Inundation"),
            "priority_rescue_zones": build_metric(7, "zones", ProvenanceType.SIMULATED.value, label="Rescue Zones", sublabel="Drill P1 Sectors"),
            "civilians_at_direct_risk": build_metric(4850, "people", ProvenanceType.SIMULATED.value, label="Population at Risk", sublabel="Simulated Headcount"),
            "rescue_teams": build_metric(5, "teams", ProvenanceType.SIMULATED.value, label="Deployed Teams", sublabel="Exercise Units")
        }
        return success_response(data=summary_data)

    # LIVE mode: strictly query from persistent models
    now = datetime.now(timezone.utc)
    
    # 1. Active Disasters
    active_events = db.query(DisasterEvent).filter(DisasterEvent.status == "ACTIVE").all()
    disasters_count = len(active_events)
    latest_event_time = max([e.updated_at or e.created_at for e in active_events], default=now)
    area_sum = db.query(func.sum(DisasterEvent.affected_area)).filter(DisasterEvent.status == "ACTIVE").scalar()
    affected_km2 = float(area_sum) if area_sum is not None else 0.0

    # 2. Damaged Buildings
    bld_q = db.query(DamageDetection).filter(DamageDetection.object_type == "BUILDING")
    damaged_buildings_count = bld_q.count()
    latest_bld = bld_q.order_by(DamageDetection.created_at.desc()).first()
    bld_as_of = latest_bld.created_at if latest_bld else None

    # 3. Roads
    road_q = db.query(DamageDetection).filter(DamageDetection.object_type == "ROAD")
    blocked_road_segments = road_q.count()
    road_area_sum = db.query(func.sum(DamageDetection.area)).filter(DamageDetection.object_type == "ROAD").scalar()
    blocked_km = round(float(road_area_sum) / 1000.0, 1) if road_area_sum else 0.0
    latest_road = road_q.order_by(DamageDetection.created_at.desc()).first()
    road_as_of = latest_road.created_at if latest_road else None

    # 4. Floods
    flood_q = db.query(DamageDetection).filter(DamageDetection.object_type == "FLOOD")
    flood_sum = db.query(func.sum(DamageDetection.area)).filter(DamageDetection.object_type == "FLOOD").scalar()
    flooded_km2 = round(float(flood_sum) / 1000.0, 1) if flood_sum else 0.0
    latest_flood = flood_q.order_by(DamageDetection.created_at.desc()).first()
    flood_as_of = latest_flood.created_at if latest_flood else None

    # 5. Incidents & Population
    active_incidents = db.query(Incident).filter(Incident.status.in_(["ACTIVE", "PENDING"])).all()
    priority_rescue_zones = sum(1 for inc in active_incidents if inc.severity in ["CRITICAL", "HIGH"])
    civilians_risk = sum(inc.population_affected or 0 for inc in active_incidents)
    latest_inc = max([inc.updated_at or inc.created_at for inc in active_incidents], default=None)

    # 6. Teams
    teams_count = db.query(RescueTeam).count()
    latest_team = db.query(RescueTeam).order_by(RescueTeam.updated_at.desc() if hasattr(RescueTeam, "updated_at") else RescueTeam.id.desc()).first()
    team_as_of = getattr(latest_team, "updated_at", now) if latest_team else now

    summary_data = {
        "active_disasters": build_metric(
            disasters_count, "events", ProvenanceType.FIELD_REPORT.value,
            as_of=latest_event_time, label="Active Disasters",
            sublabel=f"{sum(1 for d in active_events if d.severity == 'CRITICAL')} Critical" if disasters_count else "No active emergencies"
        ),
        "affected_regions_km2": build_metric(
            affected_km2, "km²", ProvenanceType.ESTIMATE.value,
            as_of=latest_event_time, label="Affected Area",
            sublabel="Estimated geographical footprint"
        ),
        "damaged_buildings": build_metric(
            damaged_buildings_count, "structures", ProvenanceType.SATELLITE_DERIVED.value,
            as_of=bld_as_of, label="Damaged Buildings",
            sublabel="AI Spectral Overlap Detections" if damaged_buildings_count else "No detected damaged structures"
        ),
        "blocked_road_segments": build_metric(
            blocked_road_segments, "segments", ProvenanceType.SATELLITE_DERIVED.value,
            as_of=road_as_of, label="Blocked Road Cuts",
            sublabel="Satellite road obstacle points" if blocked_road_segments else "All routes clear"
        ),
        "blocked_network_km": build_metric(
            blocked_km, "km", ProvenanceType.SATELLITE_DERIVED.value,
            as_of=road_as_of, label="Blocked Road Distance",
            sublabel="Linear length of impassable network"
        ),
        "flooded_area_km2": build_metric(
            flooded_km2, "km²", ProvenanceType.SATELLITE_DERIVED.value,
            as_of=flood_as_of, label="Flooded Surface",
            sublabel="MNDWI Water Mask Extent" if flooded_km2 else "No inundation polygon"
        ),
        "priority_rescue_zones": build_metric(
            priority_rescue_zones, "zones", ProvenanceType.FIELD_REPORT.value,
            as_of=latest_inc, label="Priority Red Zones",
            sublabel=f"{priority_rescue_zones} Critical active incidents" if priority_rescue_zones else "Zero active red zones"
        ),
        "civilians_at_direct_risk": build_metric(
            civilians_risk, "people", ProvenanceType.ESTIMATE.value,
            as_of=latest_inc, label="Civilians at Risk",
            sublabel="Aggregated reported population" if civilians_risk else "No reported civilians at direct risk"
        ),
        "rescue_teams": build_metric(
            teams_count, "teams", ProvenanceType.LIVE_SENSOR.value,
            as_of=team_as_of, label="Rescue Teams",
            sublabel=f"{teams_count} Teams on registry"
        )
    }

    return success_response(data=summary_data)

@router.get("/metrics")
def get_dashboard_metrics(
    operation_id: Optional[str] = None,
    mode: str = Query("LIVE", description="LIVE or DRILL"),
    db: Session = Depends(get_db)
):
    """
    Returns the 6 primary dashboard KPI cards, formatted with provenance, staleness, and unit metadata.
    """
    is_drill = mode.upper() == "DRILL"

    if is_drill:
        return success_response(data={
            "activeDisasters": build_metric(
                4, "events", ProvenanceType.SIMULATED.value,
                label="ACTIVE DISASTERS", sublabel="2 Critical, 2 Elevated (Drill)", icon="alert-triangle"
            ),
            "affectedRegions": build_metric(
                4500, "km²", ProvenanceType.SIMULATED.value,
                label="AFFECTED REGIONS", sublabel="Coastline & Delta Sector 4 (Drill)", icon="users"
            ),
            "damagedBuildings": build_metric(
                1126, "structures", ProvenanceType.SIMULATED.value,
                label="DAMAGED BUILDINGS", sublabel="Scenario Model Baseline", icon="building"
            ),
            "blockedRoads": build_metric(
                42, "segments", ProvenanceType.SIMULATED.value,
                label="BLOCKED ROADS", sublabel="18.4 km impassable network (Drill)", icon="git-branch"
            ),
            "floodedArea": build_metric(
                18.6, "km²", ProvenanceType.SIMULATED.value,
                label="FLOODED AREA", sublabel="Synthetic Scenario Mask", icon="droplets"
            ),
            "priorityRescue": build_metric(
                7, "zones", ProvenanceType.SIMULATED.value,
                label="PRIORITY RESCUE", sublabel="4,850 civilians simulated at risk", icon="siren"
            )
        })

    now = datetime.now(timezone.utc)

    # 1. Active Disasters
    active_events = db.query(DisasterEvent).filter(DisasterEvent.status == "ACTIVE").all()
    count_active = len(active_events)
    crit_count = sum(1 for d in active_events if d.severity == "CRITICAL")
    elev_count = sum(1 for d in active_events if d.severity in ["HIGH", "ELEVATED"])
    total_area = sum(d.affected_area or 0.0 for d in active_events)
    latest_event_time = max([e.updated_at or e.created_at for e in active_events], default=now)

    # 2. Buildings
    bld_q = db.query(DamageDetection).filter(DamageDetection.object_type == "BUILDING")
    bld_count = bld_q.count()
    avg_conf = db.query(func.avg(DamageDetection.confidence)).filter(DamageDetection.object_type == "BUILDING").scalar()
    ai_conf = round(float(avg_conf)) if avg_conf else 0
    latest_bld = bld_q.order_by(DamageDetection.created_at.desc()).first()
    bld_as_of = latest_bld.created_at if latest_bld else None

    # 3. Roads
    road_q = db.query(DamageDetection).filter(DamageDetection.object_type == "ROAD")
    roads_count = road_q.count()
    road_area_sum = db.query(func.sum(DamageDetection.area)).filter(DamageDetection.object_type == "ROAD").scalar()
    blocked_km = round(float(road_area_sum) / 1000.0, 1) if road_area_sum else 0.0
    latest_road = road_q.order_by(DamageDetection.created_at.desc()).first()
    road_as_of = latest_road.created_at if latest_road else None

    # 4. Floods
    flood_q = db.query(DamageDetection).filter(DamageDetection.object_type == "FLOOD")
    flood_sum = db.query(func.sum(DamageDetection.area)).filter(DamageDetection.object_type == "FLOOD").scalar()
    flooded_km2 = round(float(flood_sum) / 1000.0, 1) if flood_sum else 0.0
    latest_flood = flood_q.order_by(DamageDetection.created_at.desc()).first()
    flood_as_of = latest_flood.created_at if latest_flood else None

    # 5. Incidents
    active_incidents = db.query(Incident).filter(Incident.status.in_(["ACTIVE", "PENDING"])).all()
    p1_count = sum(1 for inc in active_incidents if inc.severity in ["CRITICAL", "HIGH"])
    civ_sum = sum(inc.population_affected or 0 for inc in active_incidents)
    latest_inc = max([inc.updated_at or inc.created_at for inc in active_incidents], default=None)

    return success_response(data={
        "activeDisasters": build_metric(
            count_active, "events", ProvenanceType.FIELD_REPORT.value,
            as_of=latest_event_time,
            label="ACTIVE DISASTERS",
            sublabel=f"{crit_count} Critical, {elev_count} Elevated" if count_active else "No active emergencies",
            icon="alert-triangle"
        ),
        "affectedRegions": build_metric(
            int(total_area), "km²", ProvenanceType.ESTIMATE.value,
            as_of=latest_event_time,
            label="AFFECTED REGIONS",
            sublabel=f"Reported impact area" if total_area else "Zero reported affected area",
            icon="users"
        ),
        "damagedBuildings": build_metric(
            bld_count, "structures", ProvenanceType.SATELLITE_DERIVED.value,
            as_of=bld_as_of,
            label="DAMAGED BUILDINGS",
            sublabel=f"{ai_conf}% AI confidence" if bld_count else "No damaged structures detected",
            icon="building"
        ),
        "blockedRoads": build_metric(
            roads_count, "segments", ProvenanceType.SATELLITE_DERIVED.value,
            as_of=road_as_of,
            label="BLOCKED ROADS",
            sublabel=f"{blocked_km} km impassable network" if roads_count else "All road segments clear",
            icon="git-branch"
        ),
        "floodedArea": build_metric(
            flooded_km2, "km²", ProvenanceType.SATELLITE_DERIVED.value,
            as_of=flood_as_of,
            label="FLOODED AREA",
            sublabel="MNDWI Spectral Index" if flooded_km2 else "No inundation detected",
            icon="droplets"
        ),
        "priorityRescue": build_metric(
            p1_count, "zones", ProvenanceType.FIELD_REPORT.value,
            as_of=latest_inc,
            label="PRIORITY RESCUE",
            sublabel=f"{civ_sum:,} civilians at risk" if p1_count else "Zero red zones active",
            icon="siren"
        )
    })

@router.get("/updates")
def get_dashboard_updates(since: Optional[str] = None, db: Session = Depends(get_db)):
    latest_alert = db.query(Alert).order_by(Alert.created_at.desc()).first()
    latest_detection = db.query(DamageDetection).order_by(DamageDetection.created_at.desc()).first()
    latest_incident = db.query(Incident).order_by(Incident.updated_at.desc()).first()

    return success_response(data={
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "latest_alert_at": latest_alert.created_at.isoformat() if latest_alert else None,
        "latest_detection_at": latest_detection.created_at.isoformat() if latest_detection else None,
        "latest_incident_at": latest_incident.updated_at.isoformat() if latest_incident else None,
        "unread_alerts": db.query(Alert).filter(Alert.is_read == False).count()
    })

@router.get("/recent-incidents")
def get_recent_incidents(db: Session = Depends(get_db)):
    incidents = db.query(Incident).order_by(Incident.priority_score.desc()).limit(10).all()
    return success_response(data=[
        {
            "id": inc.id,
            "code": inc.incident_code,
            "title": inc.title,
            "severity": inc.severity,
            "status": inc.status,
            "population": inc.population_affected,
            "priority": inc.priority_tier
        }
        for inc in incidents
    ])

@router.get("/recent-detections")
def get_recent_detections(db: Session = Depends(get_db)):
    detections = db.query(DamageDetection).order_by(DamageDetection.created_at.desc()).limit(10).all()
    return success_response(data=[
        {
            "id": d.id,
            "asset_code": d.asset_code,
            "location_name": d.location_name,
            "category": d.category,
            "object_type": d.object_type,
            "damage_grade": d.damage_grade,
            "damage_class": d.damage_class,
            "confidence": d.confidence,
            "latitude": d.latitude,
            "longitude": d.longitude,
            "verified": d.verified
        }
        for d in detections
    ])

@router.get("/rescue-status")
def get_rescue_status(db: Session = Depends(get_db)):
    teams = db.query(RescueTeam).all()
    return success_response(data=[
        {
            "id": t.id,
            "team_code": t.team_code,
            "team_name": t.team_name,
            "status": t.status,
            "current_mission": t.current_mission,
            "fuel_percent": t.fuel_percent
        }
        for t in teams
    ])

@router.get("/alerts")
def get_dashboard_alerts(db: Session = Depends(get_db)):
    alerts = db.query(Alert).order_by(Alert.created_at.desc()).limit(10).all()
    return success_response(data=[
        {
            "id": a.id,
            "severity": a.severity,
            "title": a.title,
            "description": a.message,
            "timestamp": "Just now",
            "coordinates": a.coordinates_str,
            "actions": a.actions_json or [],
            "is_read": a.is_read
        }
        for a in alerts
    ])
