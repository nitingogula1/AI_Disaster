import os
import io
import zipfile
from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.report import Report
from app.models.disaster import DisasterEvent
from app.models.user import User
from app.api.auth import get_current_user
from app.services.report_service import report_service
from app.schemas.alert import ReportGenerateRequest
from app.schemas.common import success_response

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/stats")
def get_report_stats(db: Session = Depends(get_db)):
    from app.models.damage import DamageDetection
    # BuildingFootprint is in damage
    from app.models.damage import BuildingFootprint
    from app.models.drone_recon import DroneReconSession, DroneReconEvent
    from app.models.report import Report
    from datetime import datetime, timedelta, timezone
    
    total_reports = 0
    recent_reports = 0
    total_sessions = 0
    places_searched = 0
    total_findings = 0
    
    try:
        total_reports = db.query(Report).count()
        last_24h = datetime.now(timezone.utc) - timedelta(hours=24)
        recent_reports = db.query(Report).filter(Report.created_at >= last_24h).count()
        total_sessions = db.query(DroneReconSession).count()
        places_searched = db.query(DroneReconEvent).filter(DroneReconEvent.event_type == 'AREA_SEARCHED').count()
        total_findings = db.query(DroneReconEvent).filter(DroneReconEvent.event_type.in_(['SURVIVOR_LOCK', 'LZ_LOCK', 'ROAD_CUTOFF'])).count()
    except Exception as e:
        print("Stats error:", e)
        pass
        
    return success_response(data={
        "total_reports": total_reports,
        "recent_reports": recent_reports,
        "drone_sessions": total_sessions,
        "places_searched": places_searched,
        "total_findings": total_findings
    })

@router.get("")
def list_reports(db: Session = Depends(get_db)):
    reports = db.query(Report).all()

    return success_response(data=[
        {
            "id": r.report_code or r.id,
            "title": r.title,
            "type": r.report_type,
            "date": r.created_at.strftime("%b %d, %Y • %H:%M UTC") if r.created_at else "",
            "author": r.author,
            "size": r.file_size,
            "status": r.status,
            "downloads": r.downloads
        }
        for r in reports
    ])

@router.post("/generate")
def generate_report(req: ReportGenerateRequest, db: Session = Depends(get_db)):
    disaster = db.query(DisasterEvent).filter(DisasterEvent.id == req.disaster_id).first()
    disaster_name = disaster.name if disaster else "Cyclone Remal"

    pdf_meta = report_service.generate_pdf_report(
        disaster_name=disaster_name,
        report_type=req.report_type
    )

    # Persist report in database
    new_report = Report(
        report_code=pdf_meta["report_id"],
        disaster_id=req.disaster_id,
        report_type=req.report_type,
        title=f"{disaster_name} {req.report_type} Dossier",
        file_path=pdf_meta["filepath"],
        file_size=pdf_meta["file_size"],
        status="FINAL"
    )
    db.add(new_report)
    db.commit()
    db.refresh(new_report)

    return success_response(data={
        "id": new_report.report_code,
        "title": new_report.title,
        "download_url": pdf_meta["download_url"],
        "size": new_report.file_size
    }, message="Report generated successfully")

@router.post("/sitrep/broadcast")
def broadcast_sitrep(db: Session = Depends(get_db)):
    """
    1. Gets active operation.
    2. Collects latest dashboard data, active alerts, damage summary, rescue status.
    3. Generates SITREP.
    4. Stores it as a Report.
    5. Returns broadcast_status: 'GENERATED'.
    """
    from app.models.operation import Operation
    from app.models.alert import Alert
    from app.models.damage import DamageDetection
    from app.models.rescue_team import RescueTeam
    from datetime import datetime, timezone

    op = db.query(Operation).filter(Operation.status == "ACTIVE").first()
    op_name = op.name if op else "Unknown Operation"
    op_region = op.region if op else "Unknown Region"
    op_id = op.id if op else "OP-UNKNOWN"

    active_alerts = db.query(Alert).filter(Alert.is_read == False).count()
    damages_count = db.query(DamageDetection).count()
    teams = db.query(RescueTeam).all()
    teams_deployed = sum(1 for t in teams if t.status in ["DEPLOYED", "ON_MISSION", "EN_ROUTE"])

    pdf_meta = report_service.generate_pdf_report(
        disaster_name=f"{op_name} ({op_region})",
        report_type="SITREP Emergency Broadcast"
    )

    sitrep_code = f"SITREP-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M')}"
    new_report = Report(
        report_code=sitrep_code,
        disaster_id=op_id,
        report_type="SITREP",
        title=f"SITREP Broadcast: {op_name} - {op_region}",
        file_path=pdf_meta["filepath"],
        file_size=pdf_meta["file_size"],
        status="TRANSMITTED"
    )
    db.add(new_report)
    db.commit()
    db.refresh(new_report)

    return success_response(data={
        "broadcast_status": "GENERATED",
        "report_id": new_report.report_code,
        "operation_id": op_id,
        "title": new_report.title,
        "summary": f"SITREP generated for {op_name}: {damages_count} structures impacted, {active_alerts} active alerts, {teams_deployed} units actively deployed.",
        "download_url": pdf_meta["download_url"],
        "timestamp": datetime.now(timezone.utc).isoformat()
    }, message="SITREP successfully compiled and queued for dispatch")

