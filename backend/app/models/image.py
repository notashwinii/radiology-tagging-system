from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base
from .common import CommonModel

class Image(CommonModel):
    __tablename__ = "images"

    orthanc_id = Column(String, unique=True, index=True, nullable=False)
    uploader_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    upload_time = Column(DateTime(timezone=True))
    dicom_metadata = Column(JSON, nullable=True)
    thumbnail_url = Column(String, nullable=True)

    uploader = relationship("User")
    annotations = relationship("Annotation", back_populates="image") 