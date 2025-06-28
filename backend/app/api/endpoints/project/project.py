from fastapi import APIRouter, Depends, HTTPException, status
from typing import Annotated, List, Dict, Any
from sqlalchemy.orm import Session

from app.core.dependencies import get_db
from app.api.endpoints.user.functions import get_current_user
from app.schemas.project import Project, ProjectCreate, ProjectUpdate, ProjectInvite, ProjectMember
from app.schemas.user import User
from app.api.endpoints.project import functions as project_functions

project_module = APIRouter()

@project_module.post('/', response_model=Dict[str, Any])
async def create_project(
    project: ProjectCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    """Create a new project"""
    return project_functions.create_project(db, project, current_user)

@project_module.get('/', response_model=List[Dict[str, Any]])
async def get_user_projects(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    """Get all projects where the current user is a member"""
    return project_functions.get_user_projects(db, current_user)

@project_module.get('/{project_id}', response_model=Dict[str, Any])
async def get_project(
    project_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    """Get a specific project (only if user is a member)"""
    project = project_functions.get_project(db, project_id, current_user)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@project_module.patch('/{project_id}', response_model=Dict[str, Any])
async def update_project(
    project_id: int,
    project_update: ProjectUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    """Update a project (only owner can update)"""
    project = project_functions.update_project(db, project_id, project_update, current_user)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or access denied")
    return project

@project_module.delete('/{project_id}')
async def delete_project(
    project_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    """Delete a project (only owner can delete)"""
    success = project_functions.delete_project(db, project_id, current_user)
    if not success:
        raise HTTPException(status_code=404, detail="Project not found or access denied")
    return {"message": "Project deleted successfully"}

@project_module.post('/{project_id}/invite', response_model=Dict[str, Any])
async def invite_user_to_project(
    project_id: int,
    invite: ProjectInvite,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    """Invite a user to a project (only owner/admin can invite)"""
    member = project_functions.invite_user_to_project(db, project_id, invite, current_user)
    if not member:
        raise HTTPException(status_code=404, detail="Project not found or access denied")
    return member

@project_module.delete('/{project_id}/members/{user_id}')
async def remove_user_from_project(
    project_id: int,
    user_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    """Remove a user from a project (only owner/admin can remove)"""
    success = project_functions.remove_user_from_project(db, project_id, user_id, current_user)
    if not success:
        raise HTTPException(status_code=404, detail="Project not found or access denied")
    return {"message": "User removed from project successfully"}

@project_module.patch('/{project_id}/assign-root-images')
async def assign_unknown_images(
    project_id: int,
    assigned_user_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    """Assign all unknown images (images not in any folder) to a specific user"""
    result = project_functions.assign_unknown_images(db, project_id, assigned_user_id, current_user)
    if not result:
        raise HTTPException(status_code=404, detail="Project not found or access denied")
    return result 