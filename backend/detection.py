import cv2
import numpy as np
from typing import Optional, Dict, Deque
from collections import deque
import base64
import os

# Load OpenCV's pre-trained face and eye detectors
FACE_CASCADE = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
EYE_CASCADE = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_eye.xml")

SCREENSHOTS_DIR = "screenshots"
os.makedirs(SCREENSHOTS_DIR, exist_ok=True)

# ─── Temporal Smoothing Buffers ────────────────────────────────────────────────
# Keyed by session_id → deque of (gaze_direction, face_count) tuples
_gaze_history: Dict[str, Deque] = {}
_head_turn_history: Dict[str, Deque] = {}

HISTORY_SIZE = 5          # Analyse last N frames
GAZE_CONFIRM_THRESH = 3   # Need ≥ this many off-center frames in the window to alert
HEAD_TURN_CONFIRM = 2     # Need ≥ this many narrow-AR frames to alert


def _get_history(session_key: str, store: Dict, maxlen: int) -> Deque:
    if session_key not in store:
        store[session_key] = deque(maxlen=maxlen)
    return store[session_key]


def decode_frame(b64_data: str) -> Optional[np.ndarray]:
    """Decode a base64 JPEG frame to an OpenCV image."""
    try:
        if "," in b64_data:
            b64_data = b64_data.split(",")[1]
        img_bytes = base64.b64decode(b64_data)
        np_arr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        return frame
    except Exception:
        return None


def _compute_gaze_from_face_center(face_cx: int, face_cy: int,
                                    w: int, h: int) -> str:
    """Coarse gaze estimation from face-centre position in frame."""
    h_margin = w * 0.22
    v_margin = h * 0.22
    if face_cx < h_margin:
        return "left"
    elif face_cx > w - h_margin:
        return "right"
    elif face_cy < v_margin:
        return "up"
    elif face_cy > h - v_margin:
        return "down"
    return "center"


