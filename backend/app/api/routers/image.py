from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.schemas.image import ImageCreate, ImageResponse
from app.core.dependencies import get_db, oauth2_scheme
from app.models.image import Image
from app.models.user import User
from app.api.endpoints.user.functions import get_current_user

router = APIRouter(prefix="/images", tags=["images"])

@router.post("/upload", response_model=ImageResponse)
def upload_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # TODO: Validate DICOM, upload to Orthanc, get orthanc_id
    # For now, stub orthanc_id
    orthanc_id = "stub-orthanc-id"
    image = Image(
        orthanc_id=orthanc_id,
        uploader_id=current_user.id,
        upload_time=None,
        metadata=None,
        thumbnail_url=None,
    )
    db.add(image)
    db.commit()
    db.refresh(image)
    return image

@router.get("/", response_model=List[ImageResponse])
def list_images(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    images = db.query(Image).all()
    return images

@router.get("/{image_id}", response_model=ImageResponse)
def get_image(
    image_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    image = db.query(Image).filter(Image.id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    return image 