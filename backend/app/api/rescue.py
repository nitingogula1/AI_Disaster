import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.rescue_team import RescueTeam, RescueMission
from app.services.rescue_service import rescue_service
from app.schemas.rescue import RescueTeamBase, RescueTeamResponse, RescuePriorityCalculationRequest, MissionCreate
from app.schemas.common import success_response

router = APIRouter(prefix="/rescue", tags=["Rescue"])

@router.get("/teams")
def list_rescue_teams(status: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(RescueTeam)
    if status and status != "ALL":
        query = query.filter(RescueTeam.status == status)
    teams = query.all()

    items = []
    for t in teams:
        items.append({
            "id": t.team_code or t.id,
            "db_id": t.id,
            "name": t.team_name,
            "type": t.team_type,
            "status": t.status,
            "members": t.team_size,
            "currentLocation": t.current_location,
            "currentMission": t.current_mission or "Flood Rescue & Evacuation",
            "missionId": t.mission_id or "INC-402",
            "vehicleType": t.vehicle_type,
            "gpsPosition": [t.latitude, t.longitude],
            "speed": t.speed_knots,
            "heading": t.heading_deg,
            "fuel": t.fuel_percent
        })
    return success_response(data=items)

@router.get("/teams/{id}")
def get_rescue_team(id: str, db: Session = Depends(get_db)):
    team = db.query(RescueTeam).filter((RescueTeam.id == id) | (RescueTeam.team_code == id)).first()
    if not team:
        raise HTTPException(status_code=404, detail="Rescue team not found")
    return success_response(data=RescueTeamResponse.model_validate(team).model_dump())

@router.patch("/teams/{id}/status")
def update_team_status(id: str, status_val: str = Query(..., alias="status"), db: Session = Depends(get_db)):
    team = db.query(RescueTeam).filter((RescueTeam.id == id) | (RescueTeam.team_code == id)).first()
    if not team:
        raise HTTPException(status_code=404, detail="Rescue team not found")
    team.status = status_val.upper()
    db.commit()
    db.refresh(team)
    return success_response(data={"id": team.id, "status": team.status}, message="Team status updated")

@router.get("/priorities/{disaster_id}")
def _format_priority_zone(p: dict) -> dict:
    return {
        "rank": p["rank"],
        "zone": p["zone"],
        "gridCoords": p.get("grid_coords") or p.get("gridCoords"),
        "grid_coords": p.get("grid_coords") or p.get("gridCoords"),
        "structuralDamage": p.get("structural_damage") or p.get("structuralDamage"),
        "structural_damage": p.get("structural_damage") or p.get("structuralDamage"),
        "populationAtRisk": p.get("population_at_risk") or p.get("populationAtRisk"),
        "population_at_risk": p.get("population_at_risk") or p.get("populationAtRisk"),
        "populationDetail": p.get("population_detail") or p.get("populationDetail"),
        "population_detail": p.get("population_detail") or p.get("populationDetail"),
        "cutoffLevel": p.get("cutoff_level") or p.get("cutoffLevel"),
        "cutoff_level": p.get("cutoff_level") or p.get("cutoffLevel"),
        "cutoffDetail": p.get("cutoff_detail") or p.get("cutoffDetail"),
        "cutoff_detail": p.get("cutoff_detail") or p.get("cutoffDetail"),
        "recommendedResponse": p.get("recommended_response") or p.get("recommendedResponse"),
        "recommended_response": p.get("recommended_response") or p.get("recommendedResponse"),
        "assignedUnit": p.get("assigned_unit") or p.get("assignedUnit"),
        "assigned_unit": p.get("assigned_unit") or p.get("assignedUnit"),
        "unitStatus": p.get("unit_status") or p.get("unitStatus"),
        "unit_status": p.get("unit_status") or p.get("unitStatus"),
        "priority": p["priority"],
        "score": p.get("score", 0.0),
        "factors": p.get("factors", {})
    }

@router.get("/priorities/{disaster_id}")
def get_rescue_priorities(disaster_id: str, db: Session = Depends(get_db)):
    priorities = rescue_service.calculate_priorities(db, disaster_id)
    items = [_format_priority_zone(p) for p in priorities]
    return success_response(data=items)

@router.post("/priorities/calculate")
def calculate_priorities(req: RescuePriorityCalculationRequest, db: Session = Depends(get_db)):
    results = rescue_service.calculate_priorities(
        db,
        req.disaster_id,
        req.population_weight,
        req.damage_weight,
        req.water_surge_weight,
        req.cutoff_weight
    )
    items = [_format_priority_zone(p) for p in results]
    return success_response(data=items, message="AI Priority Matrix re-scored successfully")

@router.get("/missions")
def list_missions(db: Session = Depends(get_db)):
    missions = db.query(RescueMission).all()
    return success_response(data=[
        {
            "id": m.mission_code,
            "title": m.title,
            "status": m.status,
            "priority": m.priority,
            "eta": m.eta_minutes,
            "distance": m.distance_km
        }
        for m in missions
    ])

@router.post("/missions", status_code=status.HTTP_201_CREATED)
def create_mission(req: MissionCreate, db: Session = Depends(get_db)):
    code = f"MIS-{uuid.uuid4().hex[:4].upper()}"
    m = RescueMission(
        mission_code=code,
        incident_id=req.incident_id,
        team_id=req.team_id,
        title=req.title,
        description=req.description,
        destination_latitude=req.destination_latitude,
        destination_longitude=req.destination_longitude,
        priority=req.priority
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    return success_response(data={"id": m.id, "mission_code": m.mission_code}, message="Mission dispatched")

@router.post("/teams", status_code=status.HTTP_201_CREATED)
def create_rescue_team(req: RescueTeamBase, db: Session = Depends(get_db)):
    code = f"RT-{uuid.uuid4().hex[:4].upper()}"
    team = RescueTeam(
        team_code=code,
        team_name=req.team_name,
        leader_name=req.leader_name,
        team_size=req.team_size,
        team_type=req.team_type or "Amphibious",
        status=req.status or "AVAILABLE",
        vehicle_type=req.vehicle_type or "Rescue Boat",
        equipment=req.equipment,
        phone=req.phone
    )
    db.add(team)
    db.commit()
    db.refresh(team)
    return success_response(data=RescueTeamResponse.model_validate(team).model_dump(), message="Rescue team registered")

@router.put("/teams/{id}")
def update_rescue_team(id: str, req: RescueTeamBase, db: Session = Depends(get_db)):
    team = db.query(RescueTeam).filter((RescueTeam.id == id) | (RescueTeam.team_code == id)).first()
    if not team:
        raise HTTPException(status_code=404, detail="Rescue team not found")
    for field, val in req.model_dump(exclude_unset=True).items():
        setattr(team, field, val)
    db.commit()
    db.refresh(team)
    return success_response(data=RescueTeamResponse.model_validate(team).model_dump(), message="Rescue team updated")

@router.patch("/missions/{id}/status")
def update_mission_status(id: str, status_val: str = Query(..., alias="status"), db: Session = Depends(get_db)):
    mission = db.query(RescueMission).filter((RescueMission.id == id) | (RescueMission.mission_code == id)).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Rescue mission not found")
    mission.status = status_val.upper()
    db.commit()
    db.refresh(mission)
    return success_response(data={"id": mission.id, "status": mission.status}, message="Mission status updated")