def _compute_gaze_from_eyes(eyes: np.ndarray, fw: int, fh: int) -> Optional[str]:
    """Refined gaze from eye-centre ratio within face ROI. Returns None if not confident."""
    if len(eyes) < 2:
        return None
    # Take the two largest eye boxes (most likely real eyes vs brows)
    eyes_sorted = sorted(eyes, key=lambda e: e[2] * e[3], reverse=True)[:2]
    eye_centers = [(ex + ew // 2, ey + eh // 2) for (ex, ey, ew, eh) in eyes_sorted]
    avg_eye_x = sum(e[0] for e in eye_centers) / 2
    avg_eye_y = sum(e[1] for e in eye_centers) / 2
    eye_x_ratio = avg_eye_x / fw
    eye_y_ratio = avg_eye_y / fh

    if eye_x_ratio < 0.33:
        return "left"
    elif eye_x_ratio > 0.67:
        return "right"
    elif eye_y_ratio < 0.28:
        return "up"
    elif eye_y_ratio > 0.62:
        return "down"
    return "center"


def _normalized_lip_variance(face_roi_gray: np.ndarray, fh: int) -> float:
    """Return lip-movement score normalized by local mean brightness to resist lighting changes."""
    lower_face = face_roi_gray[int(fh * 0.65):, :]
    if lower_face.size == 0:
        return 0.0
    mean_brightness = float(np.mean(lower_face)) + 1e-5   # avoid div/0
    variance = float(np.var(lower_face))
    return variance / mean_brightness   # normalized


def analyze_frame(frame: np.ndarray, session_key: str = "default") -> dict:
    """
    Analyzes a single frame for cheating signals.
    Uses temporal smoothing so isolated noisy frames don't create false alerts.

    Args:
        frame:       OpenCV BGR image (np.ndarray)
        session_key: Unique identifier (e.g. str(session_id)) for per-session history

    Returns:
        Detection dict compatible with the DB/API schema.
    """
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    h, w = frame.shape[:2]

    faces = FACE_CASCADE.detectMultiScale(
        gray, scaleFactor=1.1, minNeighbors=5, minSize=(80, 80)
    )
    face_count = len(faces)

    result = {
        "face_count": face_count,
        "gaze_direction": "center",
        "confidence": 1.0,
        "flagged": False,
        "alert_type": None,
        "severity": None,
        "description": None,
        "risk_delta": 0.0,
    }

    # ── No face ──────────────────────────────────────────────────────────────
    if face_count == 0:
        result.update({
            "gaze_direction": "none",
            "confidence": 1.0,
            "flagged": True,
            "alert_type": "NO_FACE",
            "severity": "HIGH",
            "description": "No face detected — candidate may have left the seat.",
            "risk_delta": 15.0,
        })
        return result

    # ── Multiple faces ────────────────────────────────────────────────────────
    if face_count > 1:
        result.update({
            "flagged": True,
            "alert_type": "MULTIPLE_FACES",
            "severity": "HIGH",
            "description": f"{face_count} faces detected — possible third-party assistance.",
            "risk_delta": 20.0,
        })
        return result

    # ── Single face — detailed analysis ─────────────────────────────────────
    fx, fy, fw, fh = faces[0]
    face_roi_gray = gray[fy:fy + fh, fx:fx + fw]
    face_cx = fx + fw // 2
    face_cy = fy + fh // 2

    # 1. Coarse gaze from face centre
    coarse_gaze = _compute_gaze_from_face_center(face_cx, face_cy, w, h)

    # 2. Refined gaze from eye positions (upper 55% of face ROI to exclude mouth)
    upper_face_gray = face_roi_gray[:int(fh * 0.55), :]
    eyes = EYE_CASCADE.detectMultiScale(
        upper_face_gray, scaleFactor=1.05, minNeighbors=4, minSize=(15, 15)
    )
    fine_gaze = _compute_gaze_from_eyes(eyes, fw, int(fh * 0.55))

    # 3. Combine: prioritise eye result; fall back to face-center
    used_eye = fine_gaze is not None
    gaze_direction = fine_gaze if used_eye else coarse_gaze

    # 4. Confidence: high when eye method agrees with face method, low otherwise
    if used_eye:
        confidence = 0.90 if fine_gaze == coarse_gaze else 0.65
    else:
        confidence = 0.50   # face-centre only is less reliable

    # 5. Temporal smoothing for gaze
    gaze_buf = _get_history(f"{session_key}_gaze", _gaze_history, HISTORY_SIZE)
    gaze_buf.append(gaze_direction)
    recent_off = sum(1 for g in gaze_buf if g != "center")
    gaze_confirmed = recent_off >= GAZE_CONFIRM_THRESH

    # 6. Lip movement (normalized variance)
    norm_lip = _normalized_lip_variance(face_roi_gray, fh)
    lip_moving = norm_lip > 40.0   # tuned normalized threshold

    # 7. Head turn via aspect ratio + temporal smoothing
    aspect_ratio = fw / fh if fh > 0 else 1.0
    head_buf = _get_history(f"{session_key}_head", _head_turn_history, HISTORY_SIZE)
    head_buf.append(aspect_ratio < 0.50)
    head_turn_confirmed = sum(head_buf) >= HEAD_TURN_CONFIRM

    # ── Build result ─────────────────────────────────────────────────────────
    result["gaze_direction"] = gaze_direction
    result["confidence"] = round(confidence, 3)

    if gaze_direction != "center" and gaze_confirmed:
        result.update({
            "flagged": True,
            "alert_type": "GAZE_OFF",
            "severity": "MEDIUM",
            "description": f"Candidate consistently looking {gaze_direction.upper()}.",
            "risk_delta": 5.0,
        })
    elif head_turn_confirmed:
        result.update({
            "flagged": True,
            "alert_type": "HEAD_TURN_RAPID",
            "severity": "MEDIUM",
            "description": "Rapid or sustained head turn detected.",
            "risk_delta": 8.0,
        })
    elif lip_moving:
        result.update({
            "flagged": True,
            "alert_type": "LIP_MOVEMENT",
            "severity": "LOW",
            "description": "Lip movement detected — possible whispering.",
            "risk_delta": 3.0,
        })

    return result


def save_screenshot(session_id: int, frame: np.ndarray, alert_type: str) -> str:
    """Save annotated frame as screenshot and return path."""
    import time
    filename = f"{SCREENSHOTS_DIR}/session_{session_id}_{alert_type}_{int(time.time())}.jpg"
    cv2.imwrite(filename, frame)
    return filename


def get_verdict(risk_score: float) -> str:
    if risk_score < 40:
        return "trusted"
    elif risk_score < 70:
        return "suspicious"
    else:
        return "high_risk"
