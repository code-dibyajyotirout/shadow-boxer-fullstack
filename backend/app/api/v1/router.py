from fastapi import APIRouter
from app.api.v1.sessions import router as sessions_router
from app.api.v1.leaderboard import router as leaderboard_router
from app.api.v1.analytics import router as analytics_router
from app.api.v1.webrtc import router as webrtc_router

api_router = APIRouter()

api_router.include_router(sessions_router, prefix="/sessions", tags=["Workout Sessions"])
api_router.include_router(leaderboard_router, prefix="/leaderboard", tags=["Global Leaderboard"])
api_router.include_router(analytics_router, prefix="/analytics", tags=["Telemetry & Benchmarks"])
api_router.include_router(webrtc_router, prefix="/webrtc", tags=["WebRTC Signaling"])
