import cv2
import numpy as np
from typing import Optional
import base64
import os

# Load OpenCV's pre-trained face and eye detectors
FACE_CASCADE = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
EYE_CASCADE = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_eye.xml")

SCREENSHOTS_DIR = "screenshots"
os.makedirs(SCREENSHOTS_DIR, exist_ok=True)


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


def analyze_frame(frame: np.ndarray) -> dict:
    """
    Analyzes a single frame for:
    - Number of faces (multiple / none detection)
    - Approximate gaze direction per face using eye positions
    - Rapid head turn indicator via face box aspect ratio
    - Lip movement heuristic via lower face brightness variation
    """
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    h, w = frame.shape[:2]

    faces = FACE_CASCADE.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(80, 80))
    face_count = len(faces)

    result = {
        "face_count": face_count,
        "gaze_direction": "CENTER",
        "confidence": 1.0,
        "flagged": False,
        "alert_type": None,
        "severity": None,
        "description": None,
        "risk_delta": 0.0,
    }

    if face_count == 0:
        result.update({
            "gaze_direction": "NONE",
            "flagged": True,
            "alert_type": "NO_FACE",
            "severity": "HIGH",
            "description": "No face detected — candidate may have left the seat.",
            "risk_delta": 15.0,
        })
        return result

    if face_count > 1:
        result.update({
            "flagged": True,
            "alert_type": "MULTIPLE_FACES",
            "severity": "HIGH",
            "description": f"{face_count} faces detected — possible third-party assistance.",
            "risk_delta": 20.0,
        })
        return result

    # Single face detected — analyze gaze
    fx, fy, fw, fh = faces[0]
    face_roi_gray = gray[fy:fy + fh, fx:fx + fw]
    face_roi_color = frame[fy:fy + fh, fx:fx + fw]
    face_cx = fx + fw // 2
    face_cy = fy + fh // 2

    # Gaze direction based on face center position within frame
    gaze_direction = "CENTER"
    h_margin = w * 0.20
    v_margin_top = h * 0.20
    v_margin_bottom = h * 0.20

    if face_cx < h_margin:
        gaze_direction = "LEFT"
    elif face_cx > w - h_margin:
        gaze_direction = "RIGHT"
    elif face_cy < v_margin_top:
        gaze_direction = "UP"
    elif face_cy > h - v_margin_bottom:
        gaze_direction = "DOWN"

    # Refine with eye detection inside face ROI
    eyes = EYE_CASCADE.detectMultiScale(face_roi_gray, scaleFactor=1.05, minNeighbors=3, minSize=(15, 15))
    if len(eyes) >= 2:
        eye_centers = [(ex + ew // 2, ey + eh // 2) for (ex, ey, ew, eh) in eyes[:2]]
        avg_eye_x = sum(e[0] for e in eye_centers) / 2
        avg_eye_y = sum(e[1] for e in eye_centers) / 2
        eye_x_ratio = avg_eye_x / fw
        eye_y_ratio = avg_eye_y / fh

        if eye_x_ratio < 0.35:
            gaze_direction = "LEFT"
        elif eye_x_ratio > 0.65:
            gaze_direction = "RIGHT"
        elif eye_y_ratio < 0.30:
            gaze_direction = "UP"
        elif eye_y_ratio > 0.60:
            gaze_direction = "DOWN"
        else:
            gaze_direction = "CENTER"

    # Lip movement heuristic: check lower-quarter face brightness variance
    lower_face = face_roi_gray[int(fh * 0.65):, :]
    lip_variance = float(np.var(lower_face)) if lower_face.size > 0 else 0.0
    lip_moving = lip_variance > 800

    # Head turn detection: face box aspect ratio anomaly
    aspect_ratio = fw / fh if fh > 0 else 1.0
    rapid_head_turn = aspect_ratio < 0.55

    if gaze_direction != "CENTER":
        result.update({
            "gaze_direction": gaze_direction,
            "flagged": True,
            "alert_type": "GAZE_OFF",
            "severity": "MEDIUM",
            "description": f"Candidate looking {gaze_direction}.",
            "risk_delta": 5.0,
        })
    elif rapid_head_turn:
        result.update({
            "gaze_direction": gaze_direction,
            "flagged": True,
            "alert_type": "HEAD_TURN_RAPID",
            "severity": "MEDIUM",
            "description": "Rapid head turn detected.",
            "risk_delta": 8.0,
        })
    elif lip_moving:
        result.update({
            "gaze_direction": gaze_direction,
            "flagged": True,
            "alert_type": "LIP_MOVEMENT",
            "severity": "LOW",
            "description": "Lip movement detected — possible whispering.",
            "risk_delta": 3.0,
        })
    else:
        result["gaze_direction"] = gaze_direction

    return result


def save_screenshot(session_id: int, frame: np.ndarray, alert_type: str) -> str:
    """Save annotated frame as screenshot and return path."""
    import time
    filename = f"{SCREENSHOTS_DIR}/session_{session_id}_{alert_type}_{int(time.time())}.jpg"
    cv2.imwrite(filename, frame)
    return filename


def get_verdict(risk_score: float) -> str:
    if risk_score < 40:
        return "TRUSTED"
    elif risk_score < 70:
        return "SUSPICIOUS"
    else:
        return "HIGH RISK"
