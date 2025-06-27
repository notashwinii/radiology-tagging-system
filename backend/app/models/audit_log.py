from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from app.core.database import Base
from .common import CommonModel

class AuditLog(CommonModel):
    __tablename__ = "audit_logs"

    action = Column(String, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    target_type = Column(String, nullable=False)  # e.g., 'image', 'annotation'
    target_id = Column(Integer, nullable=False)
    timestamp = Column(DateTime(timezone=True))
    details = Column(JSON, nullable=True) 