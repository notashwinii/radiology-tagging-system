from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from typing import List
from app.schemas.annotation import (
    AnnotationCreate, AnnotationUpdate, AnnotationResponse, AnnotationHistoryResponse
)
from app.core.dependencies import get_db, oauth2_scheme
from app.models.annotation import Annotation, AnnotationHistory, ReviewStatus
from app.models.user import User
from app.models.image import Image
from app.api.endpoints.user.functions import get_current_user
import json
import zipfile
import io
from datetime import datetime
import os
import requests

# Orthanc configuration (copied from image router)
ORTHANC_URL = os.getenv("ORTHANC_URL", "http://localhost:8042")
ORTHANC_USERNAME = os.getenv("ORTHANC_USERNAME", "orthancadmin")
ORTHANC_PASSWORD = os.getenv("ORTHANC_PASSWORD", "change_this_password")

def get_orthanc_instance(orthanc_id: str) -> bytes:
    """Download DICOM file from Orthanc server"""
    url = f"{ORTHANC_URL}/instances/{orthanc_id}/file"
    auth = (ORTHANC_USERNAME, ORTHANC_PASSWORD)
    
    try:
        response = requests.get(url, auth=auth)
        response.raise_for_status()
        return response.content
    except requests.exceptions.RequestException as e:
        print(f"Error downloading from Orthanc: {e}")
        raise Exception(f"Failed to download from Orthanc server: {str(e)}")

router = APIRouter(prefix="/annotations", tags=["annotations"])

