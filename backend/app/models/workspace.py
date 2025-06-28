from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.common import Base

# Workspace members association table
workspace_members = Table(
    'workspace_members',
    Base.metadata,
    Column('workspace_id', Integer, ForeignKey('workspaces.id', ondelete='CASCADE'), primary_key=True),
    Column('user_id', Integer, ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
    Column('role', String(20), nullable=False, default='member'),  # owner, admin, member
    Column('joined_at', DateTime(timezone=True), server_default=func.now())
)

class Workspace(Base):
    __tablename__ = "workspaces"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    owner = relationship("User", back_populates="owned_workspaces")
    members = relationship("User", secondary=workspace_members, back_populates="workspaces")
    projects = relationship("Project", back_populates="workspace", cascade="all, delete-orphan") 