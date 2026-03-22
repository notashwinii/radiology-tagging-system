# fastapi 
from fastapi import FastAPI
from fastapi.middleware import Middleware
from fastapi.middleware.cors import CORSMiddleware
from typing import List

# sqlalchemy
from sqladmin import Admin, ModelView

# import 
from app.core.database import engine
from app.core.settings import BACKEND_CORS_ORIGINS
from app.models.admin import UserAdmin
from app.api.routers.main_router import router
# from app.core.settings import config

def init_routers(app_: FastAPI) -> None:
    app_.include_router(router)
    # admin dashboard 
    admin = Admin(app_, engine)
    admin.add_view(UserAdmin)


def make_middleware() -> List[Middleware]:
    middleware = [
        Middleware(
            CORSMiddleware,
            allow_origins=BACKEND_CORS_ORIGINS,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        ),
        # Middleware(SQLAlchemyMiddleware),
    ]
    return middleware
