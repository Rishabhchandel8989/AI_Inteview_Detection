from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class SessionCreate(BaseModel):
    candidate_name: str


class SessionOut(BaseModel):
    id: int
    candidate_name: str
    start_time: datetime
    end_time: Optional[datetime] = None
    risk_score: float
    verdict: str

    class Config:
        from_attributes = True


class GazeEventOut(BaseModel):
    id: int
    session_id: int
    timestamp: datetime
    gaze_direction: str
    confidence: float
    flagged: bool

    class Config:
        from_attributes = True


class AlertOut(BaseModel):
    id: int
    session_id: int
    timestamp: datetime
    alert_type: str
    severity: str
    screenshot_path: Optional[str] = None
    description: Optional[str] = None

    class Config:
        from_attributes = True


class SessionDetail(BaseModel):
    session: SessionOut
    gaze_events: List[GazeEventOut]
    alerts: List[AlertOut]


class DetectionResult(BaseModel):
    face_count: int
    gaze_direction: str
    confidence: float
    flagged: bool
    alert_type: Optional[str] = None
    severity: Optional[str] = None
    description: Optional[str] = None
    risk_delta: float = 0.0
