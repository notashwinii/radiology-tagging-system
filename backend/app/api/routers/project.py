from fastapi import APIRouter
from app.api.endpoints.project.project import project_module

project_router = APIRouter()

project_router.include_router(
    project_module,
    prefix="/projects",
    tags=["projects"],
    responses={404: {"description": "Not found"}},
) 