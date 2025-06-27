from fastapi import APIRouter, Depends
from typing import List
from app.core.dependencies import get_db
from app.api.endpoints.user.functions import get_current_user
from app.models.user import User

router = APIRouter(prefix="/tags", tags=["tags"])

@router.get("/suggest/{image_id}")
def suggest_tags(image_id: int, db=Depends(get_db), current_user: User = Depends(get_current_user)):
    # Stub: Return example tags with confidence scores
    return [
        {"tag": "pneumonia", "confidence": 0.85},
        {"tag": "normal", "confidence": 0.60},
        {"tag": "fracture", "confidence": 0.40},
    ] 