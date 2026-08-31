from typing import List, Optional, Any, Dict
from datetime import datetime

try:
    from pydantic import BaseModel
except ImportError:
    class BaseModel:
        def __init__(self, **kwargs):
            for k, v in kwargs.items():
                setattr(self, k, v)
        def model_dump(self) -> Dict[str, Any]:
            return {k: v for k, v in self.__dict__.items() if not k.startswith("_")}

class Landmark3D(BaseModel):
    x: float
    y: float
    z: float
    visibility: Optional[float] = 1.0

class StrikeLogCreate(BaseModel):
    id: Optional[str] = None
    timestamp: float
    strike_type: str
    hand: str
    velocity: float
    acceleration: float
    power: float
    extension: float
    alignment_score: float
    trajectory_quality: Optional[str] = "OPTIMAL"

class ReplayFrameCreate(BaseModel):
    frame_index: int
    timestamp: float
    pose_landmarks: List[Any]

class WorkoutSessionCreate(BaseModel):
    id: Optional[str] = None
    user_id: str
    username: Optional[str] = "Contender"
    routine_name: Optional[str] = "Mixed Combos"
    duration_seconds: float
    total_punches: int
    peak_velocity: float
    avg_velocity: float
    peak_acceleration: float
    avg_power: float
    calories_burned: float
    highest_combo: int
    accuracy_score: float
    strikes: Optional[List[StrikeLogCreate]] = []
    replays: Optional[List[ReplayFrameCreate]] = []

class WorkoutSessionResponse(BaseModel):
    id: str
    user_id: str
    routine_name: str
    start_time: datetime
    duration_seconds: float
    total_punches: int
    peak_velocity: float
    avg_velocity: float
    avg_power: float
    calories_burned: float
    highest_combo: int
    accuracy_score: float

class SessionAnalyticsSummary(BaseModel):
    total_workouts: int
    total_punches_all_time: int
    total_calories_burned: float
    career_peak_velocity: float
    favorite_strike: str
    average_accuracy: float
    velocity_curve_samples: List[dict]
    strike_distribution: dict
