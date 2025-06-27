from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime
import enum

class ReviewStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    REVISED = "revised"

class BoundingBox(BaseModel):
    x: float
    y: float
    w: float
    h: float
    label: Optional[str]

class AnnotationBase(BaseModel):
    image_id: int
    bounding_boxes: List[BoundingBox]
    tags: Optional[List[str]]

class AnnotationCreate(AnnotationBase):
    pass

class AnnotationUpdate(BaseModel):
    bounding_boxes: Optional[List[BoundingBox]]
    tags: Optional[List[str]]
    review_status: Optional[ReviewStatus]

class AnnotationResponse(AnnotationBase):
    id: int
    user_id: int
    version: int
    reviewer_id: Optional[int]
    review_status: ReviewStatus
    timestamp: Optional[datetime]
    class Config:
        from_attributes = True

class AnnotationHistoryResponse(BaseModel):
    id: int
    annotation_id: int
    data_snapshot: Any
    changed_by: int
    changed_at: Optional[datetime]
    class Config:
        from_attributes = True 