from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import Project, User, workspace_members, project_members
from schemas import ProjectCreate, ProjectUpdate, ProjectResponse, ProjectMemberInvite
from auth import get_current_user
from sqlalchemy import and_

router = APIRouter(prefix="/projects", tags=["projects"])

@router.post("/", response_model=ProjectResponse)
def create_project(
    project: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new project in a workspace"""
    # Check if user is a member of the workspace
    member_role = db.query(workspace_members.c.role).filter(
        and_(
            workspace_members.c.workspace_id == project.workspace_id,
            workspace_members.c.user_id == current_user.id
        )
    ).first()
    
    if not member_role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be a member of the workspace to create projects"
        )
    
    db_project = Project(
        name=project.name,
        description=project.description,
        workspace_id=project.workspace_id,
        owner_id=current_user.id
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    
    # Add owner as project member
    db.execute(
        project_members.insert().values(
            project_id=db_project.id,
            user_id=current_user.id,
            role="owner"
        )
    )
    db.commit()
    
    return db_project

@router.get("/", response_model=List[ProjectResponse])
def get_projects(
    workspace_id: int = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all projects where the user is a member"""
    query = db.query(Project).join(
        project_members, Project.id == project_members.c.project_id
    ).filter(
        project_members.c.user_id == current_user.id
    )
    
    if workspace_id:
        # Check if user is a member of the workspace
        workspace_member = db.query(workspace_members.c.role).filter(
            and_(
                workspace_members.c.workspace_id == workspace_id,
                workspace_members.c.user_id == current_user.id
            )
        ).first()
        
        if not workspace_member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to workspace"
            )
        
        query = query.filter(Project.workspace_id == workspace_id)
    
    projects = query.all()
    return projects

@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific project"""
    project = db.query(Project).join(
        project_members, Project.id == project_members.c.project_id
    ).filter(
        and_(
            Project.id == project_id,
            project_members.c.user_id == current_user.id
        )
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or access denied"
        )
    
    return project

@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: int,
    project_update: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a project (only owner or admin)"""
    # Check if user is owner or admin
    member_role = db.query(project_members.c.role).filter(
        and_(
            project_members.c.project_id == project_id,
            project_members.c.user_id == current_user.id
        )
    ).first()
    
    if not member_role or member_role[0] not in ["owner", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only project owners and admins can update projects"
        )
    
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    for field, value in project_update.dict(exclude_unset=True).items():
        setattr(project, field, value)
    
    db.commit()
    db.refresh(project)
    return project

@router.delete("/{project_id}")
def delete_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a project (only owner)"""
    # Check if user is owner
    member_role = db.query(project_members.c.role).filter(
        and_(
            project_members.c.project_id == project_id,
            project_members.c.user_id == current_user.id
        )
    ).first()
    
    if not member_role or member_role[0] != "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only project owners can delete projects"
        )
    
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    db.delete(project)
    db.commit()
    
    return {"message": "Project deleted successfully"}

@router.post("/{project_id}/invite")
def invite_user_to_project(
    project_id: int,
    invite: ProjectMemberInvite,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Invite a user to a project (only owner or admin)"""
    # Check if user is owner or admin
    member_role = db.query(project_members.c.role).filter(
        and_(
            project_members.c.project_id == project_id,
            project_members.c.user_id == current_user.id
        )
    ).first()
    
    if not member_role or member_role[0] not in ["owner", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only project owners and admins can invite users"
        )
    
    # Check if project exists
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Check if user is a member of the workspace
    workspace_member = db.query(workspace_members.c.role).filter(
        and_(
            workspace_members.c.workspace_id == project.workspace_id,
            workspace_members.c.user_id == current_user.id
        )
    ).first()
    
    if not workspace_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be a member of the workspace to invite users to projects"
        )
    
    # Find user by email
    user = db.query(User).filter(User.email == invite.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if user is already a member of the project
    existing_member = db.query(project_members).filter(
        and_(
            project_members.c.project_id == project_id,
            project_members.c.user_id == user.id
        )
    ).first()
    
    if existing_member:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a member of this project"
        )
    
    # Add user to project
    db.execute(
        project_members.insert().values(
            project_id=project_id,
            user_id=user.id,
            role=invite.role
        )
    )
    db.commit()
    
    return {"message": f"User {user.email} invited to project successfully"}

@router.delete("/{project_id}/members/{user_id}")
def remove_user_from_project(
    project_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove a user from a project (only owner or admin)"""
    # Check if user is owner or admin
    member_role = db.query(project_members.c.role).filter(
        and_(
            project_members.c.project_id == project_id,
            project_members.c.user_id == current_user.id
        )
    ).first()
    
    if not member_role or member_role[0] not in ["owner", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only project owners and admins can remove users"
        )
    
    # Prevent removing the owner
    target_member_role = db.query(project_members.c.role).filter(
        and_(
            project_members.c.project_id == project_id,
            project_members.c.user_id == user_id
        )
    ).first()
    
    if target_member_role and target_member_role[0] == "owner":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove project owner"
        )
    
    # Remove user from project
    result = db.execute(
        project_members.delete().where(
            and_(
                project_members.c.project_id == project_id,
                project_members.c.user_id == user_id
            )
        )
    )
    
    if result.rowcount == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User is not a member of this project"
        )
    
    db.commit()
    return {"message": "User removed from project successfully"}

@router.get("/{project_id}/members")
def get_project_members(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all members of a project"""
    # Check if user is a member
    member_role = db.query(project_members.c.role).filter(
        and_(
            project_members.c.project_id == project_id,
            project_members.c.user_id == current_user.id
        )
    ).first()
    
    if not member_role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Get all members
    members = db.query(User, project_members.c.role, project_members.c.joined_at).join(
        project_members, User.id == project_members.c.user_id
    ).filter(
        project_members.c.project_id == project_id
    ).all()
    
    return [
        {
            "user_id": member.User.id,
            "email": member.User.email,
            "first_name": member.User.first_name,
            "last_name": member.User.last_name,
            "role": member.role,
            "joined_at": member.joined_at
        }
        for member in members
    ] 