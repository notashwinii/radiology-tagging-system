from fastapi import APIRouter
from app.api.routers.user import user_router
from app.api.routers.project import project_router
from app.api.routers.image import router as image_router
from app.api.routers.annotation import router as annotation_router
from app.api.routers.tag import router as tag_router

router = APIRouter()

router.include_router(user_router)
router.include_router(project_router)
router.include_router(image_router)
router.include_router(annotation_router)
router.include_router(tag_router)


