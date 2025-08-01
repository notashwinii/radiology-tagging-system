from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models import Workspace, User, workspace_members
from schemas import WorkspaceCreate, WorkspaceUpdate, WorkspaceResponse, WorkspaceMemberInvite
from auth import get_current_user
from sqlalchemy import and_

router = APIRouter(prefix="/workspaces", tags=["workspaces"])

@router.post("/", response_model=WorkspaceResponse)
def create_workspace(
    workspace: WorkspaceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new workspace"""
    db_workspace = Workspace(
        name=workspace.name,
        description=workspace.description,
        owner_id=current_user.id
    )
    db.add(db_workspace)
    db.commit()
    db.refresh(db_workspace)
    
    # Add owner as member
    db.execute(
        workspace_members.insert().values(
            workspace_id=db_workspace.id,
            user_id=current_user.id,
            role="owner"
        )
    )
    db.commit()
    
    return db_workspace

@router.get("/", response_model=List[WorkspaceResponse])
def get_workspaces(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all workspaces where the user is a member"""
    workspaces = db.query(Workspace).join(
        workspace_members, Workspace.id == workspace_members.c.workspace_id
    ).filter(
        workspace_members.c.user_id == current_user.id
    ).all()
    
    return workspaces

@router.get("/{workspace_id}", response_model=WorkspaceResponse)
def get_workspace(
    workspace_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific workspace"""
    workspace = db.query(Workspace).join(
        workspace_members, Workspace.id == workspace_members.c.workspace_id
    ).filter(
        and_(
            Workspace.id == workspace_id,
            workspace_members.c.user_id == current_user.id
        )
    ).first()
    
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found or access denied"
        )
    
    return workspace

@router.put("/{workspace_id}", response_model=WorkspaceResponse)
def update_workspace(
    workspace_id: int,
    workspace_update: WorkspaceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a workspace (only owner or admin)"""
    # Check if user is owner or admin
    member_role = db.query(workspace_members.c.role).filter(
        and_(
            workspace_members.c.workspace_id == workspace_id,
            workspace_members.c.user_id == current_user.id
        )
    ).first()
    
    if not member_role or member_role[0] not in ["owner", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workspace owners and admins can update workspaces"
        )
    
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found"
        )
    
    for field, value in workspace_update.dict(exclude_unset=True).items():
        setattr(workspace, field, value)
    
    db.commit()
    db.refresh(workspace)
    return workspace

@router.delete("/{workspace_id}")
def delete_workspace(
    workspace_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a workspace (only owner)"""
    # Check if user is owner
    member_role = db.query(workspace_members.c.role).filter(
        and_(
            workspace_members.c.workspace_id == workspace_id,
            workspace_members.c.user_id == current_user.id
        )
    ).first()
    
    if not member_role or member_role[0] != "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workspace owners can delete workspaces"
        )
    
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found"
        )
    
    db.delete(workspace)
    db.commit()
    
    return {"message": "Workspace deleted successfully"}

@router.post("/{workspace_id}/invite")
def invite_user_to_workspace(
    workspace_id: int,
    invite: WorkspaceMemberInvite,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Invite a user to a workspace (only owner or admin)"""
    # Check if user is owner or admin
    member_role = db.query(workspace_members.c.role).filter(
        and_(
            workspace_members.c.workspace_id == workspace_id,
            workspace_members.c.user_id == current_user.id
        )
    ).first()
    
    if not member_role or member_role[0] not in ["owner", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workspace owners and admins can invite users"
        )
    
    # Check if workspace exists
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found"
        )
    
    # Find user by email
    user = db.query(User).filter(User.email == invite.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if user is already a member
    existing_member = db.query(workspace_members).filter(
        and_(
            workspace_members.c.workspace_id == workspace_id,
            workspace_members.c.user_id == user.id
        )
    ).first()
    
    if existing_member:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a member of this workspace"
        )
    
    # Add user to workspace
    db.execute(
        workspace_members.insert().values(
            workspace_id=workspace_id,
            user_id=user.id,
            role=invite.role
        )
    )
    db.commit()
    
    return {"message": f"User {user.email} invited to workspace successfully"}

@router.delete("/{workspace_id}/members/{user_id}")
def remove_user_from_workspace(
    workspace_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove a user from a workspace (only owner or admin)"""
    # Check if user is owner or admin
    member_role = db.query(workspace_members.c.role).filter(
        and_(
            workspace_members.c.workspace_id == workspace_id,
            workspace_members.c.user_id == current_user.id
        )
    ).first()
    
    if not member_role or member_role[0] not in ["owner", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workspace owners and admins can remove users"
        )
    
    # Prevent removing the owner
    target_member_role = db.query(workspace_members.c.role).filter(
        and_(
            workspace_members.c.workspace_id == workspace_id,
            workspace_members.c.user_id == user_id
        )
    ).first()
    
    if target_member_role and target_member_role[0] == "owner":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove workspace owner"
        )
    
    # Remove user from workspace
    result = db.execute(
        workspace_members.delete().where(
            and_(
                workspace_members.c.workspace_id == workspace_id,
                workspace_members.c.user_id == user_id
            )
        )
    )
    
    if result.rowcount == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User is not a member of this workspace"
        )
    
    db.commit()
    return {"message": "User removed from workspace successfully"}

@router.get("/{workspace_id}/members")
def get_workspace_members(
    workspace_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all members of a workspace"""
    # Check if user is a member
    member_role = db.query(workspace_members.c.role).filter(
        and_(
            workspace_members.c.workspace_id == workspace_id,
            workspace_members.c.user_id == current_user.id
        )
    ).first()
    
    if not member_role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Get all members
    members = db.query(User, workspace_members.c.role, workspace_members.c.joined_at).join(
        workspace_members, User.id == workspace_members.c.user_id
    ).filter(
        workspace_members.c.workspace_id == workspace_id
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