import os
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from app.core.config import settings

class ReportService:
    def __init__(self):
        os.makedirs(settings.REPORT_DIR, exist_ok=True)

    def generate_pdf_report(self, disaster_name: str, report_type: str, author: str = "System Generated") -> Dict[str, Any]:
        report_id = f"REP-{datetime.now().strftime('%Y-%m%d')}-{uuid.uuid4().hex[:4].upper()}"
        filename = f"{report_id}.pdf"
        filepath = os.path.join(settings.REPORT_DIR, filename)

        c = canvas.Canvas(filepath, pagesize=letter)
        width, height = letter

        # Draw Header Bar
        c.setFillColor(colors.HexColor("#0F172A"))
        c.rect(0, height - 70, width, 70, fill=True, stroke=False)

        c.setFillColor(colors.white)
        c.setFont("Helvetica-Bold", 16)
        c.drawString(30, height - 42, "SENTINELAID AI — DISASTER SITUATIONAL REPORT")
        c.setFont("Helvetica", 9)
        c.drawString(30, height - 58, "RAPID DISASTER INTELLIGENCE DOSSIER")

        # Report Metadata
        c.setFillColor(colors.HexColor("#1E293B"))
        c.setFont("Helvetica-Bold", 12)
        c.drawString(30, height - 100, f"INCIDENT: {disaster_name.upper()}")

        c.setFont("Helvetica", 10)
        c.setFillColor(colors.HexColor("#475569"))
        c.drawString(30, height - 118, f"Report ID: {report_id}  |  Type: {report_type}")
        c.drawString(30, height - 134, f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}  |  Lead Officer: {author}")

        # Horizontal separator
        c.setStrokeColor(colors.HexColor("#E2E8F0"))
        c.line(30, height - 146, width - 30, height - 146)

        # Section 1: Executive Assessment
        c.setFillColor(colors.HexColor("#0F172A"))
        c.setFont("Helvetica-Bold", 11)
        c.drawString(30, height - 170, "1. SITUATIONAL SUMMARY & SATELLITE TELEMETRY")
        
        c.setFont("Helvetica", 9)
        c.setFillColor(colors.HexColor("#334155"))
        text = [
            "• Imagery co-registration completed.",
            "• Awaiting finalized inundation delta data.",
            "• Structure survey data is pending real-time verification.",
            "• Road cut and infrastructure obstruction data pending."
        ]
        y = height - 190
        for line in text:
            c.drawString(40, y, line)
            y -= 18

        # Section 2: Triage Priority Summary Table
        y -= 10
        c.setFillColor(colors.HexColor("#0F172A"))
        c.setFont("Helvetica-Bold", 11)
        c.drawString(30, y, "2. LIFE-SAFETY TRIAGE PRIORITY MATRIX")
        y -= 25

        # Table Header
        c.setFillColor(colors.HexColor("#F1F5F9"))
        c.rect(30, y - 5, width - 60, 20, fill=True, stroke=False)
        c.setFillColor(colors.HexColor("#0F172A"))
        c.setFont("Helvetica-Bold", 9)
        c.drawString(40, y, "RANK")
        c.drawString(90, y, "ZONE & COORDINATES")
        c.drawString(240, y, "POPULATION AT RISK")
        c.drawString(370, y, "RECOMMENDED RESPONSE")
        c.drawString(500, y, "ASSIGNED SAR")
        y -= 22

        table_rows = [
            ("Pending", "Data unavailable", "Data unavailable", "Pending verification", "UNASSIGNED")
        ]

        c.setFont("Helvetica", 8)
        c.setFillColor(colors.HexColor("#1E293B"))
        for rank, zone, pop, rec, sar in table_rows:
            c.drawString(40, y, rank)
            c.drawString(90, y, zone)
            c.drawString(240, y, pop)
            c.drawString(370, y, rec)
            c.drawString(500, y, sar)
            y -= 18

        # Footer
        c.setFont("Helvetica-Oblique", 8)
        c.setFillColor(colors.HexColor("#94A3B8"))
        c.drawString(30, 30, "SENTINELAID INTELLIGENCE DOSSIER • CONFIDENTIAL EMERGENCY DISPATCH DATA")
        c.drawRightString(width - 30, 30, f"Page 1 of 1 • Generated via FastAPI Engine")

        c.showPage()
        c.save()

        file_size_mb = round(os.path.getsize(filepath) / (1024 * 1024), 2)

        return {
            "report_id": report_id,
            "filename": filename,
            "filepath": filepath,
            "file_size": f"{file_size_mb if file_size_mb > 0 else 0.4} MB",
            "download_url": f"/api/v1/reports/{report_id}/download"
        }

