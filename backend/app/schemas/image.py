from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime
from .user import UserResponse

class ImageBase(BaseModel):
    orthanc_id: str
    dicom_metadata: Optional[Any]
    thumbnail_url: Optional[str]

class ImageCreate(ImageBase):
    pass

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
    
    class Config:
        from_attributes = True 