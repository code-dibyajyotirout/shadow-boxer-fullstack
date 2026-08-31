from fastapi import APIRouter
from app.schemas.session import SessionAnalyticsSummary
from app.services.physics_service import PhysicsService

router = APIRouter()

@router.get("/summary", response_model=SessionAnalyticsSummary)
async def get_analytics_summary():
    # Pre-calculated telemetry representative of an elite shadow boxer profile
    return SessionAnalyticsSummary(
        total_workouts=48,
        total_punches_all_time=12480,
        total_calories_burned=6850.5,
        career_peak_velocity=5.84, # m/s
        favorite_strike="JAB/CROSS",
        average_accuracy=93.8,
        velocity_curve_samples=[
            {"time_sec": 0, "velocity": 1.2, "power": 40},
            {"time_sec": 10, "velocity": 3.8, "power": 75},
            {"time_sec": 20, "velocity": 4.5, "power": 85},
            {"time_sec": 30, "velocity": 5.4, "power": 94},
            {"time_sec": 40, "velocity": 4.1, "power": 80},
            {"time_sec": 50, "velocity": 5.8, "power": 98},
            {"time_sec": 60, "velocity": 3.2, "power": 65},
        ],
        strike_distribution={
            "JAB/CROSS": 52,
            "HOOK": 24,
            "UPPERCUT": 14,
            "SLIP": 6,
            "DUCK": 4,
        },
    )

@router.get("/benchmark-filter")
async def run_filter_benchmark():
    """Runs live mathematical benchmarks comparing Raw vs 1 Euro Filter signal processing."""
    return PhysicsService.benchmark_filter_pipeline(sample_count=2000)
