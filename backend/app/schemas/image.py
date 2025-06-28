from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime
from .user import UserResponse
from .folder import FolderResponse

class ImageBase(BaseModel):
    orthanc_id: str
    folder_id: Optional[int] = None
    assigned_user_id: Optional[int] = None
    upload_time: Optional[datetime] = None
    dicom_metadata: Optional[dict] = None
    thumbnail_url: Optional[str] = None

class ImageCreate(ImageBase):
    pass

class ImageUpdate(BaseModel):
    assigned_user_id: Optional[int] = None
    folder_id: Optional[int] = None

class ImageResponse(ImageBase):
    id: int
    uploader_id: int
    project_id: int
    assigned_user_id: Optional[int]
    upload_time: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    uploader: UserResponse
    assigned_user: Optional[UserResponse]
    folder: Optional[FolderResponse]
    
    class Config:
        from_attributes = True 