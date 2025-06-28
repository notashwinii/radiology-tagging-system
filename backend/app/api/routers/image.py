from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status, Form
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from app.schemas.image import ImageCreate, ImageResponse
from app.core.dependencies import get_db, oauth2_scheme
from app.models.image import Image
from app.models.user import User
from app.models.project import Project
from app.api.endpoints.user.functions import get_current_user
from app.api.endpoints.project.functions import get_project
import requests
import os
from fastapi.responses import StreamingResponse
import uuid
from io import BytesIO
import struct

router = APIRouter(prefix="/images", tags=["images"])

ORTHANC_URL = os.getenv("ORTHANC_URL", "http://localhost:8042")
ORTHANC_USERNAME = os.getenv("ORTHANC_USERNAME", "orthancadmin")
ORTHANC_PASSWORD = os.getenv("ORTHANC_PASSWORD", "change_this_password")

def upload_to_orthanc(file):
    """Upload DICOM file to Orthanc server"""
    url = f"{ORTHANC_URL}/instances"
    auth = (ORTHANC_USERNAME, ORTHANC_PASSWORD)
    
    # Reset file position to beginning
    file.seek(0)
    
    try:
        print(f"Uploading DICOM file to Orthanc: {url}")
        response = requests.post(url, data=file, auth=auth, timeout=30)
        response.raise_for_status()
        
        result = response.json()
        orthanc_id = result["ID"]
        print(f"Successfully uploaded to Orthanc with ID: {orthanc_id}")
        return orthanc_id
        
    except requests.exceptions.RequestException as e:
        print(f"Error uploading to Orthanc: {e}")
        raise Exception(f"Failed to upload to Orthanc server: {str(e)}")
    except KeyError as e:
        print(f"Invalid response from Orthanc: {e}")
        raise Exception("Invalid response from Orthanc server")
    except Exception as e:
        print(f"Unexpected error uploading to Orthanc: {e}")
        raise Exception(f"Unexpected error: {str(e)}")

def get_orthanc_instance(orthanc_id):
    """Download DICOM file from Orthanc server"""
    url = f"{ORTHANC_URL}/instances/{orthanc_id}/file"
    auth = (ORTHANC_USERNAME, ORTHANC_PASSWORD)
    response = requests.get(url, auth=auth, stream=True)
    response.raise_for_status()
    return response

def get_orthanc_wado(orthanc_id):
    """Get DICOM file from Orthanc for WADO-URI"""
    url = f"{ORTHANC_URL}/instances/{orthanc_id}/file"
    auth = (ORTHANC_USERNAME, ORTHANC_PASSWORD)
    response = requests.get(url, auth=auth, stream=True)
    response.raise_for_status()
    return response

@router.post("/upload", response_model=ImageResponse)
def upload_image(
    file: UploadFile = File(...),
    project_id: int = Form(...),
    assigned_user_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload an image to a specific project (DICOM only)"""
    
    try:
        print(f"Starting upload for file: {file.filename}")
        print(f"Project ID: {project_id}, Assigned User ID: {assigned_user_id}")
        print(f"Current user: {current_user.email}")
        
        # Validate file type
        if not file.filename.lower().endswith(('.dcm', '.dicom')):
            raise HTTPException(status_code=400, detail="Only DICOM files (.dcm, .dicom) are allowed")
        
        # Validate file size (max 100MB)
        file.file.seek(0, 2)  # Seek to end
        file_size = file.file.tell()
        file.file.seek(0)  # Reset to beginning
        
        print(f"File size: {file_size} bytes")
        
        if file_size > 100 * 1024 * 1024:  # 100MB
            raise HTTPException(status_code=400, detail="File size too large. Maximum size is 100MB")
        
        project = get_project(db, project_id, current_user)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found or access denied")
        
        print(f"Project found: {project['name']}")
        
        # Upload to Orthanc
        orthanc_id = None
        try:
            orthanc_id = upload_to_orthanc(file.file)
        except Exception as e:
            print(f"Orthanc upload failed: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to upload to DICOM server: {str(e)}")
        
        # Fetch DICOM metadata from Orthanc
        dicom_metadata = None
        try:
            meta_url = f"{ORTHANC_URL}/instances/{orthanc_id}/tags?simplify"
            auth = (ORTHANC_USERNAME, ORTHANC_PASSWORD)
            print(f"Fetching DICOM metadata from: {meta_url}")
            meta_resp = requests.get(meta_url, auth=auth, timeout=10)
            if meta_resp.ok:
                dicom_metadata = meta_resp.json()
                print(f"Successfully extracted DICOM metadata with {len(dicom_metadata)} tags")
            else:
                print(f"Failed to fetch metadata: {meta_resp.status_code}")
        except Exception as e:
            print(f"Warning: Could not fetch DICOM metadata: {e}")
            # Continue without metadata - not critical for upload
        
        # Create image record
        image = Image(
            orthanc_id=orthanc_id,
            uploader_id=current_user.id,
            project_id=project_id,
            assigned_user_id=assigned_user_id,
            upload_time=None,
            dicom_metadata=dicom_metadata,
            thumbnail_url=None,
        )
        db.add(image)
        db.commit()
        db.refresh(image)
        
        # Load relationships for response
        image = db.query(Image).options(
            joinedload(Image.uploader),
            joinedload(Image.assigned_user)
        ).filter(Image.id == image.id).first()
        
        print(f"Successfully created image record with ID: {image.id} and Orthanc ID: {orthanc_id}")
        return image
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        print(f"Unexpected error in upload_image: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/", response_model=List[ImageResponse])
def list_images(
    project_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List images - optionally filtered by project"""
    query = db.query(Image).options(
        joinedload(Image.uploader),
        joinedload(Image.assigned_user)
    )
    
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
    image = db.query(Image).options(
        joinedload(Image.uploader),
        joinedload(Image.assigned_user)
    ).filter(Image.id == image_id).first()
    
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
    image = db.query(Image).options(
        joinedload(Image.uploader),
        joinedload(Image.assigned_user)
    ).filter(Image.id == image_id).first()
    
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
    
    # Reload the image with relationships
    image = db.query(Image).options(
        joinedload(Image.uploader),
        joinedload(Image.assigned_user)
    ).filter(Image.id == image_id).first()
    
    return image

@router.get("/download/{image_id}")
def download_image(
    image_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Download/export a DICOM file securely via backend"""
    image = db.query(Image).filter(Image.id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    project = get_project(db, image.project_id, current_user)
    if not project:
        raise HTTPException(status_code=404, detail="Access denied")
    response = get_orthanc_instance(image.orthanc_id)
    return StreamingResponse(response.raw, media_type="application/dicom", headers={
        "Content-Disposition": f"attachment; filename=image_{image_id}.dcm"
    })

@router.get("/wado/{orthanc_id}")
def wado_image(
    orthanc_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Serve DICOM file for Cornerstone.js via backend (WADO-URI)"""
    image = db.query(Image).filter(Image.orthanc_id == orthanc_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    project = get_project(db, image.project_id, current_user)
    if not project:
        raise HTTPException(status_code=404, detail="Access denied")
    response = get_orthanc_wado(image.orthanc_id)
    return StreamingResponse(response.raw, media_type="application/dicom") 