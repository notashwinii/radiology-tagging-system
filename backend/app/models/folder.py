from sqlalchemy import Column, String, Integer, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship, declared_attr
from datetime import datetime

from app.core.database import Base
from .common import CommonModel

class Folder(CommonModel):
    __tablename__ = "folders"

    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    project_id = Column(Integer, ForeignKey('projects.id'), nullable=False)
    parent_folder_id = Column(Integer, ForeignKey('folders.id'), nullable=True)  # For nested folders
    
    # Relationships
    project = relationship("Project", back_populates="folders")
    @declared_attr
    def parent_folder(cls):
        return relationship(
            "Folder",
            remote_side=lambda: [cls.id],
            back_populates="subfolders",
            foreign_keys=lambda: [cls.parent_folder_id]
        )
    @declared_attr
    def subfolders(cls):
        return relationship(
            "Folder",
            back_populates="parent_folder",
            cascade="all, delete-orphan"
        )
    images = relationship("Image", back_populates="folder")
    
    def __repr__(self):
        return f"Folder(name={self.name}, project_id={self.project_id})" 