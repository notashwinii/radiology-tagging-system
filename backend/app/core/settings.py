import logging
import os
from pathlib import Path

from dotenv import load_dotenv


ROOT_ENV_FILE = Path(__file__).resolve().parents[3] / ".env"
load_dotenv(ROOT_ENV_FILE)


def get_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


DATABASE_URL = (
    f"postgresql://{get_env('DB_USER')}:{get_env('DB_PASSWORD')}"
    f"@{get_env('DB_HOST')}:{get_env('DB_PORT')}/{get_env('DB_NAME')}"
)

SECRET_KEY = get_env("SECRET_KEY")
REFRESH_SECRET_KEY = get_env("REFRESH_SECRET_KEY")
ALGORITHM = get_env("JWT_ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = int(get_env("ACCESS_TOKEN_EXPIRE_MINUTES"))
REFRESH_TOKEN_EXPIRE_DAYS = int(get_env("REFRESH_TOKEN_EXPIRE_DAYS"))

FRONTEND_URL = get_env("FRONTEND_URL")


def get_cors_origins() -> list[str]:
    configured_origins = os.getenv("BACKEND_CORS_ORIGINS", FRONTEND_URL)
    origins = []
    for origin in configured_origins.split(","):
        cleaned = origin.strip().rstrip("/")
        if cleaned and cleaned not in origins:
            origins.append(cleaned)
    return origins


BACKEND_CORS_ORIGINS = get_cors_origins()

ORTHANC_URL = get_env("ORTHANC_URL")
ORTHANC_USERNAME = get_env("ORTHANC_USERNAME")
ORTHANC_PASSWORD = get_env("ORTHANC_PASSWORD")


logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)