@router.post("/", response_model=AnnotationResponse)
def create_annotation(
    annotation: AnnotationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ann = Annotation(
        image_id=annotation.image_id,
        user_id=current_user.id,
        bounding_boxes=[box.dict() for box in annotation.bounding_boxes],
        tags=annotation.tags,
        version=1,
        review_status=ReviewStatus.PENDING,
        timestamp=None,
    )
    db.add(ann)
    db.commit()
    db.refresh(ann)
    return ann

@router.get("/image/{image_id}", response_model=List[AnnotationResponse])
def get_annotations_for_image(
    image_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    anns = db.query(Annotation).filter(Annotation.image_id == image_id).all()
    return anns

@router.patch("/{annotation_id}", response_model=AnnotationResponse)
def update_annotation(
    annotation_id: int,
    annotation: AnnotationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ann = db.query(Annotation).filter(Annotation.id == annotation_id).first()
    if not ann:
        raise HTTPException(status_code=404, detail="Annotation not found")
    # TODO: Add versioning and audit log
    if annotation.bounding_boxes is not None:
        ann.bounding_boxes = [box.dict() for box in annotation.bounding_boxes]
    if annotation.tags is not None:
        ann.tags = annotation.tags
    if annotation.review_status is not None:
        ann.review_status = annotation.review_status
    db.commit()
    db.refresh(ann)
    return ann

@router.get("/{annotation_id}/history", response_model=List[AnnotationHistoryResponse])
def get_annotation_history(
    annotation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    history = db.query(AnnotationHistory).filter(AnnotationHistory.annotation_id == annotation_id).all()
    return history

@router.get("/image/{image_id}/download")
def download_image_annotations(
    image_id: int,
    format: str = "json",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Download annotations for a specific image in various formats"""
    
    # Get image and verify access
    image = db.query(Image).filter(Image.id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    # Get annotations
    annotations = db.query(Annotation).filter(Annotation.image_id == image_id).all()
    
    if format == "json":
        # Export as JSON
        annotation_data = {
            "image_id": image_id,
            "orthanc_id": image.orthanc_id,
            "exported_at": datetime.utcnow().isoformat(),
            "annotations": [
                {
                    "id": ann.id,
                    "user_id": ann.user_id,
                    "version": ann.version,
                    "bounding_boxes": ann.bounding_boxes,
                    "tags": ann.tags,
                    "review_status": ann.review_status.value,
                    "timestamp": ann.timestamp.isoformat() if ann.timestamp else None
                }
                for ann in annotations
            ]
        }
        
        return Response(
            content=json.dumps(annotation_data, indent=2),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=annotations_image_{image_id}.json"}
        )
    
    elif format == "csv":
        # Export as CSV
        csv_content = "annotation_id,user_id,version,x,y,w,h,label,tags,review_status,timestamp\n"
        
        for ann in annotations:
            for box in ann.bounding_boxes:
                csv_content += f"{ann.id},{ann.user_id},{ann.version},{box.get('x', '')},{box.get('y', '')},{box.get('w', '')},{box.get('h', '')},{box.get('label', '')},{','.join(ann.tags or [])},{ann.review_status.value},{ann.timestamp.isoformat() if ann.timestamp else ''}\n"
        
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=annotations_image_{image_id}.csv"}
        )
    
    else:
        raise HTTPException(status_code=400, detail="Unsupported format. Use 'json' or 'csv'")

@router.get("/image/{image_id}/export-dicom-seg")
def export_dicom_seg(
    image_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Export annotations as DICOM-SEG file"""
    
    # Get image and verify access
    image = db.query(Image).filter(Image.id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    # Get annotations
    annotations = db.query(Annotation).filter(Annotation.image_id == image_id).all()
    
    if not annotations:
        raise HTTPException(status_code=404, detail="No annotations found for this image")
    
    try:
        # Get original DICOM from Orthanc
        dicom_data = get_orthanc_instance(image.orthanc_id)
        
        # TODO: Implement DICOM-SEG creation
        # This would require a DICOM library like pydicom to create proper DICOM-SEG files
        # For now, return a placeholder response
        
        return Response(
            content="DICOM-SEG export not yet implemented",
            media_type="application/dicom",
            headers={"Content-Disposition": f"attachment; filename=segmentation_{image.orthanc_id}.dcm"}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export DICOM-SEG: {str(e)}")

@router.post("/bulk-export")
def bulk_export_annotations(
    image_ids: List[int],
    format: str = "zip",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Bulk export annotations for multiple images"""
    
    # Get images and verify access
    images = db.query(Image).filter(Image.id.in_(image_ids)).all()
    if not images:
        raise HTTPException(status_code=404, detail="No images found")
    
    # Get annotations for all images
    annotations = db.query(Annotation).filter(Annotation.image_id.in_(image_ids)).all()
    
    if format == "zip":
        # Create ZIP file with all annotations
        zip_buffer = io.BytesIO()
        
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            # Add JSON file with all annotations
            all_annotations = {
                "exported_at": datetime.utcnow().isoformat(),
                "total_images": len(images),
                "total_annotations": len(annotations),
                "images": []
            }
            
            for image in images:
                image_annotations = [ann for ann in annotations if ann.image_id == image.id]
                image_data = {
                    "image_id": image.id,
                    "orthanc_id": image.orthanc_id,
                    "annotations": [
                        {
                            "id": ann.id,
                            "user_id": ann.user_id,
                            "version": ann.version,
                            "bounding_boxes": ann.bounding_boxes,
                            "tags": ann.tags,
                            "review_status": ann.review_status.value,
                            "timestamp": ann.timestamp.isoformat() if ann.timestamp else None
                        }
                        for ann in image_annotations
                    ]
                }
                all_annotations["images"].append(image_data)
                
                # Add individual JSON file for each image
                zip_file.writestr(
                    f"annotations_image_{image.id}.json",
                    json.dumps(image_data, indent=2)
                )
            
            # Add summary file
            zip_file.writestr(
                "annotations_summary.json",
                json.dumps(all_annotations, indent=2)
            )
        
        zip_buffer.seek(0)
        
        return Response(
            content=zip_buffer.getvalue(),
            media_type="application/zip",
            headers={"Content-Disposition": f"attachment; filename=annotations_export_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.zip"}
        )
    
    else:
        raise HTTPException(status_code=400, detail="Unsupported format. Use 'zip'")

@router.get("/image/{image_id}/download-with-dicom")
def download_image_with_annotations(
    image_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Download DICOM image along with its annotations"""
    
    # Get image and verify access
    image = db.query(Image).filter(Image.id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    # Get annotations
    annotations = db.query(Annotation).filter(Annotation.image_id == image_id).all()
    
    try:
        # Get DICOM from Orthanc
        dicom_data = get_orthanc_instance(image.orthanc_id)
        
        # Create ZIP with DICOM and annotations
        zip_buffer = io.BytesIO()
        
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            # Add DICOM file
            zip_file.writestr(f"dicom_{image.orthanc_id}.dcm", dicom_data)
            
            # Add annotations JSON
            annotation_data = {
                "image_id": image_id,
                "orthanc_id": image.orthanc_id,
                "exported_at": datetime.utcnow().isoformat(),
                "annotations": [
                    {
                        "id": ann.id,
                        "user_id": ann.user_id,
                        "version": ann.version,
                        "bounding_boxes": ann.bounding_boxes,
                        "tags": ann.tags,
                        "review_status": ann.review_status.value,
                        "timestamp": ann.timestamp.isoformat() if ann.timestamp else None
                    }
                    for ann in annotations
                ]
            }
            
            zip_file.writestr(
                "annotations.json",
                json.dumps(annotation_data, indent=2)
            )
        
        zip_buffer.seek(0)
        
        return Response(
            content=zip_buffer.getvalue(),
            media_type="application/zip",
            headers={"Content-Disposition": f"attachment; filename=image_{image_id}_with_annotations.zip"}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to download image with annotations: {str(e)}") 