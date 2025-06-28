from sqlalchemy import Column, String, Integer, ForeignKey, Table, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime

from app.core.database import Base
from .common import CommonModel

# Association table for many-to-many relationship between projects and users
project_users = Table(
    'project_users',
    Base.metadata,
    Column('project_id', Integer, ForeignKey('projects.id'), primary_key=True),
    Column('user_id', Integer, ForeignKey('users.id'), primary_key=True),
    Column('role', String, default='member'),  # 'owner', 'admin', 'member'
    Column('joined_at', DateTime, default=datetime.utcnow)
)

class Project(CommonModel):
    __tablename__ = "projects"

    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    owner_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    
    # Relationships
    owner = relationship("User", foreign_keys=[owner_id], back_populates="owned_projects")
    members = relationship("User", secondary=project_users, back_populates="projects")
    images = relationship("Image", back_populates="project")
    folders = relationship("Folder", back_populates="project")
    
    def __repr__(self):
        return f"Project(name={self.name}, owner_id={self.owner_id})"

metadata = Base.metadata 