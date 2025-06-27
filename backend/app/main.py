# fastapi
from fastapi import FastAPI
from fastapi.openapi.models import APIKey, APIKeyIn, SecuritySchemeType
from fastapi.openapi.utils import get_openapi
from app.core.modules import init_routers, make_middleware


def custom_openapi(app):
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT"
        }
    }
    for path in openapi_schema["paths"].values():
        for method in path.values():
            method.setdefault("security", []).append({"BearerAuth": []})
    app.openapi_schema = openapi_schema
    return app.openapi_schema

def create_app() -> FastAPI:
    app_ = FastAPI(
        title="FastAPI starter kit",
        description="FastAPI starter kit that is needed for every fastapi project. The repo is developed with 💗 by mahmud.",
        version="1.0.0",
        # dependencies=[Depends(Logging)],
        middleware=make_middleware(),
    )
    init_routers(app_=app_)
    app_.openapi = lambda: custom_openapi(app_)
    return app_


app = create_app()