@router.get("/{id}")
def get_report(id: str, db: Session = Depends(get_db)):
    report = db.query(Report).filter(
        (Report.id == id) | (Report.report_code == id)
    ).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return success_response(data={
        "id": report.report_code or report.id,
        "title": report.title,
        "type": report.report_type,
        "date": report.created_at.strftime("%b %d, %Y • %H:%M UTC") if report.created_at else "",
        "author": report.author,
        "size": report.file_size,
        "status": report.status,
        "downloads": report.downloads,
        "download_url": f"/api/v1/reports/{report.report_code or report.id}/download"
    })

@router.get("/{id}/download")
def download_report(id: str, db: Session = Depends(get_db)):
    report = db.query(Report).filter(
        (Report.id == id) | (Report.report_code == id)
    ).first()

    if report and os.path.exists(report.file_path):
        report.downloads += 1
        db.commit()
        return FileResponse(report.file_path, filename=f"{report.report_code}.pdf", media_type="application/pdf")

    # Generate on the fly if test code
    pdf_meta = report_service.generate_pdf_report("Cyclone Remal", "Executive Brief")
    return FileResponse(pdf_meta["filepath"], filename=f"{pdf_meta['filename']}", media_type="application/pdf")


from pydantic import BaseModel
from typing import List

class DroneReconReportRequest(BaseModel):
    session_ids: List[str]
    format: str = "pdf"

@router.post("/drone-recon")
def generate_drone_recon_report(req: DroneReconReportRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not req.session_ids:
        raise HTTPException(status_code=400, detail="No session IDs provided")
    
    from app.services.report_service import generate_drone_recon_report_service
    try:
        report = generate_drone_recon_report_service(db, current_user, req.session_ids, req.format)
        return success_response(data={"report_id": report.id, "file_path": report.file_path, "format": req.format})
    except ValueError as ve:
        raise HTTPException(status_code=422, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


import zipfile
import io
from fastapi.responses import StreamingResponse

class DownloadAllRequest(BaseModel):
    report_ids: List[str]
    format: str = "pdf"

@router.post("/download-all")
def download_all_reports(req: DownloadAllRequest, db: Session = Depends(get_db)):
    reports = db.query(Report).filter(Report.id.in_(req.report_ids)).all()
    if not reports:
        raise HTTPException(status_code=404, detail="No reports found")
        
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "a", zipfile.ZIP_DEFLATED, False) as zip_file:
        manifest_lines = ["INTELLIGENCE MANIFEST", "===================="]
        for r in reports:
            # Add to zip if file exists
            if os.path.exists(r.file_path):
                ext = r.file_path.split('.')[-1]
                zip_file.write(r.file_path, f"{r.title}_{r.id}.{ext}")
                manifest_lines.append(f"Title: {r.title} | Hash: {r.content_hash} | Path: {r.file_path}")
            else:
                manifest_lines.append(f"Title: {r.title} | FILE MISSING")
                
        zip_file.writestr("manifest.txt", "\n".join(manifest_lines))
        
    zip_buffer.seek(0)
    return StreamingResponse(zip_buffer, media_type="application/zip", headers={"Content-Disposition": "attachment; filename=intelligence_export.zip"})
