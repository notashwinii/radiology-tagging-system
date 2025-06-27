from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, JSON, Enum
from sqlalchemy.orm import relationship
from app.core.database import Base
from .common import CommonModel
import enum

class ReviewStatus(enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    REVISED = "revised"

class Annotation(CommonModel):
    __tablename__ = "annotations"

    image_id = Column(Integer, ForeignKey("images.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    version = Column(Integer, default=1)
    bounding_boxes = Column(JSON, nullable=False)  # List of dicts: {x, y, w, h}
    tags = Column(JSON, nullable=True)  # List of tag labels
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    review_status = Column(Enum(ReviewStatus), default=ReviewStatus.PENDING)
    timestamp = Column(DateTime(timezone=True))

    image = relationship("Image", back_populates="annotations")
    user = relationship("User", foreign_keys=[user_id])
    reviewer = relationship("User", foreign_keys=[reviewer_id])
    history = relationship("AnnotationHistory", back_populates="annotation")

class AnnotationHistory(CommonModel):
    __tablename__ = "annotation_history"

    annotation_id = Column(Integer, ForeignKey("annotations.id"), nullable=False)
    data_snapshot = Column(JSON, nullable=False)
    changed_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    changed_at = Column(DateTime(timezone=True))

    annotation = relationship("Annotation", back_populates="history")
    user = relationship("User") 