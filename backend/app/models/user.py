from sqlalchemy import Column, String, Enum
from enum import Enum as PythonEnum
from sqlalchemy.orm import relationship

from app.core.database import Base
from .common import CommonModel
from app.utils.constant.globals import UserRole

class User(CommonModel):
	__tablename__ = "users"

	email = Column(String, unique=True, index=True)
	password = Column(String)
	first_name = Column(String, nullable=True)
	last_name = Column(String, nullable=True)
	role = Column(Enum(UserRole), default=UserRole.USER, nullable=False)

	# Relationships
	owned_projects = relationship("Project", foreign_keys="Project.owner_id", back_populates="owner")
	projects = relationship("Project", secondary="project_users", back_populates="members")
	uploaded_images = relationship("Image", foreign_keys="Image.uploader_id", back_populates="uploader")
	assigned_images = relationship("Image", foreign_keys="Image.assigned_user_id")
	annotations = relationship("Annotation", foreign_keys="Annotation.user_id", back_populates="user")
	reviewed_annotations = relationship("Annotation", foreign_keys="Annotation.reviewer_id")
	annotation_history = relationship("AnnotationHistory", foreign_keys="AnnotationHistory.changed_by")
	owned_workspaces = relationship("Workspace", foreign_keys="Workspace.owner_id", back_populates="owner")
	workspaces = relationship("Workspace", secondary="workspace_members", back_populates="members")

	def __repr__(self):
		return f"{self.email}"
	
metadata = Base.metadata

