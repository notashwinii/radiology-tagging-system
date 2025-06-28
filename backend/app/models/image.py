from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base
from .common import CommonModel

class Image(CommonModel):
    __tablename__ = "images"

    orthanc_id = Column(String, unique=True, index=True, nullable=False)
    uploader_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    assigned_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    upload_time = Column(DateTime(timezone=True))
    dicom_metadata = Column(JSON, nullable=True)
    thumbnail_url = Column(String, nullable=True)

    # Relationships
    uploader = relationship("User", foreign_keys=[uploader_id], back_populates="uploaded_images")
    project = relationship("Project", back_populates="images")
    assigned_user = relationship("User", foreign_keys=[assigned_user_id])
    annotations = relationship("Annotation", back_populates="image") 