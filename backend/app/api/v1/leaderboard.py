from fastapi import APIRouter, Query
from app.schemas.leaderboard import LeaderboardListResponse, LeaderboardEntryCreate, LeaderboardEntryResponse
from app.services.leaderboard_service import LeaderboardService

router = APIRouter()

@router.get("/", response_model=LeaderboardListResponse)
async def get_leaderboard(
    mode: str = Query("all", description="Workout mode: all, cardio, power, defense"),
    limit: int = Query(10, ge=1, le=100)
):
    return await LeaderboardService.get_top_leaderboard(mode=mode, limit=limit)

@router.post("/score", response_model=LeaderboardEntryResponse)
async def submit_score(entry: LeaderboardEntryCreate):
    return await LeaderboardService.record_score(entry)
