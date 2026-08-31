import math
import time
from typing import Dict, Any, List, Tuple

class PhysicsService:
    """Server-side Kinematics Engine and Performance Benchmarking."""

    @staticmethod
    def calculate_distance_3d(p1: Dict[str, float], p2: Dict[str, float]) -> float:
        dx = p1.get("x", 0) - p2.get("x", 0)
        dy = p1.get("y", 0) - p2.get("y", 0)
        dz = p1.get("z", 0) - p2.get("z", 0)
        return math.sqrt(dx * dx + dy * dy + dz * dz)

    @staticmethod
    def calculate_joint_angle(a: Dict[str, float], b: Dict[str, float], c: Dict[str, float]) -> float:
        ab = (a.get("x", 0) - b.get("x", 0), a.get("y", 0) - b.get("y", 0), a.get("z", 0) - b.get("z", 0))
        cb = (c.get("x", 0) - b.get("x", 0), c.get("y", 0) - b.get("y", 0), c.get("z", 0) - b.get("z", 0))

        dot = ab[0] * cb[0] + ab[1] * cb[1] + ab[2] * cb[2]
        mag_ab = math.sqrt(ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2)
        mag_cb = math.sqrt(cb[0] ** 2 + cb[1] ** 2 + cb[2] ** 2)

        if mag_ab * mag_cb == 0:
            return 0.0
        cosine = max(-1.0, min(1.0, dot / (mag_ab * mag_cb)))
        return (math.acos(cosine) * 180.0) / math.pi

    @staticmethod
    def compute_velocity(p_prev: Dict[str, float], p_curr: Dict[str, float], dt_sec: float) -> float:
        if dt_sec <= 0:
            return 0.0
        dist = PhysicsService.calculate_distance_3d(p_prev, p_curr)
        return (dist * 2.5) / dt_sec

    @staticmethod
    def classify_strike(shoulder: Dict[str, float], elbow: Dict[str, float], wrist: Dict[str, float], wrist_prev: Dict[str, float], velocity: float) -> Dict[str, Any]:
        elbow_angle = PhysicsService.calculate_joint_angle(shoulder, elbow, wrist)
        dy = wrist.get("y", 0) - wrist_prev.get("y", 0)
        dx = wrist.get("x", 0) - wrist_prev.get("x", 0)

        if dy < -0.03 and 40.0 <= elbow_angle <= 125.0:
            return {"type": "UPPERCUT", "confidence": 0.94, "angle": elbow_angle}
        elif abs(dx) > 0.04 and 45.0 <= elbow_angle <= 135.0:
            return {"type": "HOOK", "confidence": 0.92, "angle": elbow_angle}
        elif elbow_angle > 130.0:
            return {"type": "JAB/CROSS", "confidence": 0.97, "angle": elbow_angle}
        return {"type": "JAB/CROSS", "confidence": 0.70, "angle": elbow_angle}

    @staticmethod
    def benchmark_filter_pipeline(sample_count: int = 1000) -> Dict[str, Any]:
        """Runs automated benchmark comparison between Raw vs OneEuroFilter signal paths."""
        start_time = time.perf_counter()
        
        # Adaptive 1 Euro Filter
        class OneEuro:
            def __init__(self, min_cutoff=1.5, beta=0.01):
                self.min_cutoff = min_cutoff
                self.beta = beta
                self.x_prev = None
                self.dx_prev = 0.0
            
            def filter(self, x: float, dt: float = 0.016) -> float:
                if self.x_prev is None:
                    self.x_prev = x
                    return x
                dx = (x - self.x_prev) / dt
                tau_d = 1.0 / (2.0 * math.pi * 1.0)
                alpha_d = 1.0 / (1.0 + tau_d / dt)
                edx = alpha_d * dx + (1.0 - alpha_d) * self.dx_prev
                self.dx_prev = edx
                
                cutoff = self.min_cutoff + self.beta * abs(edx)
                tau = 1.0 / (2.0 * math.pi * cutoff)
                alpha = 1.0 / (1.0 + tau / dt)
                hat_x = alpha * x + (1.0 - alpha) * self.x_prev
                self.x_prev = hat_x
                return hat_x

        filter_inst = OneEuro(min_cutoff=1.2, beta=0.005)
        raw_noise_sq = 0.0
        filtered_noise_sq = 0.0
        dt = 0.016
        
        for i in range(sample_count):
            t = i * dt
            true_signal = 0.5 * math.sin(t * 1.5) # Gentle movement
            noise = (0.15 if i % 2 == 0 else -0.15) # High frequency camera jitter
            raw_sample = true_signal + noise
            
            filtered_val = filter_inst.filter(raw_sample, dt)
            
            if i > 25:
                raw_noise_sq += (raw_sample - true_signal) ** 2
                filtered_noise_sq += (filtered_val - true_signal) ** 2

        measured = max(1, sample_count - 25)
        elapsed_ms = (time.perf_counter() - start_time) * 1000.0
        raw_var = raw_noise_sq / measured
        filt_var = filtered_noise_sq / measured
        jitter_reduction = max(0.0, (1.0 - (filt_var / max(1e-6, raw_var))) * 100.0)

        return {
            "samples_processed": sample_count,
            "benchmark_duration_ms": round(elapsed_ms, 3),
            "throughput_samples_per_sec": int(sample_count / max(0.0001, elapsed_ms / 1000.0)),
            "raw_variance": round(raw_var, 5),
            "filtered_variance": round(filt_var, 5),
            "jitter_reduction_percentage": round(jitter_reduction, 1),
            "latency_overhead_ms": round(elapsed_ms / sample_count, 4),
        }
