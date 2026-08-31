"""
Comprehensive Test Suite for Shadow Boxer Distributed Backend
Verifies Kinematics Physics Calculations, OneEuroFilter Benchmarks, Redis Leaderboard Sorted Sets, and WebRTC Signaling.
"""
import sys
import os
import math
import asyncio
import unittest

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.config import settings
from app.services.physics_service import PhysicsService
from app.services.leaderboard_service import LeaderboardService
from app.services.webrtc_service import webrtc_service
from app.schemas.leaderboard import LeaderboardEntryCreate


class TestKinematicsAndPhysics(unittest.TestCase):
    def test_distance_3d(self):
        p1 = {"x": 0.0, "y": 0.0, "z": 0.0}
        p2 = {"x": 3.0, "y": 4.0, "z": 0.0}
        dist_2d = PhysicsService.calculate_distance_3d(p1, p2)
        self.assertAlmostEqual(dist_2d, 5.0, places=4)

        p3 = {"x": 0.0, "y": 0.0, "z": 12.0}
        dist_3d = PhysicsService.calculate_distance_3d(p1, p3)
        self.assertAlmostEqual(dist_3d, 12.0, places=4)

    def test_joint_angle_trigonometry(self):
        a = {"x": 0.0, "y": 1.0, "z": 0.0}
        b = {"x": 0.0, "y": 0.0, "z": 0.0}
        c = {"x": 1.0, "y": 0.0, "z": 0.0}
        angle_90 = PhysicsService.calculate_joint_angle(a, b, c)
        self.assertAlmostEqual(angle_90, 90.0, places=3)

        a_180 = {"x": -1.0, "y": 0.0, "z": 0.0}
        angle_180 = PhysicsService.calculate_joint_angle(a_180, b, c)
        self.assertAlmostEqual(angle_180, 180.0, places=3)

    def test_velocity_computation(self):
        p_prev = {"x": 0.1, "y": 0.2, "z": 0.1}
        p_curr = {"x": 0.1, "y": 0.2, "z": 0.3}
        dt = 0.05
        velocity = PhysicsService.compute_velocity(p_prev, p_curr, dt)
        # (0.2 * 2.5) / 0.05 = 10.0 m/s
        self.assertAlmostEqual(velocity, 10.0, places=3)

    def test_strike_classification(self):
        # Extended forward punch -> JAB/CROSS
        shoulder = {"x": 0.4, "y": 0.3, "z": 0.0}
        elbow = {"x": 0.4, "y": 0.3, "z": 0.25}
        wrist = {"x": 0.4, "y": 0.3, "z": 0.55}
        wrist_prev = {"x": 0.4, "y": 0.3, "z": 0.35}

        res = PhysicsService.classify_strike(shoulder, elbow, wrist, wrist_prev, 3.5)
        self.assertEqual(res["type"], "JAB/CROSS")
        self.assertGreater(res["confidence"], 0.8)

    def test_filter_benchmark_pipeline(self):
        res = PhysicsService.benchmark_filter_pipeline(sample_count=500)
        self.assertEqual(res["samples_processed"], 500)
        self.assertGreater(res["jitter_reduction_percentage"], 0.0)
        self.assertGreater(res["throughput_samples_per_sec"], 1000)


class TestLeaderboardAndRedis(unittest.IsolatedAsyncioTestCase):
    async def test_leaderboard_seeding_and_retrieval(self):
        await LeaderboardService.seed_initial_leaderboard()
        leaderboard = await LeaderboardService.get_top_leaderboard(mode="all", limit=5)
        self.assertGreaterEqual(leaderboard.total_entries, 1)
        self.assertTrue(leaderboard.cached_in_redis)

    async def test_record_score_and_rank(self):
        entry = LeaderboardEntryCreate(
            username="MasterFighter_42",
            mode="power",
            high_score=22500,
            max_combo=45,
            peak_velocity=6.4,
            punches_thrown=380,
        )
        saved = await LeaderboardService.record_score(entry)
        self.assertEqual(saved.username, "MasterFighter_42")
        self.assertEqual(saved.high_score, 22500)
        self.assertEqual(saved.rank, 1)


class TestWebRTCSignaling(unittest.TestCase):
    def test_room_join_and_candidate_flow(self):
        room_id = "test_arena_99"
        peer_a = "boxer_alpha"
        peer_b = "boxer_beta"

        # Join Room
        room_state = webrtc_service.create_or_join_room(room_id, peer_a)
        self.assertIn(peer_a, room_state.peers)
        self.assertFalse(room_state.has_offer)

        # Peer B joins
        room_state_b = webrtc_service.create_or_join_room(room_id, peer_b)
        self.assertEqual(len(room_state_b.peers), 2)


class TestConfigAndEnvironment(unittest.TestCase):
    def test_settings_load(self):
        self.assertEqual(settings.API_V1_PREFIX, "/api/v1")
        self.assertEqual(settings.VERSION, "1.0.0")
        self.assertTrue(len(settings.BACKEND_CORS_ORIGINS) > 0)


if __name__ == "__main__":
    unittest.main()
