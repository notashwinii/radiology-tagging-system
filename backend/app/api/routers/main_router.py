from fastapi import APIRouter
from app.api.routers import user, project, image, folder, workspace
from app.api.routers.annotation import router as annotation_router
from app.api.routers.tag import router as tag_router

router = APIRouter()

router.include_router(user.user_router)
router.include_router(project.project_router)
router.include_router(image.router)
router.include_router(folder.router)
router.include_router(workspace.router)
router.include_router(annotation_router)
router.include_router(tag_router)


