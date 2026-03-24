import json
import os
import time
from datetime import datetime
from typing import Dict, List
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, Form, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
import asyncio

from database import init_db, get_db, Session as DBSession, GazeEvent as DBGaze, Alert as DBAlert
from models import SessionCreate, SessionOut, SessionDetail, GazeEventOut, AlertOut, DetectionResult
from detection import decode_frame, analyze_frame, save_screenshot, get_verdict
from report import build_json_report, build_pdf_report

app = FastAPI(title="AI Interview Proctoring API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, session_id: int, websocket: WebSocket):
        await websocket.accept()
        if session_id not in self.active_connections:
            self.active_connections[session_id] = []
        self.active_connections[session_id].append(websocket)

    def disconnect(self, session_id: int, websocket: WebSocket):
        if session_id in self.active_connections:
            self.active_connections[session_id].remove(websocket)

    async def broadcast(self, session_id: int, message: dict):
        if session_id in self.active_connections:
            dead = []
            for ws in self.active_connections[session_id]:
                try:
                    await ws.send_json(message)
                except Exception:
                    dead.append(ws)
            for ws in dead:
                self.active_connections[session_id].remove(ws)


manager = ConnectionManager()
REPORTS_DIR = "reports"
os.makedirs(REPORTS_DIR, exist_ok=True)
os.makedirs("screenshots", exist_ok=True)


@app.on_event("startup")
async def startup():
    await init_db()


# ─── Sessions ───────────────────────────────────────────────────────────────

@app.post("/sessions", response_model=SessionOut)
async def create_session(body: SessionCreate, db: AsyncSession = Depends(get_db)):
    session = DBSession(candidate_name=body.candidate_name, start_time=datetime.utcnow())
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


@app.get("/sessions", response_model=List[SessionOut])
async def get_sessions(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DBSession).order_by(DBSession.start_time.desc()))
    return result.scalars().all()


@app.get("/sessions/{session_id}", response_model=SessionDetail)
async def get_session(session_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DBSession).where(DBSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    gazes = await db.execute(select(DBGaze).where(DBGaze.session_id == session_id).order_by(DBGaze.timestamp))
    alerts = await db.execute(select(DBAlert).where(DBAlert.session_id == session_id).order_by(DBAlert.timestamp))
    return SessionDetail(
        session=SessionOut.model_validate(session),
        gaze_events=[GazeEventOut.model_validate(g) for g in gazes.scalars().all()],
        alerts=[AlertOut.model_validate(a) for a in alerts.scalars().all()],
    )


@app.patch("/sessions/{session_id}/end", response_model=SessionOut)
async def end_session(session_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DBSession).where(DBSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session.end_time = datetime.utcnow()
    session.verdict = get_verdict(session.risk_score)
    await db.commit()
    await db.refresh(session)
    return session


# ─── Frame Analysis ─────────────────────────────────────────────────────────

@app.post("/sessions/{session_id}/analyze")
async def analyze(session_id: int, frame: str = Form(...), db: AsyncSession = Depends(get_db)):
    result_db = await db.execute(select(DBSession).where(DBSession.id == session_id))
    session = result_db.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    img = decode_frame(frame)
    if img is None:
        return JSONResponse({"error": "Invalid frame"}, status_code=400)

    detection = analyze_frame(img)
    now = datetime.utcnow()

    # Save gaze event
    gaze_ev = DBGaze(
        session_id=session_id,
        timestamp=now,
        gaze_direction=detection["gaze_direction"],
        confidence=detection["confidence"],
        flagged=detection["flagged"],
    )
    db.add(gaze_ev)

    screenshot_path = None
    if detection["flagged"]:
        # Update risk score
        new_score = min(100.0, session.risk_score + detection["risk_delta"])
        session.risk_score = new_score
        session.verdict = get_verdict(new_score)

        # Save screenshot
        screenshot_path = save_screenshot(session_id, img, detection["alert_type"] or "UNKNOWN")

        # Save alert
        alert = DBAlert(
            session_id=session_id,
            timestamp=now,
            alert_type=detection["alert_type"],
            severity=detection["severity"],
            screenshot_path=screenshot_path,
            description=detection["description"],
        )
        db.add(alert)

    await db.commit()

    # Broadcast via WebSocket
    ws_payload = {
        "type": "detection",
        "session_id": session_id,
        "timestamp": now.isoformat(),
        "gaze_direction": detection["gaze_direction"],
        "face_count": detection["face_count"],
        "flagged": detection["flagged"],
        "alert_type": detection["alert_type"],
        "severity": detection["severity"],
        "description": detection["description"],
        "risk_score": session.risk_score,
        "verdict": session.verdict,
    }
    await manager.broadcast(session_id, ws_payload)

    return ws_payload


# ─── Reports ────────────────────────────────────────────────────────────────

@app.get("/sessions/{session_id}/report/json")
async def report_json(session_id: int, db: AsyncSession = Depends(get_db)):
    result_db = await db.execute(select(DBSession).where(DBSession.id == session_id))
    session = result_db.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    gazes = await db.execute(select(DBGaze).where(DBGaze.session_id == session_id))
    alerts = await db.execute(select(DBAlert).where(DBAlert.session_id == session_id))
    report = build_json_report(session, gazes.scalars().all(), alerts.scalars().all())
    out_path = f"{REPORTS_DIR}/session_{session_id}_report.json"
    with open(out_path, "w") as f:
        json.dump(report, f, indent=2, default=str)
    return FileResponse(out_path, media_type="application/json", filename=f"session_{session_id}_report.json")


@app.get("/sessions/{session_id}/report/pdf")
async def report_pdf(session_id: int, db: AsyncSession = Depends(get_db)):
    result_db = await db.execute(select(DBSession).where(DBSession.id == session_id))
    session = result_db.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    gazes = await db.execute(select(DBGaze).where(DBGaze.session_id == session_id))
    alerts = await db.execute(select(DBAlert).where(DBAlert.session_id == session_id))
    out_path = f"{REPORTS_DIR}/session_{session_id}_report.pdf"
    build_pdf_report(session, gazes.scalars().all(), alerts.scalars().all(), out_path)
    return FileResponse(out_path, media_type="application/pdf", filename=f"session_{session_id}_report.pdf")


# ─── Screenshots ────────────────────────────────────────────────────────────

@app.get("/screenshots/{filename}")
async def get_screenshot(filename: str):
    path = f"screenshots/{filename}"
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Screenshot not found")
    return FileResponse(path, media_type="image/jpeg")


# ─── WebSocket ──────────────────────────────────────────────────────────────

@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: int):
    await manager.connect(session_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(session_id, websocket)
