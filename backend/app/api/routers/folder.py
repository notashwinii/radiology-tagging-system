from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from app.schemas.folder import FolderCreate, FolderUpdate, FolderResponse
from app.core.dependencies import get_db, oauth2_scheme
from app.models.folder import Folder
from app.models.user import User
from app.models.project import Project
from app.models.image import Image
from app.api.endpoints.user.functions import get_current_user
from app.api.endpoints.project.functions import get_project

router = APIRouter(prefix="/folders", tags=["folders"])

def get_folder(db: Session, folder_id: int, current_user: User) -> Optional[Folder]:
    """Get a folder if user has access to its project"""
    folder = db.query(Folder).join(Project).join(
        Project.members
    ).filter(
        Folder.id == folder_id,
        Project.members.any(id=current_user.id)
    ).first()
    return folder

@router.post("/", response_model=FolderResponse)
def create_folder(
    folder: FolderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new folder in a project"""
    
    # Verify project access
    project = get_project(db, folder.project_id, current_user)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or access denied")
    
    # If parent folder is specified, verify it exists and is in the same project
    if folder.parent_folder_id:
        parent_folder = db.query(Folder).filter(
            Folder.id == folder.parent_folder_id,
            Folder.project_id == folder.project_id
        ).first()
        if not parent_folder:
            raise HTTPException(status_code=404, detail="Parent folder not found")
    
    # Check if folder with same name already exists in the same location
    existing_folder = db.query(Folder).filter(
        Folder.name == folder.name,
        Folder.project_id == folder.project_id,
        Folder.parent_folder_id == folder.parent_folder_id
    ).first()
    
    if existing_folder:
        raise HTTPException(status_code=409, detail="A folder with this name already exists in this location")
    
    db_folder = Folder(
        name=folder.name,
        description=folder.description,
        project_id=folder.project_id,
        parent_folder_id=folder.parent_folder_id
    )
    db.add(db_folder)
    db.commit()
    db.refresh(db_folder)
    
    return db_folder

@router.get("/project/{project_id}", response_model=List[FolderResponse])
def get_project_folders(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all folders in a project"""
    
    # Verify project access
    project = get_project(db, project_id, current_user)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or access denied")
    
    folders = db.query(Folder).filter(Folder.project_id == project_id).all()
    
    # Add counts for each folder
    for folder in folders:
        folder.image_count = db.query(Folder).filter(Folder.id == folder.id).join(Folder.images).count()
        folder.subfolder_count = db.query(Folder).filter(Folder.parent_folder_id == folder.id).count()
    
    return folders

@router.get("/{folder_id}", response_model=FolderResponse)
def get_folder_details(
    folder_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific folder"""
    
    folder = get_folder(db, folder_id, current_user)
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found or access denied")
    
    # Add counts
    folder.image_count = db.query(Folder).filter(Folder.id == folder.id).join(Folder.images).count()
    folder.subfolder_count = db.query(Folder).filter(Folder.parent_folder_id == folder.id).count()
    
    return folder

@router.patch("/{folder_id}", response_model=FolderResponse)
def update_folder(
    folder_id: int,
    folder_update: FolderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a folder"""
    
    folder = get_folder(db, folder_id, current_user)
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found or access denied")
    
    # If changing parent folder, verify it exists and is in the same project
    if folder_update.parent_folder_id is not None:
        if folder_update.parent_folder_id != folder.parent_folder_id:
            parent_folder = db.query(Folder).filter(
                Folder.id == folder_update.parent_folder_id,
                Folder.project_id == folder.project_id
            ).first()
            if not parent_folder:
                raise HTTPException(status_code=404, detail="Parent folder not found")
            
            # Prevent circular references
            if folder_update.parent_folder_id == folder_id:
                raise HTTPException(status_code=400, detail="Cannot set folder as its own parent")
    
    # If changing name, check for conflicts
    if folder_update.name and folder_update.name != folder.name:
        existing_folder = db.query(Folder).filter(
            Folder.name == folder_update.name,
            Folder.project_id == folder.project_id,
            Folder.parent_folder_id == folder.parent_folder_id,
            Folder.id != folder_id
        ).first()
        
        if existing_folder:
            raise HTTPException(status_code=409, detail="A folder with this name already exists in this location")
    
    # Update folder
    update_data = folder_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(folder, key, value)
    
    db.add(folder)
    db.commit()
    db.refresh(folder)
    
    return folder

@router.delete("/{folder_id}")
def delete_folder(
    folder_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a folder and move its contents to parent folder"""
    
    folder = get_folder(db, folder_id, current_user)
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found or access denied")
    
    # Move all images in this folder to the parent folder (or root if no parent)
    db.query(Image).filter(Image.folder_id == folder_id).update({
        "folder_id": folder.parent_folder_id
    })
    
    # Move all subfolders to the parent folder
    db.query(Folder).filter(Folder.parent_folder_id == folder_id).update({
        "parent_folder_id": folder.parent_folder_id
    })
    
    # Delete the folder
    db.delete(folder)
    db.commit()
    
    return {"message": "Folder deleted successfully"} 