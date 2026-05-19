import json
import os
import secrets
import string
from datetime import datetime
from typing import Dict, List
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, Form, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from database import init_db, get_db, User, Meeting, MeetingParticipant, ProctoringSession, GazeEvent as DBGaze, Alert as DBAlert
from database import RoleEnum, MeetingStatusEnum, VerdictEnum
from models import MeetingCreate, MeetingJoin, MeetingOut, ParticipantOut, SessionStart, ProctoringSessionOut, SessionReportOut, GazeEventOut, AlertOut
from auth import router as auth_router, get_current_user, require_role
from detection import decode_frame, analyze_frame, save_screenshot, get_verdict
from report import build_json_report, build_pdf_report

app = FastAPI(title="AI Interview Proctoring System V2", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)

# WebSocket connection manager (now scoped per meeting/session)
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, room_id: int, websocket: WebSocket):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = []
        self.active_connections[room_id].append(websocket)

    def disconnect(self, room_id: int, websocket: WebSocket):
        if room_id in self.active_connections:
            if websocket in self.active_connections[room_id]:
                self.active_connections[room_id].remove(websocket)

    async def broadcast(self, room_id: int, message: dict):
        if room_id in self.active_connections:
            dead = []
            for ws in self.active_connections[room_id]:
                try:
                    await ws.send_json(message)
                except Exception:
                    dead.append(ws)
            for ws in dead:
                self.active_connections[room_id].remove(ws)


manager = ConnectionManager()
REPORTS_DIR = "reports"
SCREENSHOTS_DIR = "screenshots"
os.makedirs(REPORTS_DIR, exist_ok=True)
os.makedirs(SCREENSHOTS_DIR, exist_ok=True)

@app.on_event("startup")
async def startup():
    await init_db()

def generate_invite_code(length=8):
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))

# ─── Meetings API ──────────────────────────────────────────────────────────

@app.post("/api/meetings/create", response_model=MeetingOut)
async def create_meeting(
    meeting_in: MeetingCreate, 
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(require_role(RoleEnum.interviewer))
):
    code = generate_invite_code()
    # Ensure uniqueness
    while await db.scalar(select(Meeting).where(Meeting.invite_code == code)):
        code = generate_invite_code()
        
    db_meeting = Meeting(
        interviewer_id=current_user.id,
        title=meeting_in.title,
        description=meeting_in.description,
        invite_code=code,
        scheduled_at=meeting_in.scheduled_at,
        duration_mins=meeting_in.duration_mins
    )
    db.add(db_meeting)
    await db.commit()
    await db.refresh(db_meeting)
    return db_meeting

@app.get("/api/meetings/my", response_model=List[MeetingOut])
async def get_my_meetings(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role == RoleEnum.interviewer:
        result = await db.execute(select(Meeting).where(Meeting.interviewer_id == current_user.id).order_by(Meeting.scheduled_at.desc()))
        return result.scalars().all()
    elif current_user.role == RoleEnum.interviewee:
        # Join against meeting participants
        result = await db.execute(
            select(Meeting)
            .join(MeetingParticipant, Meeting.id == MeetingParticipant.meeting_id)
            .where(MeetingParticipant.interviewee_id == current_user.id)
            .order_by(Meeting.scheduled_at.desc())
        )
        return result.scalars().all()
    else: # Admin gets all
        result = await db.execute(select(Meeting).order_by(Meeting.scheduled_at.desc()))
        return result.scalars().all()

@app.post("/api/meetings/join", response_model=MeetingOut)
async def join_meeting(
    join_in: MeetingJoin, 
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(require_role(RoleEnum.interviewee))
):
    result = await db.execute(select(Meeting).where(Meeting.invite_code == join_in.invite_code))
    meeting = result.scalar_one_or_none()
    
    if not meeting:
        raise HTTPException(status_code=404, detail="Invalid invite code")
        
    # Check if a participant record already exists
    part_res = await db.execute(select(MeetingParticipant).where(
        MeetingParticipant.meeting_id == meeting.id,
        MeetingParticipant.interviewee_id == current_user.id
    ))
    participant = part_res.scalar_one_or_none()
    
    if not participant:
        participant = MeetingParticipant(meeting_id=meeting.id, interviewee_id=current_user.id)
        db.add(participant)
        await db.commit()
        
    return meeting

@app.patch("/api/meetings/{meeting_id}/end", response_model=MeetingOut)
async def end_meeting(meeting_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_role(RoleEnum.interviewer))):
    res = await db.execute(select(Meeting).where(Meeting.id == meeting_id, Meeting.interviewer_id == current_user.id))
    meeting = res.scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
        
    meeting.status = MeetingStatusEnum.completed
    
    # End associated proctoring sessions
    sess_res = await db.execute(select(ProctoringSession).where(ProctoringSession.meeting_id == meeting_id, ProctoringSession.end_time.is_(None)))
    for sess in sess_res.scalars().all():
        sess.end_time = datetime.utcnow()
        sess.verdict = get_verdict(sess.risk_score)
        
    await db.commit()
    return meeting


