from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.schemas.annotation import (
    AnnotationCreate, AnnotationUpdate, AnnotationResponse, AnnotationHistoryResponse
)
from app.core.dependencies import get_db, oauth2_scheme
from app.models.annotation import Annotation, AnnotationHistory, ReviewStatus
from app.models.user import User
from app.api.endpoints.user.functions import get_current_user

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