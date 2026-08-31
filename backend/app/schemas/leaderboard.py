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

class LeaderboardEntryCreate(BaseModel):
    username: str
    avatar_url: Optional[str] = None
    mode: str = "all"
    high_score: int
    max_combo: int
    peak_velocity: float
    punches_thrown: int

class LeaderboardEntryResponse(BaseModel):
    rank: int
    username: str
    mode: str
    high_score: int
    max_combo: int
    peak_velocity: float
    punches_thrown: int
    updated_at: Optional[datetime] = None

class LeaderboardListResponse(BaseModel):
    mode: str
    total_entries: int
    entries: List[LeaderboardEntryResponse]
    cached_in_redis: bool = True