# ─── Proctoring Sessions API ───────────────────────────────────────────────

@app.post("/api/sessions/start", response_model=ProctoringSessionOut)
async def start_proctoring_session(
    session_in: SessionStart,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(RoleEnum.interviewee))
):
    # Create the internal proctoring session for this meeting
    proc_sess = ProctoringSession(meeting_id=session_in.meeting_id, interviewee_id=current_user.id)
    db.add(proc_sess)
    await db.commit()
    await db.refresh(proc_sess)
    return proc_sess

@app.get("/api/meetings/{meeting_id}/report", response_model=SessionReportOut)
async def get_meeting_report(meeting_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Basic permission check
    sess_res = await db.execute(select(ProctoringSession).where(ProctoringSession.meeting_id == meeting_id).order_by(ProctoringSession.id.desc()))
    session = sess_res.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    if current_user.role == RoleEnum.interviewee and session.interviewee_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    gazes = await db.execute(select(DBGaze).where(DBGaze.session_id == session.id).order_by(DBGaze.timestamp))
    alerts = await db.execute(select(DBAlert).where(DBAlert.session_id == session.id).order_by(DBAlert.timestamp))

    # Fetch candidate name
    candidate_res = await db.execute(select(User).where(User.id == session.interviewee_id))
    candidate = candidate_res.scalar_one_or_none()
    
    session_out = ProctoringSessionOut.model_validate(session)
    session_out_dict = session_out.model_dump()
    session_out_dict['candidate_name'] = candidate.name if candidate else 'Unknown'
    
    return {
        "session": session_out_dict,
        "gaze_events": [g.__dict__ for g in gazes.scalars().all()],
        "alerts": [a.__dict__ for a in alerts.scalars().all()]
    }

# ─── Frame Analysis Endpoint ───────────────────────────────────────────────

@app.post("/api/sessions/{session_id}/analyze")
async def analyze_frame_endpoint(session_id: int, frame: str = Form(...), db: AsyncSession = Depends(get_db)):
    # Note: Using form data means we aren't enforcing JWT strictly here for performance
    # but in a real app we would pass Bearer token in Headers.
    result_db = await db.execute(select(ProctoringSession).where(ProctoringSession.id == session_id))
    session = result_db.scalar_one_or_none()
    if not session:
        return JSONResponse({"error": "Session not found"}, status_code=404)

    img = decode_frame(frame)
    if img is None:
        return JSONResponse({"error": "Invalid frame"}, status_code=400)

    detection = analyze_frame(img, session_key=str(session_id))
    now = datetime.utcnow()

    # Save logic — note the DB column is 'direction', not 'gaze_direction'
    gaze_ev = DBGaze(
        session_id=session_id,
        timestamp=now,
        direction=detection.get("gaze_direction", "center"),
        confidence=detection["confidence"],
        is_flagged=detection["flagged"],
        face_count=detection["face_count"]
    )
    db.add(gaze_ev)

    screenshot_path = None
    if detection["flagged"]:
        session.total_flags += 1
        if detection["alert_type"] == "GAZE_OFF":
            session.total_gaze_off += 1

        new_score = min(100.0, float(session.risk_score) + detection["risk_delta"])
        session.risk_score = new_score
        session.verdict = get_verdict(new_score)

        screenshot_path = save_screenshot(session_id, img, detection["alert_type"] or "UNKNOWN")

        alert = DBAlert(
            session_id=session_id,
            timestamp=now,
            alert_type=detection["alert_type"],
            severity=detection["severity"],
            screenshot_path=screenshot_path
        )
        db.add(alert)

    await db.commit()

    # Broadcast to the interviewer watching this Meeting ID
    ws_payload = {
        "type": "detection",
        "session_id": session_id,
        "meeting_id": session.meeting_id,
        "timestamp": now.isoformat(),
        "gaze_direction": detection["gaze_direction"],
        "face_count": detection["face_count"],
        "flagged": detection["flagged"],
        "alert_type": detection["alert_type"],
        "severity": detection["severity"],
        "description": detection["description"],
        "risk_score": float(session.risk_score),
        "verdict": session.verdict,
    }
    await manager.broadcast(session.meeting_id, ws_payload)

    return ws_payload

@app.get("/screenshots/{filename}")
async def get_screenshot(filename: str):
    path = f"screenshots/{filename}"
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Not found")
    return FileResponse(path, media_type="image/jpeg")

# WebSocket room is keyed by meeting_id so Interviewer can watch all feeds in a meeting.
@app.websocket("/ws/meeting/{meeting_id}")
async def websocket_meeting(websocket: WebSocket, meeting_id: int):
    await manager.connect(meeting_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(meeting_id, websocket)
