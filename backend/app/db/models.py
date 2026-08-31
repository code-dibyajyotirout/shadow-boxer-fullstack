import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.db.session import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String(64), primary_key=True, index=True)
    username = Column(String(64), unique=True, index=True, nullable=False)
    email = Column(String(128), unique=True, index=True, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    sessions = relationship("WorkoutSession", back_populates="user", cascade="all, delete-orphan")


class WorkoutSession(Base):
    __tablename__ = "workout_sessions"

    id = Column(String(64), primary_key=True, index=True)
    user_id = Column(String(64), ForeignKey("users.id"), index=True, nullable=False)
    routine_name = Column(String(64), default="Mixed Combos")
    start_time = Column(DateTime, default=datetime.datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    duration_seconds = Column(Float, default=0.0)
    
    # Biomechanics aggregates
    total_punches = Column(Integer, default=0)
    peak_velocity = Column(Float, default=0.0) # m/s
    avg_velocity = Column(Float, default=0.0) # m/s
    peak_acceleration = Column(Float, default=0.0) # m/s^2
    avg_power = Column(Float, default=0.0) # 0 - 100%
    calories_burned = Column(Float, default=0.0) # kcal
    highest_combo = Column(Integer, default=0)
    accuracy_score = Column(Float, default=0.0) # 0 - 100%

    user = relationship("User", back_populates="sessions")
    strikes = relationship("StrikeLog", back_populates="session", cascade="all, delete-orphan")
    replays = relationship("ReplayFrame", back_populates="session", cascade="all, delete-orphan")


class StrikeLog(Base):
    __tablename__ = "strike_logs"

    id = Column(String(64), primary_key=True, index=True)
    session_id = Column(String(64), ForeignKey("workout_sessions.id"), index=True, nullable=False)
    timestamp = Column(Float, nullable=False)
    strike_type = Column(String(32), nullable=False) # JAB/CROSS, HOOK, UPPERCUT, DUCK, SLIP
    hand = Column(String(16), nullable=False) # LEFT, RIGHT, DEFENSE
    velocity = Column(Float, default=0.0) # m/s
    acceleration = Column(Float, default=0.0) # m/s^2
    power = Column(Float, default=0.0) # %
    extension = Column(Float, default=0.0)
    alignment_score = Column(Float, default=0.0)
    trajectory_quality = Column(String(16), default="OPTIMAL")

    session = relationship("WorkoutSession", back_populates="strikes")


class ReplayFrame(Base):
    __tablename__ = "replay_frames"

    id = Column(String(64), primary_key=True, index=True)
    session_id = Column(String(64), ForeignKey("workout_sessions.id"), index=True, nullable=False)
    frame_index = Column(Integer, nullable=False)
    timestamp = Column(Float, nullable=False)
    pose_landmarks = Column(JSON, nullable=False) # 33 3D coordinate array

    session = relationship("WorkoutSession", back_populates="replays")


class LeaderboardEntry(Base):
    __tablename__ = "leaderboard_entries"

    id = Column(String(64), primary_key=True, index=True)
    username = Column(String(64), index=True, nullable=False)
    avatar_url = Column(String(256), nullable=True)
    mode = Column(String(32), default="all")
    high_score = Column(Integer, default=0)
    max_combo = Column(Integer, default=0)
    peak_velocity = Column(Float, default=0.0)
    punches_thrown = Column(Integer, default=0)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)
