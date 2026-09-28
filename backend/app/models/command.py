import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text, JSON
from app.core.database import Base

class TacticalCommand(Base):
    __tablename__ = "tactical_commands"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    operation_id = Column(String(64), nullable=False, default="CY-2025-05B", index=True)
    issued_by = Column(String(100), nullable=True, default="Commander")
    command = Column(Text, nullable=False)
    command_type = Column(String(50), nullable=False, default="DISPATCH_TEAM")
    status = Column(String(32), nullable=False, default="ACCEPTED")  # ACCEPTED, EXECUTED, REJECTED
    execution_details = Column(JSON, nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    executed_at = Column(DateTime, nullable=True)
