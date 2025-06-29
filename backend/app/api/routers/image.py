from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status, Form
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from app.schemas.image import ImageCreate, ImageResponse, ImageUpdate
from app.core.dependencies import get_db, oauth2_scheme
from app.models.image import Image
from app.models.user import User
from app.models.project import Project
from app.models.folder import Folder
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
    
    try:
        print(f"Attempting to download DICOM from Orthanc: {url}")
        response = requests.get(url, auth=auth, stream=True, timeout=30)
        response.raise_for_status()
        print(f"Successfully downloaded DICOM from Orthanc")
        return response
    except requests.exceptions.ConnectionError as e:
        print(f"Connection error to Orthanc server: {e}")
        raise Exception(f"Failed to connect to Orthanc server at {ORTHANC_URL}. Please check if Orthanc is running.")
    except requests.exceptions.Timeout as e:
        print(f"Timeout error to Orthanc server: {e}")
        raise Exception(f"Timeout connecting to Orthanc server. Please check if Orthanc is running.")
    except requests.exceptions.HTTPError as e:
        print(f"HTTP error from Orthanc server: {e}")
        if response.status_code == 404:
            raise Exception(f"DICOM instance {orthanc_id} not found in Orthanc server.")
        else:
            raise Exception(f"Orthanc server returned error {response.status_code}: {response.text}")
    except requests.exceptions.RequestException as e:
        print(f"Request error to Orthanc server: {e}")
        raise Exception(f"Failed to download from Orthanc server: {str(e)}")
    except Exception as e:
        print(f"Unexpected error downloading from Orthanc: {e}")
        raise Exception(f"Unexpected error: {str(e)}")

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
    folder_id: Optional[int] = Form(None),
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
        
        # Check if image already exists in this project and folder
        existing_image = db.query(Image).filter(
            Image.orthanc_id == orthanc_id,
            Image.project_id == project_id,
            Image.folder_id == folder_id
        ).first()
        
        if existing_image:
            raise HTTPException(
                status_code=409, 
                detail=f"Image already exists in this folder within this project (Orthanc ID: {orthanc_id})"
            )
        
        # Validate folder if specified
        if folder_id:
            folder = db.query(Folder).filter(
                Folder.id == folder_id,
                Folder.project_id == project_id
            ).first()
            if not folder:
                raise HTTPException(status_code=404, detail="Folder not found or does not belong to this project")
        
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
            folder_id=folder_id,
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
            joinedload(Image.assigned_user),
            joinedload(Image.folder)
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
def get_images(
    project_id: Optional[int] = None,
    folder_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get images for the current user, optionally filtered by project and folder"""
    
    query = db.query(Image).join(Project).join(
        Project.members
    ).filter(
        Project.members.any(id=current_user.id)
    )
    
    if project_id:
        query = query.filter(Image.project_id == project_id)
    
    if folder_id:
        query = query.filter(Image.folder_id == folder_id)
    
    images = query.options(
        joinedload(Image.uploader),
        joinedload(Image.assigned_user),
        joinedload(Image.folder)
    ).all()
    
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
        joinedload(Image.assigned_user),
        joinedload(Image.folder)
    ).filter(Image.id == image_id).first()
    
    return image

@router.get("/download/{image_id}")
def download_image(
    image_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Download/export a DICOM file securely via backend"""
    try:
        print(f"Download request for image ID: {image_id} by user: {current_user.email}")
        
        image = db.query(Image).filter(Image.id == image_id).first()
        if not image:
            print(f"Image not found: {image_id}")
            raise HTTPException(status_code=404, detail="Image not found")
        
        project = get_project(db, image.project_id, current_user)
        if not project:
            print(f"Access denied for user {current_user.email} to image {image_id}")
            raise HTTPException(status_code=404, detail="Access denied")
        
        print(f"Downloading DICOM for image {image_id} (Orthanc ID: {image.orthanc_id})")
        response = get_orthanc_instance(image.orthanc_id)
        
        print(f"Successfully prepared DICOM download for image {image_id}")
        return StreamingResponse(response.raw, media_type="application/dicom", headers={
            "Content-Disposition": f"attachment; filename=image_{image_id}.dcm"
        })
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        print(f"Error downloading image {image_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to download image: {str(e)}")

@router.get("/wado/{image_id}")
def wado_image(
    image_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Serve DICOM file for Cornerstone.js via backend (WADO-URI)"""
    image = db.query(Image).filter(Image.id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    project = get_project(db, image.project_id, current_user)
    if not project:
        raise HTTPException(status_code=404, detail="Access denied")
    response = get_orthanc_wado(image.orthanc_id)
    return StreamingResponse(response.raw, media_type="application/dicom")

@router.post("/bulk-upload", response_model=List[ImageResponse])
def bulk_upload_images(
    files: List[UploadFile] = File(...),
    project_id: int = Form(...),
    folder_id: Optional[int] = Form(None),
    assigned_user_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload multiple images to a specific project (DICOM only)"""
    
    try:
        print(f"Starting bulk upload for {len(files)} files")
        print(f"Project ID: {project_id}, Assigned User ID: {assigned_user_id}")
        print(f"Current user: {current_user.email}")
        
        # Validate project access
        project = get_project(db, project_id, current_user)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found or access denied")
        
        print(f"Project found: {project['name']}")
        
        uploaded_images = []
        skipped_images = []
        failed_images = []
        
        for i, file in enumerate(files):
            try:
                print(f"Processing file {i+1}/{len(files)}: {file.filename}")
                
                # Validate file type
                if not file.filename.lower().endswith(('.dcm', '.dicom')):
                    failed_images.append({
                        'filename': file.filename,
                        'error': 'Only DICOM files (.dcm, .dicom) are allowed'
                    })
                    continue
                
                # Validate file size (max 100MB)
                file.file.seek(0, 2)  # Seek to end
                file_size = file.file.tell()
                file.file.seek(0)  # Reset to beginning
                
                if file_size > 100 * 1024 * 1024:  # 100MB
                    failed_images.append({
                        'filename': file.filename,
                        'error': 'File size too large. Maximum size is 100MB'
                    })
                    continue
                
                # Upload to Orthanc
                orthanc_id = None
                try:
                    orthanc_id = upload_to_orthanc(file.file)
                except Exception as e:
                    print(f"Orthanc upload failed for {file.filename}: {e}")
                    failed_images.append({
                        'filename': file.filename,
                        'error': f'Failed to upload to DICOM server: {str(e)}'
                    })
                    continue
                
                # Check if image already exists in this project and folder
                existing_image = db.query(Image).filter(
                    Image.orthanc_id == orthanc_id,
                    Image.project_id == project_id,
                    Image.folder_id == folder_id
                ).first()
                
                if existing_image:
                    print(f"Image already exists in project folder: {file.filename}")
                    skipped_images.append({
                        'filename': file.filename,
                        'orthanc_id': orthanc_id,
                        'reason': 'Image already exists in this folder within this project'
                    })
                    continue
                
                # Validate folder if specified
                if folder_id:
                    folder = db.query(Folder).filter(
                        Folder.id == folder_id,
                        Folder.project_id == project_id
                    ).first()
                    if not folder:
                        raise HTTPException(status_code=404, detail="Folder not found or does not belong to this project")
                
                # Fetch DICOM metadata from Orthanc
                dicom_metadata = None
                try:
                    meta_url = f"{ORTHANC_URL}/instances/{orthanc_id}/tags?simplify"
                    auth = (ORTHANC_USERNAME, ORTHANC_PASSWORD)
                    meta_resp = requests.get(meta_url, auth=auth, timeout=10)
                    if meta_resp.ok:
                        dicom_metadata = meta_resp.json()
                    else:
                        print(f"Failed to fetch metadata for {file.filename}: {meta_resp.status_code}")
                except Exception as e:
                    print(f"Warning: Could not fetch DICOM metadata for {file.filename}: {e}")
                
                # Create image record
                image = Image(
                    orthanc_id=orthanc_id,
                    uploader_id=current_user.id,
                    project_id=project_id,
                    folder_id=folder_id,
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
                    joinedload(Image.assigned_user),
                    joinedload(Image.folder)
                ).filter(Image.id == image.id).first()
                
                uploaded_images.append(image)
                print(f"Successfully uploaded: {file.filename} (ID: {image.id})")
                
            except Exception as e:
                print(f"Error processing {file.filename}: {e}")
                failed_images.append({
                    'filename': file.filename,
                    'error': str(e)
                })
                continue
        
        # Return summary
        result = {
            'uploaded_images': uploaded_images,
            'skipped_images': skipped_images,
            'failed_images': failed_images,
            'summary': {
                'total_files': len(files),
                'uploaded': len(uploaded_images),
                'skipped': len(skipped_images),
                'failed': len(failed_images)
            }
        }
        
        print(f"Bulk upload completed. Uploaded: {len(uploaded_images)}, Skipped: {len(skipped_images)}, Failed: {len(failed_images)}")
        
        # For now, return just the uploaded images to maintain compatibility
        # In the future, we could create a proper response model for bulk upload results
        return uploaded_images
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Unexpected error in bulk_upload_images: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.patch("/{image_id}", response_model=ImageResponse)
def update_image(
    image_id: int,
    image_data: ImageUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update image details (assignment, folder)"""
    
    # Get the image
    image = db.query(Image).filter(Image.id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    # Check project access
    project = get_project(db, image.project_id, current_user)
    if not project:
        raise HTTPException(status_code=404, detail="Access denied")
    
    # Update fields if provided
    if image_data.assigned_user_id is not None:
        # Validate assigned user is a project member
        assigned_user = db.query(User).filter(User.id == image_data.assigned_user_id).first()
        if not assigned_user:
            raise HTTPException(status_code=404, detail="Assigned user not found")
        
        # Check if user is a project member
        project_member = db.query(Project).join(Project.members).filter(
            Project.id == image.project_id,
            Project.members.any(id=assigned_user.id)
        ).first()
        
        if not project_member:
            raise HTTPException(status_code=400, detail="Assigned user is not a project member")
        
        image.assigned_user_id = image_data.assigned_user_id
    
    if image_data.folder_id is not None:
        # Validate folder belongs to the project
        if image_data.folder_id:
            folder = db.query(Folder).filter(
                Folder.id == image_data.folder_id,
                Folder.project_id == image.project_id
            ).first()
            if not folder:
                raise HTTPException(status_code=404, detail="Folder not found or does not belong to this project")
        image.folder_id = image_data.folder_id
    
    db.commit()
    db.refresh(image)
    
    # Load relationships for response
    image = db.query(Image).options(
        joinedload(Image.uploader),
        joinedload(Image.assigned_user),
        joinedload(Image.folder)
    ).filter(Image.id == image_id).first()
    
    return image

@router.delete("/{image_id}")
def delete_image(
    image_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an image"""
    
    # Get the image
    image = db.query(Image).filter(Image.id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    # Check project access
    project = get_project(db, image.project_id, current_user)
    if not project:
        raise HTTPException(status_code=404, detail="Access denied")
    
    # Delete from Orthanc (optional - you might want to keep the DICOM file)
    try:
        delete_url = f"{ORTHANC_URL}/instances/{image.orthanc_id}"
        auth = (ORTHANC_USERNAME, ORTHANC_PASSWORD)
        response = requests.delete(delete_url, auth=auth, timeout=10)
        if response.ok:
            print(f"Successfully deleted from Orthanc: {image.orthanc_id}")
        else:
            print(f"Warning: Failed to delete from Orthanc: {response.status_code}")
    except Exception as e:
        print(f"Warning: Could not delete from Orthanc: {e}")
    
    # Delete from database
    db.delete(image)
    db.commit()
    
    return {"message": "Image deleted successfully"} 