from pydantic import BaseModel, EmailStr, condecimal
from typing import Optional, List
from datetime import datetime
from database import RoleEnum, MeetingStatusEnum, VerdictEnum, DirectionEnum, AlertTypeEnum, SeverityEnum


# --- Auth Models ---
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: RoleEnum

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: RoleEnum
    is_active: bool
    profile_pic: Optional[str] = None
    created_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# --- Meeting Models ---
class MeetingCreate(BaseModel):
    title: str
    description: Optional[str] = None
    scheduled_at: datetime
    duration_mins: int = 60

class MeetingJoin(BaseModel):
    invite_code: str

class MeetingOut(BaseModel):
    id: int
    interviewer_id: int
    title: str
    description: Optional[str] = None
    invite_code: str
    scheduled_at: datetime
    duration_mins: int
    status: MeetingStatusEnum
    created_at: datetime

    class Config:
        from_attributes = True

class ParticipantOut(BaseModel):
    id: int
    meeting_id: int
    interviewee_id: int
    joined_at: datetime
    left_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# --- Proctoring & Analysis Models ---
class SessionStart(BaseModel):
    meeting_id: int
    
class ProctoringSessionOut(BaseModel):
    id: int
    meeting_id: int
    interviewee_id: int
    start_time: datetime
    end_time: Optional[datetime] = None
    risk_score: float
    verdict: VerdictEnum
    total_gaze_off: int
    total_flags: int
    candidate_name: Optional[str] = None

    class Config:
        from_attributes = True

class GazeEventOut(BaseModel):
    id: int
    session_id: int
    timestamp: datetime
    gaze_x: Optional[float] = None
    gaze_y: Optional[float] = None
    direction: DirectionEnum
    face_count: int
    confidence: float
    is_flagged: bool

    class Config:
        from_attributes = True


class AlertOut(BaseModel):
    id: int
    session_id: int
    timestamp: datetime
    alert_type: AlertTypeEnum
    severity: SeverityEnum
    duration_secs: Optional[float] = None
    screenshot_path: Optional[str] = None

    class Config:
        from_attributes = True


# --- Composite Response Models ---
class MeetingDetailOut(BaseModel):
    meeting: MeetingOut
    interviewer: UserOut

class SessionReportOut(BaseModel):
    session: ProctoringSessionOut
    gaze_events: List[GazeEventOut]
    alerts: List[AlertOut]
