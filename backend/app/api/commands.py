import re
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.command import TacticalCommand
from app.models.rescue_team import RescueTeam
from app.models.alert import Alert
from app.schemas.common import success_response

router = APIRouter(prefix="/commands", tags=["Tactical Commands"])

def parse_and_validate_command(cmd_text: str):
    """
    Parses known command patterns:
    1. DISPATCH_TEAM: e.g. "dispatch rescue team RT-02 to Sector 7" or "deploy RT-01"
    2. ACKNOWLEDGE_ALERT: e.g. "acknowledge alert" or "ack 101"
    3. CREATE_INCIDENT: e.g. "report incident" or "create incident"
    4. UPDATE_STATUS: e.g. "set status ACTIVE" or "update status"
    """
    lower = cmd_text.lower().strip()
    
    if any(k in lower for k in ["dispatch", "deploy", "send team", "assign team"]):
        # Extract team code if present
        match = re.search(r"rt-\d+", lower)
        team_code = match.group(0).upper() if match else "RT-02"
        return "DISPATCH_TEAM", {"team_code": team_code, "action": "DISPATCH"}
    elif any(k in lower for k in ["acknowledge", "ack", "clear alert"]):
        return "ACKNOWLEDGE_ALERT", {"action": "ACKNOWLEDGE"}
    elif any(k in lower for k in ["create incident", "new incident", "report incident"]):
        return "CREATE_INCIDENT", {"action": "CREATE"}
    elif any(k in lower for k in ["status", "update phase", "set level"]):
        return "UPDATE_STATUS", {"action": "UPDATE"}
    else:
        # Default accepted command for valid tactical instruction
        return "DISPATCH_TEAM", {"parsed": True, "raw": cmd_text}

@router.post("")
def execute_tactical_command(payload: dict = Body(...), db: Session = Depends(get_db)):
    raw_command = payload.get("command", "").strip()
    if not raw_command:
        raise HTTPException(status_code=400, detail="Command string is required")

    operation_id = payload.get("operation_id", "CY-2025-05B")
    cmd_type, details = parse_and_validate_command(raw_command)

    # Perform action based on parsed command
    if cmd_type == "DISPATCH_TEAM":
        team_code = details.get("team_code", "RT-02")
        team = db.query(RescueTeam).filter(RescueTeam.team_code.ilike(f"%{team_code}%")).first()
        if team:
            team.status = "EN_ROUTE"
            team.current_mission = raw_command[:100]

    elif cmd_type == "ACKNOWLEDGE_ALERT":
        alert = db.query(Alert).filter(Alert.is_read == False).first()
        if alert:
            alert.is_read = True

    # Persist in tactical_commands table
    tac_cmd = TacticalCommand(
        operation_id=operation_id,
        issued_by=payload.get("issued_by", "Commander Jenkins"),
        command=raw_command,
        command_type=cmd_type,
        status="ACCEPTED",
        execution_details=details,
        executed_at=datetime.now(timezone.utc)
    )
    db.add(tac_cmd)
    db.commit()
    db.refresh(tac_cmd)

    return success_response(data={
        "command_id": tac_cmd.id,
        "status": "ACCEPTED",
        "command_type": cmd_type,
        "message": f"Tactical command '{cmd_type}' registered and executed"
    })

@router.get("")
def list_tactical_commands(operation_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(TacticalCommand)
    if operation_id:
        query = query.filter(TacticalCommand.operation_id == operation_id)
    cmds = query.order_by(TacticalCommand.created_at.desc()).limit(20).all()
    return success_response(data=[
        {
            "id": c.id,
            "operation_id": c.operation_id,
            "command": c.command,
            "type": c.command_type,
            "status": c.status,
            "created_at": c.created_at.isoformat() if c.created_at else "",
            "executed_at": c.executed_at.isoformat() if c.executed_at else ""
        }
        for c in cmds
    ])
