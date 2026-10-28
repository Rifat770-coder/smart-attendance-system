import hashlib

# Python 3.8 hashlib compatibility for reportlab
_orig_md5 = hashlib.md5
def _safe_md5(*args, **kwargs):
    kwargs.pop("usedforsecurity", None)
    return _orig_md5(*args, **kwargs)
hashlib.md5 = _safe_md5

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.redis import get_redis_client, close_redis_client
from app.api.v1.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure Redis connection is warm
    try:
        redis = await get_redis_client()
        await redis.ping()
    except Exception as e:
        print(f"Warning: Could not connect to Redis on startup: {e}")
    yield
    # Shutdown: clean up connection pools
    await close_redis_client()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan,
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API v1 Router
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/health")
async def root_health():
    """Service health check."""
    return {"status": "ok", "app": settings.PROJECT_NAME, "version": settings.VERSION}


@app.get("/")
async def root_welcome():
    """Root info endpoint."""
    return {
        "name": settings.PROJECT_NAME,
        "docs": f"{settings.API_V1_STR}/docs",
        "api": settings.API_V1_STR,
    }
