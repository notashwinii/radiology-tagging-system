from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# User schemas
class UserBase(BaseModel):
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: str = "user"

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Workspace schemas
class WorkspaceBase(BaseModel):
    name: str
    description: Optional[str] = None

class WorkspaceCreate(WorkspaceBase):
    pass

class WorkspaceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class WorkspaceResponse(WorkspaceBase):
    id: int
    owner_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class WorkspaceMemberInvite(BaseModel):
    email: str
    role: str = "member"  # owner, admin, member

# Project schemas
class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None

class ProjectCreate(ProjectBase):
    workspace_id: int

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class ProjectResponse(ProjectBase):
    id: int
    workspace_id: int
    owner_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ProjectMemberInvite(BaseModel):
    email: str
    role: str = "member"  # owner, admin, member

# Folder schemas
class FolderBase(BaseModel):
    name: str
    description: Optional[str] = None

class FolderCreate(FolderBase):
    project_id: int
    parent_id: Optional[int] = None

class FolderUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    parent_id: Optional[int] = None

class FolderResponse(FolderBase):
    id: int
    project_id: int
    parent_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Image schemas
class ImageBase(BaseModel):
    filename: str
    orthanc_id: str

class ImageCreate(ImageBase):
    project_id: int
    folder_id: Optional[int] = None
    assigned_user_id: Optional[int] = None

class ImageUpdate(BaseModel):
    filename: Optional[str] = None
    folder_id: Optional[int] = None
    assigned_user_id: Optional[int] = None

class ImageResponse(ImageBase):
    id: int
    project_id: int
    folder_id: Optional[int] = None
    uploader_id: int
    assigned_user_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Annotation schemas
class AnnotationBase(BaseModel):
    data: dict  # JSON object for annotation state
    dicom_metadata: Optional[dict] = None

class AnnotationCreate(AnnotationBase):
    image_id: int

class AnnotationUpdate(BaseModel):
    data: dict
    dicom_metadata: Optional[dict] = None

class AnnotationResponse(AnnotationBase):
    id: int
    image_id: int
    annotator_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Token schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None 