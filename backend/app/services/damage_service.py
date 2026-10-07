from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.damage import DamageDetection, BuildingFootprint
from app.services.ai_detection_service import ai_detection_service

class DamageService:
    def get_disaster_damage_summary(self, db: Session, disaster_id: str) -> Dict[str, Any]:
        # Query detections for this disaster / operation or overall if global
        q = db.query(DamageDetection)
        fp_q = db.query(BuildingFootprint)
        if disaster_id and disaster_id not in ["CY-2025-05B", "all", "ALL", "default"]:
            detections = q.filter(DamageDetection.disaster_id == disaster_id).all()
            footprints_count = fp_q.filter(BuildingFootprint.disaster_id == disaster_id).count()
        else:
            detections = q.all()
            footprints_count = fp_q.count()

        total = len(detections)

        # Categorized calculations
        res_dets = [d for d in detections if d.category in ["Residential", "Residential Buildings"] or "RES" in (d.asset_code or "")]
        com_dets = [d for d in detections if d.category in ["Commercial", "Commercial & Municipal", "Education"] or "SCH" in (d.asset_code or "")]
        road_dets = [d for d in detections if d.category in ["Transport", "Road / Bridge Segments"] or d.object_type == "ROAD"]
        power_dets = [d for d in detections if d.category in ["Utility", "Power Grids & Water Stations"] or "WTR" in (d.asset_code or "")]

        res_count = len(res_dets)
        res_conf = round(sum(d.confidence for d in res_dets) / len(res_dets), 1) if res_dets else 0.0

        com_count = len(com_dets)
        com_conf = round(sum(d.confidence for d in com_dets) / len(com_dets), 1) if com_dets else 0.0

        road_count = len(road_dets)
        road_conf = round(sum(d.confidence for d in road_dets) / len(road_dets), 1) if road_dets else 0.0

        power_count = len(power_dets)
        power_conf = round(sum(d.confidence for d in power_dets) / len(power_dets), 1) if power_dets else 0.0

        # Building footprints establish total surveyed building assets in AOI
        total_inspected = max(footprints_count, total)

        categories = [
            {
                "category": "Residential Buildings",
                "count": res_count,
                "unit": "Units",
                "description": f"{res_count} units classified with structural compromise" if res_count > 0 else "0 units reported",
                "confidence": res_conf
            },
            {
                "category": "Commercial & Municipal",
                "count": com_count,
                "unit": "Units",
                "description": f"{com_count} municipal / commercial structures surveyed" if com_count > 0 else "0 units reported",
                "confidence": com_conf
            },
            {
                "category": "Road / Bridge Segments",
                "count": road_count,
                "unit": "Cuts",
                "description": f"{road_count} cutoffs identified" if road_count > 0 else "0 network cutoffs reported",
                "confidence": road_conf
            },
            {
                "category": "Power Grids & Water Stations",
                "count": power_count,
                "unit": "Nodes",
                "description": f"{power_count} utility nodes affected" if power_count > 0 else "0 utility nodes affected",
                "confidence": power_conf
            }
        ]

        g5 = sum(1 for d in detections if d.damage_grade == 5)
        g4 = sum(1 for d in detections if d.damage_grade == 4)
        g3 = sum(1 for d in detections if d.damage_grade == 3)
        g2 = sum(1 for d in detections if d.damage_grade == 2)
        # Grade 1 (intact) represents the un-damaged balance of surveyed structures
        damaged_count = g5 + g4 + g3 + g2
        g1 = sum(1 for d in detections if d.damage_grade == 1)
        if total_inspected > damaged_count:
            g1 = max(g1, total_inspected - damaged_count)

        avg_conf = round(sum(d.confidence for d in detections) / total, 1) if total > 0 else 0.0
        impact_ratio = round((damaged_count / total_inspected) * 100, 1) if total_inspected > 0 else 0.0

        # Retrieve dynamic AI model status from engine
        ai_stat = ai_detection_service.get_model_status()
        model_name = ai_stat.get("model_name", "Spectral Overlap Heuristic Engine (No ML Checkpoint)")

        return {
            "total_assets": total_inspected,
            "total_inspected": total_inspected,
            "footprints_count": footprints_count,
            "detections_count": total,
            "aggregated_impact_ratio": impact_ratio,
            "categories": categories,
            "grade_5_destroyed": g5,
            "grade_4_severe": g4,
            "grade_3_moderate": g3,
            "grade_2_minor": g2,
            "grade_1_intact": g1,
            "average_confidence": avg_conf,
            "model_name": model_name,
            "is_heuristic": ai_stat.get("is_heuristic", True),
            "estimated_loss_usd": f"${round(damaged_count * 0.12, 1)}M" if damaged_count > 0 else "$0.0M",
            "displaced_civilians": damaged_count * 15 if damaged_count > 0 else 0,
            "by_category": {
                "Residential": res_count,
                "Commercial": com_count,
                "Transport": road_count,
                "Utility": power_count
            }
        }

    def verify_asset(self, db: Session, asset_id: str, verified: bool = True) -> DamageDetection:
        asset = db.query(DamageDetection).filter(DamageDetection.id == asset_id).first()
        if asset:
            asset.verified = verified
            db.commit()
            db.refresh(asset)
        return asset

damage_service = DamageService()
