from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class WorkspaceBase(BaseModel):
    name: str
    description: Optional[str] = None

class WorkspaceCreate(WorkspaceBase):
    pass

class WorkspaceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class WorkspaceResponse(WorkspaceBase):
    id: int
    owner_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    members_count: Optional[int] = None
    projects_count: Optional[int] = None

    class Config:
        from_attributes = True

class WorkspaceMemberInvite(BaseModel):
    email: str
    role: str = "member"  # owner, admin, member

class WorkspaceMemberResponse(BaseModel):
    id: int
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: str
    joined_at: datetime

    class Config:
        from_attributes = True 