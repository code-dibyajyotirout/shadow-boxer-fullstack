import uuid
import datetime
from typing import List
from fastapi import APIRouter, HTTPException, Depends
from app.schemas.session import WorkoutSessionCreate, WorkoutSessionResponse
from app.services.leaderboard_service import LeaderboardService
from app.schemas.leaderboard import LeaderboardEntryCreate

router = APIRouter()

# In-memory storage for active sessions
_MOCK_SESSIONS: List[dict] = []

@router.post("/", response_model=WorkoutSessionResponse)
async def submit_workout_session(session: WorkoutSessionCreate):
    session_id = session.id or str(uuid.uuid4())
    session_dict = session.model_dump()
    session_dict["id"] = session_id
    session_dict["start_time"] = datetime.datetime.utcnow()
    _MOCK_SESSIONS.append(session_dict)

    # Automatically submit score to Redis leaderboard
    calculated_score = int(session.total_punches * session.avg_power + session.highest_combo * 100)
    await LeaderboardService.record_score(
        LeaderboardEntryCreate(
            username=session.username or "Contender",
            mode=session.routine_name.lower() if session.routine_name else "all",
            high_score=calculated_score,
            max_combo=session.highest_combo,
            peak_velocity=session.peak_velocity,
            punches_thrown=session.total_punches,
        )
    )

    return WorkoutSessionResponse(
        id=session_id,
        user_id=session.user_id,
        routine_name=session.routine_name or "Mixed Combos",
        start_time=session_dict["start_time"],
        duration_seconds=session.duration_seconds,
        total_punches=session.total_punches,
        peak_velocity=session.peak_velocity,
        avg_velocity=session.avg_velocity,
        avg_power=session.avg_power,
        calories_burned=session.calories_burned,
        highest_combo=session.highest_combo,
        accuracy_score=session.accuracy_score,
    )

@router.get("/{session_id}", response_model=WorkoutSessionResponse)
async def get_workout_session(session_id: str):
    for s in _MOCK_SESSIONS:
        if s["id"] == session_id:
            return WorkoutSessionResponse(**s)
    
    # Return synthetic session for recruiter demo if not found
    return WorkoutSessionResponse(
        id=session_id,
        user_id="recruiter_demo",
        routine_name="Cardio Blitz",
        start_time=datetime.datetime.utcnow() - datetime.timedelta(minutes=15),
        duration_seconds=900.0,
        total_punches=245,
        peak_velocity=5.6,
        avg_velocity=3.8,
        avg_power=82.0,
        calories_burned=145.5,
        highest_combo=24,
        accuracy_score=94.5,
    )

@router.get("/", response_model=List[WorkoutSessionResponse])
async def list_recent_sessions(limit: int = 10):
    if not _MOCK_SESSIONS:
        # Prepopulate demo sessions
        return [
            WorkoutSessionResponse(
                id="demo_session_1",
                user_id="iron_mike",
                routine_name="Heavy Hitter",
                start_time=datetime.datetime.utcnow() - datetime.timedelta(hours=2),
                duration_seconds=1200.0,
                total_punches=320,
                peak_velocity=5.8,
                avg_velocity=4.2,
                avg_power=88.5,
                calories_burned=192.0,
                highest_combo=28,
                accuracy_score=96.0,
            ),
            WorkoutSessionResponse(
                id="demo_session_2",
                user_id="speed_blitz",
                routine_name="Cardio Blitz",
                start_time=datetime.datetime.utcnow() - datetime.timedelta(hours=5),
                duration_seconds=850.0,
                total_punches=280,
                peak_velocity=5.3,
                avg_velocity=3.9,
                avg_power=79.0,
                calories_burned=138.0,
                highest_combo=34,
                accuracy_score=92.0,
            ),
        ]
    return [WorkoutSessionResponse(**s) for s in _MOCK_SESSIONS[-limit:]]
