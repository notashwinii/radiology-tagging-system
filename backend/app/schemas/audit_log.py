from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime

class AuditLogResponse(BaseModel):
    id: int
    action: str
    user_id: int
    target_type: str
    target_id: int
    timestamp: Optional[datetime]
    details: Optional[Any]
    class Config:
        from_attributes = True 