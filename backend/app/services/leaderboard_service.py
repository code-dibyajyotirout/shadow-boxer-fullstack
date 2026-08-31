import json
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from app.core.redis import redis_client
from app.core.config import settings
from app.schemas.leaderboard import LeaderboardEntryCreate, LeaderboardEntryResponse, LeaderboardListResponse

logger = logging.getLogger(__name__)

INITIAL_CHAMPIONS = [
    {"username": "IronMike_Prime", "mode": "power", "high_score": 14850, "max_combo": 28, "peak_velocity": 5.8, "punches_thrown": 240},
    {"username": "SpeedBlitz_99", "mode": "cardio", "high_score": 13920, "max_combo": 34, "peak_velocity": 5.4, "punches_thrown": 310},
    {"username": "MatrixSlip_Ghost", "mode": "defense", "high_score": 12400, "max_combo": 22, "peak_velocity": 4.9, "punches_thrown": 185},
    {"username": "CyberPuncher_X", "mode": "all", "high_score": 11800, "max_combo": 19, "peak_velocity": 5.1, "punches_thrown": 195},
    {"username": "NeonSlugger", "mode": "all", "high_score": 10500, "max_combo": 16, "peak_velocity": 4.7, "punches_thrown": 160},
]

class LeaderboardService:
    @staticmethod
    async def seed_initial_leaderboard():
        """Preloads global leaderboard records into Redis."""
        client = redis_client.client
        for champ in INITIAL_CHAMPIONS:
            key = f"{settings.REDIS_LEADERBOARD_KEY}:{champ['mode']}"
            all_key = f"{settings.REDIS_LEADERBOARD_KEY}:all"
            
            # Store in Redis Sorted Set (score = high_score)
            await client.zadd(key, {champ["username"]: champ["high_score"]})
            await client.zadd(all_key, {champ["username"]: champ["high_score"]})
            
            # Store metadata hash
            meta_key = f"shadowboxer:user_meta:{champ['username']}"
            await client.set(meta_key, json.dumps(champ))

    @staticmethod
    async def record_score(entry: LeaderboardEntryCreate) -> LeaderboardEntryResponse:
        client = redis_client.client
        key = f"{settings.REDIS_LEADERBOARD_KEY}:{entry.mode}"
        all_key = f"{settings.REDIS_LEADERBOARD_KEY}:all"

        # Update Redis sorted set
        await client.zadd(key, {entry.username: entry.high_score})
        await client.zadd(all_key, {entry.username: entry.high_score})

        # Save metadata
        meta_key = f"shadowboxer:user_meta:{entry.username}"
        meta_dict = entry.model_dump()
        meta_dict["updated_at"] = datetime.utcnow().isoformat()
        await client.set(meta_key, json.dumps(meta_dict))

        # Query rank
        rank = await client.zrevrank(all_key, entry.username)
        rank_1_indexed = (rank + 1) if rank is not None else 1

        return LeaderboardEntryResponse(
            rank=rank_1_indexed,
            username=entry.username,
            mode=entry.mode,
            high_score=entry.high_score,
            max_combo=entry.max_combo,
            peak_velocity=entry.peak_velocity,
            punches_thrown=entry.punches_thrown,
            updated_at=datetime.utcnow(),
        )

    @staticmethod
    async def get_top_leaderboard(mode: str = "all", limit: int = 10) -> LeaderboardListResponse:
        client = redis_client.client
        key = f"{settings.REDIS_LEADERBOARD_KEY}:{mode}"
        
        # Query Redis sorted set
        top_members = await client.zrevrange(key, 0, limit - 1, withscores=True)
        
        if not top_members:
            # Seed fallback if empty
            await LeaderboardService.seed_initial_leaderboard()
            top_members = await client.zrevrange(key, 0, limit - 1, withscores=True)

        results: List[LeaderboardEntryResponse] = []
        for rank, (member, score) in enumerate(top_members, 1):
            meta_key = f"shadowboxer:user_meta:{member}"
            raw_meta = await client.get(meta_key)
            if raw_meta:
                meta = json.loads(raw_meta)
                results.append(LeaderboardEntryResponse(
                    rank=rank,
                    username=member,
                    mode=meta.get("mode", mode),
                    high_score=int(score),
                    max_combo=meta.get("max_combo", 0),
                    peak_velocity=meta.get("peak_velocity", 0.0),
                    punches_thrown=meta.get("punches_thrown", 0),
                    updated_at=datetime.utcnow(),
                ))
            else:
                results.append(LeaderboardEntryResponse(
                    rank=rank,
                    username=member,
                    mode=mode,
                    high_score=int(score),
                    max_combo=10,
                    peak_velocity=4.5,
                    punches_thrown=100,
                    updated_at=datetime.utcnow(),
                ))

        return LeaderboardListResponse(
            mode=mode,
            total_entries=len(results),
            entries=results,
            cached_in_redis=True,
        )
