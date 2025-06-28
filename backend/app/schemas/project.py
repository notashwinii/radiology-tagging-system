from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
from .user import User

class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None

class ProjectCreate(ProjectBase):
    workspace_id: int

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class ProjectMember(BaseModel):
    user_id: int
    email: str
    first_name: Optional[str]
    last_name: Optional[str]
    role: str
    joined_at: datetime

class Project(ProjectBase):
    id: int
    owner_id: int
    owner: User
    members: List[ProjectMember]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class ProjectInvite(BaseModel):
    email: str
    role: str = "member"

class ImageAssignment(BaseModel):
    image_id: int
    assigned_user_id: int 