import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.redis import redis_client
from app.services.leaderboard_service import LeaderboardService
from app.api.v1.router import api_router
from app.ws.sparring import ws_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Shadow Boxer backend services...")
    await redis_client.init(settings.REDIS_URL)
    await LeaderboardService.seed_initial_leaderboard()
    logger.info("Redis Leaderboard seeded with initial champions.")
    yield
    logger.info("Shutting down Shadow Boxer backend...")
    await redis_client.close()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="High-performance distributed backend for real-time AI boxing telemetry, Redis leaderboards, and WebRTC multiplayer sparring.",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(api_router, prefix=settings.API_V1_PREFIX)
app.include_router(ws_router)

@app.get("/", tags=["Root"])
async def root():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": "/docs",
        "endpoints": {
            "sessions": f"{settings.API_V1_PREFIX}/sessions",
            "leaderboard": f"{settings.API_V1_PREFIX}/leaderboard",
            "analytics": f"{settings.API_V1_PREFIX}/analytics",
            "webrtc": f"{settings.API_V1_PREFIX}/webrtc",
            "websocket_sparring": "/ws/sparring/{room_id}",
        },
    }

@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "database": "connected",
        "redis": "ready",
    }
