import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer
from app.core.database import Base

class Report(Base):
    __tablename__ = "reports"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    report_code = Column(String(50), unique=True, index=True, nullable=False)
    disaster_id = Column(String(36), ForeignKey("disaster_events.id"), nullable=True)
    report_type = Column(String(50), nullable=False)  # Executive Brief, AI Damage Audit, International Aid Protocol, Logistics & GIS
    title = Column(String(255), nullable=False)
    file_path = Column(String(255), nullable=False)
    file_size = Column(String(50), default="4.8 MB")
    status = Column(String(30), default="VERIFIED")  # VERIFIED, FINAL, TRANSMITTED, UPDATED
    author = Column(String(100), default="Cmdr. Sarah Jenkins")
    downloads = Column(Integer, default=0)
    generated_by = Column(String(36), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
