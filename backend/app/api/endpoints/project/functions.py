from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional, Dict, Any

from app.models import project as ProjectModel
from app.models import user as UserModel
from app.models import image as ImageModel
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectInvite
from app.schemas.user import User

def format_project_response(project: ProjectModel.Project, db: Session) -> Dict[str, Any]:
    """Format project data with member information for API response"""
    # Get project members with their roles and join dates
    members_data = db.execute(
        ProjectModel.project_users.select().where(
            ProjectModel.project_users.c.project_id == project.id
        )
    ).fetchall()
    
    # Get user details for each member
    members = []
    for member_data in members_data:
        user = db.query(UserModel.User).filter(UserModel.User.id == member_data.user_id).first()
        if user:
            members.append({
                "user_id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": member_data.role,
                "joined_at": member_data.joined_at
            })
    
    return {
        "id": project.id,
        "name": project.name,
        "description": project.description,
        "owner_id": project.owner_id,
        "owner": {
            "id": project.owner.id,
            "email": project.owner.email,
            "first_name": project.owner.first_name,
            "last_name": project.owner.last_name,
            "role": project.owner.role.value,
            "is_active": project.owner.is_active,
            "created_at": project.owner.created_at,
            "updated_at": project.owner.updated_at
        },
        "members": members,
        "created_at": project.created_at,
        "updated_at": project.updated_at
    }

def create_project(db: Session, project: ProjectCreate, current_user: User) -> Dict[str, Any]:
    """Create a new project"""
    db_project = ProjectModel.Project(
        name=project.name,
        description=project.description,
        owner_id=current_user.id
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    
    # Add owner as a member with 'owner' role
    db.execute(
        ProjectModel.project_users.insert().values(
            project_id=db_project.id,
            user_id=current_user.id,
            role='owner'
        )
    )
    db.commit()
    
    return format_project_response(db_project, db)

def get_user_projects(db: Session, current_user: User) -> List[Dict[str, Any]]:
    """Get all projects where the user is a member"""
    projects = db.query(ProjectModel.Project).join(
        ProjectModel.project_users
    ).filter(
        ProjectModel.project_users.c.user_id == current_user.id
    ).all()
    
    return [format_project_response(project, db) for project in projects]

def get_project(db: Session, project_id: int, current_user: User) -> Optional[Dict[str, Any]]:
    """Get a specific project if user is a member"""
    project = db.query(ProjectModel.Project).join(
        ProjectModel.project_users
    ).filter(
        ProjectModel.Project.id == project_id,
        ProjectModel.project_users.c.user_id == current_user.id
    ).first()
    
    if not project:
        return None
    
    return format_project_response(project, db)

def update_project(db: Session, project_id: int, project_update: ProjectUpdate, current_user: User) -> Optional[Dict[str, Any]]:
    """Update a project (only owner can update)"""
    project = db.query(ProjectModel.Project).filter(
        ProjectModel.Project.id == project_id,
        ProjectModel.Project.owner_id == current_user.id
    ).first()
    
    if not project:
        return None
    
    update_data = project_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(project, key, value)
    
    db.add(project)
    db.commit()
    db.refresh(project)
    return format_project_response(project, db)

def delete_project(db: Session, project_id: int, current_user: User) -> bool:
    """Delete a project (only owner can delete)"""
    project = db.query(ProjectModel.Project).filter(
        ProjectModel.Project.id == project_id,
        ProjectModel.Project.owner_id == current_user.id
    ).first()
    
    if not project:
        return False
    
    # Delete all images in the project
    db.query(ImageModel.Image).filter(
        ImageModel.Image.project_id == project_id
    ).delete()
    
    # Delete project
    db.delete(project)
    db.commit()
    return True

def invite_user_to_project(db: Session, project_id: int, invite: ProjectInvite, current_user: User):
    """Invite a user to a project"""
    # Check if current user has permission (owner or admin)
    member_role = db.execute(
        ProjectModel.project_users.select().where(
            ProjectModel.project_users.c.project_id == project_id,
            ProjectModel.project_users.c.user_id == current_user.id
        )
    ).first()
    
    if not member_role or member_role.role not in ['owner', 'admin']:
        return None
    
    # Find user by email
    user = db.query(UserModel.User).filter(UserModel.User.email == invite.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user is already a member
    existing_member = db.execute(
        ProjectModel.project_users.select().where(
            ProjectModel.project_users.c.project_id == project_id,
            ProjectModel.project_users.c.user_id == user.id
        )
    ).first()
    
    if existing_member:
        raise HTTPException(status_code=400, detail="User is already a member of this project")
    
    # Add user to project
    db.execute(
        ProjectModel.project_users.insert().values(
            project_id=project_id,
            user_id=user.id,
            role=invite.role,
            joined_at=datetime.utcnow()
        )
    )
    db.commit()
    
    return {
        "user_id": user.id,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "role": invite.role,
        "joined_at": datetime.utcnow()
    }

def remove_user_from_project(db: Session, project_id: int, user_id: int, current_user: User) -> bool:
    """Remove a user from a project"""
    # Check if current user has permission (owner or admin)
    member_role = db.execute(
        ProjectModel.project_users.select().where(
            ProjectModel.project_users.c.project_id == project_id,
            ProjectModel.project_users.c.user_id == current_user.id
        )
    ).first()
    
    if not member_role or member_role.role not in ['owner', 'admin']:
        return False
    
    # Check if user to be removed is the owner
    project = db.query(ProjectModel.Project).filter(ProjectModel.Project.id == project_id).first()
    if project.owner_id == user_id:
        raise HTTPException(status_code=400, detail="Cannot remove project owner")
    
    # Remove user from project
    db.execute(
        ProjectModel.project_users.delete().where(
            ProjectModel.project_users.c.project_id == project_id,
            ProjectModel.project_users.c.user_id == user_id
        )
    )
    db.commit()
    return True

def assign_unknown_images(db: Session, project_id: int, assigned_user_id: int, current_user: User):
    """Assign all unknown images (images not in any folder) to a specific user"""
    # Check if current user has permission (owner or admin)
    member_role = db.execute(
        ProjectModel.project_users.select().where(
            ProjectModel.project_users.c.project_id == project_id,
            ProjectModel.project_users.c.user_id == current_user.id
        )
    ).first()
    
    if not member_role or member_role.role not in ['owner', 'admin']:
        return None
    
    # Check if assigned user is a project member
    assigned_member = db.execute(
        ProjectModel.project_users.select().where(
            ProjectModel.project_users.c.project_id == project_id,
            ProjectModel.project_users.c.user_id == assigned_user_id
        )
    ).first()
    
    if not assigned_member:
        raise HTTPException(status_code=400, detail="Assigned user is not a project member")
    
    # Update all unknown images (images with no folder_id)
    unknown_images = db.query(ImageModel.Image).filter(
        ImageModel.Image.project_id == project_id,
        ImageModel.Image.folder_id.is_(None)
    ).all()
    
    for image in unknown_images:
        image.assigned_user_id = assigned_user_id
    
    db.commit()
    
    return {
        "message": f"Successfully assigned {len(unknown_images)} unknown images to user",
        "updated_count": len(unknown_images)
    } 