import os
from urllib.parse import quote_plus
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base, relationship
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Boolean, Text, Enum, ForeignKey, Numeric
)
import enum
from datetime import datetime

# Default to local MySQL without password for root, but allow override
DB_USER = os.getenv("DB_USER", "root")
DB_PASS = os.getenv("DB_PASS", "Rishabh@6062")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_NAME = os.getenv("DB_NAME", "proctoring_db")

# URL-encode password to handle special characters like '@'
DATABASE_URL = f"mysql+aiomysql://{DB_USER}:{quote_plus(DB_PASS)}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

Base = declarative_base()

class RoleEnum(str, enum.Enum):
    super_admin = "super_admin"
    interviewer = "interviewer"
    interviewee = "interviewee"

class MeetingStatusEnum(str, enum.Enum):
    scheduled = "scheduled"
    active = "active"
    completed = "completed"
    cancelled = "cancelled"

class VerdictEnum(str, enum.Enum):
    trusted = "trusted"
    suspicious = "suspicious"
    high_risk = "high_risk"

class DirectionEnum(str, enum.Enum):
    center = "center"
    left = "left"
    right = "right"
    up = "up"
    down = "down"

class AlertTypeEnum(str, enum.Enum):
    gaze_off = "gaze_off"
    multiple_faces = "multiple_faces"
    no_face = "no_face"
    rapid_head_turn = "rapid_head_turn"
    lip_movement = "lip_movement"

class SeverityEnum(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"


# 1. USERS TABLE
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(RoleEnum), nullable=False)
    is_active = Column(Boolean, default=True)
    profile_pic = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)
    login_ip = Column(String(45), nullable=True)


# 2. MEETINGS TABLE
class Meeting(Base):
    __tablename__ = "meetings"
    id = Column(Integer, primary_key=True, index=True)
    interviewer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    invite_code = Column(String(20), unique=True, nullable=False, index=True)
    scheduled_at = Column(DateTime, nullable=False)
    duration_mins = Column(Integer, default=60)
    status = Column(Enum(MeetingStatusEnum), default=MeetingStatusEnum.scheduled)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    interviewer = relationship("User", foreign_keys=[interviewer_id])


# 3. MEETING PARTICIPANTS TABLE
class MeetingParticipant(Base):
    __tablename__ = "meeting_participants"
    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id"), nullable=False)
    interviewee_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    joined_at = Column(DateTime, default=datetime.utcnow)
    left_at = Column(DateTime, nullable=True)


# 4. PROCTORING SESSIONS TABLE
class ProctoringSession(Base):
    __tablename__ = "proctoring_sessions"
    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id"), nullable=False)
    interviewee_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    risk_score = Column(Numeric(5, 2), default=0.00)
    verdict = Column(Enum(VerdictEnum), default=VerdictEnum.trusted)
    total_gaze_off = Column(Integer, default=0)
    total_flags = Column(Integer, default=0)


# 5. GAZE EVENTS TABLE
class GazeEvent(Base):
    __tablename__ = "gaze_events"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("proctoring_sessions.id"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    gaze_x = Column(Float, nullable=True)
    gaze_y = Column(Float, nullable=True)
    direction = Column(Enum(DirectionEnum), nullable=False)
    face_count = Column(Integer, default=1)
    confidence = Column(Float, default=1.0)
    is_flagged = Column(Boolean, default=False)


# 6. ALERTS TABLE
class Alert(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("proctoring_sessions.id"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    alert_type = Column(Enum(AlertTypeEnum), nullable=False)
    severity = Column(Enum(SeverityEnum), nullable=False)
    duration_secs = Column(Float, nullable=True)
    screenshot_path = Column(String(255), nullable=True)


# 7. AUDIT LOG TABLE
class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String(200), nullable=False)
    target_type = Column(String(50), nullable=True)
    target_id = Column(Integer, nullable=True)
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


async def init_db():
    # Will be called on startup
    import aiomysql
    # Create DB if it doesn't exist
    async with await aiomysql.connect(host=DB_HOST, port=int(DB_PORT), user=DB_USER, password=DB_PASS) as conn:
        async with conn.cursor() as cur:
            await cur.execute(f"CREATE DATABASE IF NOT EXISTS {DB_NAME};")

    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
