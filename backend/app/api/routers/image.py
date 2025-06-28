from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from app.schemas.image import ImageCreate, ImageResponse
from app.core.dependencies import get_db, oauth2_scheme
from app.models.image import Image
from app.models.user import User
from app.models.project import Project
from app.api.endpoints.user.functions import get_current_user
from app.api.endpoints.project.functions import get_project

router = APIRouter(prefix="/images", tags=["images"])

@router.post("/upload", response_model=ImageResponse)
def upload_image(
    file: UploadFile = File(...),
    project_id: int = Form(...),
    assigned_user_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload an image to a specific project"""
    # Check if user has access to the project
    project = get_project(db, project_id, current_user)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or access denied")
    
    # TODO: Validate DICOM, upload to Orthanc, get orthanc_id
    # For now, stub orthanc_id
    orthanc_id = f"stub-orthanc-id-{project_id}"
    
    image = Image(
        orthanc_id=orthanc_id,
        uploader_id=current_user.id,
        project_id=project_id,
        assigned_user_id=assigned_user_id,
        upload_time=None,
        dicom_metadata=None,
        thumbnail_url=None,
    )
    db.add(image)
    db.commit()
    db.refresh(image)
    return image

@router.get("/", response_model=List[ImageResponse])
def list_images(
    project_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List images - optionally filtered by project"""
    query = db.query(Image)
    
    if project_id:
        # Check if user has access to the project
        project = get_project(db, project_id, current_user)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found or access denied")
        query = query.filter(Image.project_id == project_id)
    else:
        # Only show images from projects where user is a member
        query = query.join(Project).join(Project.members).filter(
            Project.members.any(id=current_user.id)
        )
    
    images = query.all()
    return images

@router.get("/{image_id}", response_model=ImageResponse)
def get_image(
    image_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific image (only if user has access to the project)"""
    image = db.query(Image).filter(Image.id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    # Check if user has access to the project
    project = get_project(db, image.project_id, current_user)
    if not project:
        raise HTTPException(status_code=404, detail="Access denied")
    
    return image

@router.patch("/{image_id}/assign", response_model=ImageResponse)
def assign_image(
    image_id: int,
    assigned_user_id: int = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Assign an image to a user (only project owner/admin can assign)"""
    image = db.query(Image).filter(Image.id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    # Check if user has admin access to the project
    project = get_project(db, image.project_id, current_user)
    if not project:
        raise HTTPException(status_code=404, detail="Access denied")
    
    # Check if current user is owner or admin
    member_role = db.execute(
        Project.project_users.select().where(
            Project.project_users.c.project_id == image.project_id,
            Project.project_users.c.user_id == current_user.id
        )
    ).first()
    
    if not member_role or member_role.role not in ['owner', 'admin']:
        raise HTTPException(status_code=403, detail="Only project owners and admins can assign images")
    
    # Check if assigned user is a member of the project
    assigned_member = db.execute(
        Project.project_users.select().where(
            Project.project_users.c.project_id == image.project_id,
            Project.project_users.c.user_id == assigned_user_id
        )
    ).first()
    
    if not assigned_member:
        raise HTTPException(status_code=400, detail="Assigned user is not a member of this project")
    
    image.assigned_user_id = assigned_user_id
    db.add(image)
    db.commit()
    db.refresh(image)
    return image 