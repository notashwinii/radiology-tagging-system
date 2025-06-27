from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime

class ImageBase(BaseModel):
    orthanc_id: str
    dicom_metadata: Optional[Any]
    thumbnail_url: Optional[str]

class ImageCreate(ImageBase):
    pass

class ImageResponse(ImageBase):
    id: int
    uploader_id: int
    upload_time: Optional[datetime]
    class Config:
        from_attributes = True 