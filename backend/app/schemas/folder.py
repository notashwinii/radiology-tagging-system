from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
from .user import User

class FolderBase(BaseModel):
    name: str
    description: Optional[str] = None

class FolderCreate(FolderBase):
    project_id: int
    parent_folder_id: Optional[int] = None

class FolderUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    parent_folder_id: Optional[int] = None

class FolderResponse(FolderBase):
    id: int
    project_id: int
    parent_folder_id: Optional[int]
    created_at: datetime
    updated_at: datetime
    image_count: Optional[int] = 0
    subfolder_count: Optional[int] = 0
    
    class Config:
        from_attributes = True 