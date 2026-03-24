from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text
from datetime import datetime

DATABASE_URL = "sqlite+aiosqlite:///./proctoring.db"

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

class Base(DeclarativeBase):
    __allow_unmapped__ = True

class Session(Base):
    __tablename__ = "sessions"
    id = Column(Integer, primary_key=True, index=True)
    candidate_name = Column(String, nullable=False)
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    risk_score = Column(Float, default=0.0)
    verdict = Column(String, default="TRUSTED")


class GazeEvent(Base):
    __tablename__ = "gaze_events"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    gaze_direction = Column(String)
    confidence = Column(Float, default=1.0)
    flagged = Column(Boolean, default=False)


class Alert(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    alert_type = Column(String)
    severity = Column(String)
    screenshot_path = Column(String, nullable=True)
    description = Column(Text, nullable=True)


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