report_service = ReportService()

import hashlib
import json
import csv
from datetime import datetime, timezone
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from sqlalchemy.orm import Session
from app.models.drone_recon import DroneReconSession
from app.models.report import Report
from app.models.user import User
import uuid

def generate_drone_recon_report_service(db: Session, current_user: User, session_ids: list, format: str):
    sessions = db.query(DroneReconSession).filter(DroneReconSession.id.in_(session_ids)).all()
    if not sessions:
        raise ValueError("No valid sessions found")

    events = []
    is_simulation = False
    for s in sessions:
        if s.is_simulation:
            is_simulation = True
        for e in s.events:
            events.append(e)

    if not events:
        raise ValueError("Nothing recorded in this session")

    events.sort(key=lambda x: x.created_at)

    # Content Hash for idempotency
    content_str = "".join([f"{e.id}{e.event_type}{e.created_at}" for e in events])
    content_hash = hashlib.sha256(content_str.encode()).hexdigest()

    existing_report = db.query(Report).filter(
        Report.report_type == "DRONE_RECON",
        Report.source_session_ids == ",".join(sorted(session_ids)),
        Report.content_hash == content_hash,
        Report.file_path.like(f"%.{format}")
    ).first()

    if existing_report:
        return existing_report

    filename = f"drone_recon_{datetime.now().strftime('%Y%md%H%M%S')}.{format}"
    filepath = os.path.join("data", "reports", filename)
    os.makedirs(os.path.dirname(filepath), exist_ok=True)

    if format == 'pdf':
        c = canvas.Canvas(filepath, pagesize=letter)
        c.setFont("Helvetica-Bold", 16)
        c.drawString(50, 750, f"Drone Reconnaissance Report")
        if is_simulation:
            c.setFillColor(colors.red)
            c.drawString(50, 730, "SIMULATION / DRILL DATA, NOT LIVE")
            c.setFillColor(colors.black)
        
        c.setFont("Helvetica", 10)
        y = 700
        for e in events:
            c.drawString(50, y, f"[{e.created_at}] {e.event_type} - {e.place_name} ({e.lat}, {e.lng}) [{e.provenance}]")
            y -= 15
            if y < 50:
                c.showPage()
                y = 750
        c.save()
    elif format == 'csv':
        with open(filepath, 'w', newline='') as csvfile:
            writer = csv.writer(csvfile)
            writer.writerow(['Time', 'Event Type', 'Place', 'Lat', 'Lng', 'Provenance', 'Simulation'])
            for e in events:
                writer.writerow([e.created_at, e.event_type, e.place_name, e.lat, e.lng, e.provenance, is_simulation])
    elif format == 'geojson':
        features = []
        for e in events:
            if e.lat and e.lng:
                features.append({
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [e.lng, e.lat]},
                    "properties": {
                        "event_type": e.event_type,
                        "place_name": e.place_name,
                        "provenance": e.provenance,
                        "time": e.created_at.isoformat() if e.created_at else None,
                        "is_simulation": is_simulation
                    }
                })
        fc = {"type": "FeatureCollection", "features": features}
        with open(filepath, 'w') as f:
            json.dump(fc, f)

    file_size_bytes = os.path.getsize(filepath)

    new_report = Report(
        report_code=f"REP-{uuid.uuid4().hex[:8].upper()}",
        report_type="DRONE_RECON",
        title=f"Drone Recon - {sessions[0].disaster_id}",
        disaster_id=sessions[0].disaster_id,
        source_session_ids=",".join(sorted(session_ids)),
        created_at=datetime.now(timezone.utc),
        author=current_user.name,
        generated_by=current_user.id,
        status="FINAL",
        file_path=filepath,
        file_size_bytes=file_size_bytes,
        content_hash=content_hash
    )
    db.add(new_report)
    db.commit()
    db.refresh(new_report)

    return new_report
