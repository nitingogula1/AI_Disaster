import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, UniqueConstraint
from app.core.database import Base

class Report(Base):
    __tablename__ = "reports"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    report_code = Column(String(50), unique=True, index=True, nullable=False)
    disaster_id = Column(String(36), ForeignKey("disaster_events.id"), nullable=True)
    report_type = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    file_path = Column(String(255), nullable=False)
    file_size_bytes = Column(Integer, default=0)
    status = Column(String(30), default="VERIFIED")
    author = Column(String(100), default="System")
    downloads = Column(Integer, default=0)
    generated_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    source_session_ids = Column(String(255), nullable=True)
    content_hash = Column(String(255), nullable=True)

    __table_args__ = (
        UniqueConstraint('report_type', 'source_session_ids', 'content_hash', name='uix_report_hash'),
    )
