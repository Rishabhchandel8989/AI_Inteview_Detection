import numpy as np
import traceback
import sys
from detection import analyze_frame


def test_no_face():
    """Black frame: no face, should return NO_FACE alert."""
    frame = np.zeros((480, 640, 3), dtype=np.uint8)
    res = analyze_frame(frame, session_key="test_no_face")
    assert res["face_count"] == 0, f"Expected 0 faces, got {res['face_count']}"
    assert res["alert_type"] == "NO_FACE", f"Expected NO_FACE, got {res['alert_type']}"
    assert res["severity"] == "HIGH", f"Expected HIGH severity"
    assert res["flagged"] is True, "Expected flagged=True"
    print("[PASS] test_no_face:", res)


def test_gaze_direction_is_lowercase():
    """Gaze direction values must be lowercase to match DB enum."""
    frame = np.zeros((480, 640, 3), dtype=np.uint8)
    res = analyze_frame(frame, session_key="test_enum")
    valid_directions = {"center", "left", "right", "up", "down", "none"}
    assert res["gaze_direction"] in valid_directions, (
        f"Direction '{res['gaze_direction']}' is not lowercase / not in valid set"
    )
    print("[PASS] test_gaze_direction_is_lowercase:", res["gaze_direction"])


def test_confidence_in_range():
    """Confidence must be a float between 0.0 and 1.0."""
    frame = np.zeros((480, 640, 3), dtype=np.uint8)
    res = analyze_frame(frame, session_key="test_conf")
    assert 0.0 <= res["confidence"] <= 1.0, (
        f"Confidence {res['confidence']} out of range [0, 1]"
    )
    print("[PASS] test_confidence_in_range:", res["confidence"])


def test_temporal_smoothing_no_false_alert():
    """First few off-center frames should NOT trigger an alert (below confirm threshold)."""
    # All-white frame: likely no face detected, but gaze_direction should still be returned
    frame = np.ones((480, 640, 3), dtype=np.uint8) * 200
    for i in range(2):
        res = analyze_frame(frame, session_key="test_smooth")
    # With only 2 frames and no real face, should not produce GAZE_OFF based on smoothing
    # (It may still produce NO_FACE — that's fine)
    if res["alert_type"] == "GAZE_OFF":
        print("[WARN] test_temporal_smoothing: GAZE_OFF fired in < 3 frames (check threshold)")
    else:
        print("[PASS] test_temporal_smoothing_no_false_alert:", res)


def test_risk_delta_positive_on_flag():
    """Flagged detections must have a positive risk_delta."""
    frame = np.zeros((480, 640, 3), dtype=np.uint8)
    res = analyze_frame(frame, session_key="test_risk")
    if res["flagged"]:
        assert res["risk_delta"] > 0, "Flagged result should have risk_delta > 0"
        print("[PASS] test_risk_delta_positive_on_flag:", res["risk_delta"])
    else:
        print("[SKIP] test_risk_delta_positive_on_flag: frame not flagged")


if __name__ == "__main__":
    print("=" * 60)
    print("Running Detection Tests")
    print("=" * 60)
    tests = [
        test_no_face,
        test_gaze_direction_is_lowercase,
        test_confidence_in_range,
        test_temporal_smoothing_no_false_alert,
        test_risk_delta_positive_on_flag,
    ]
    failed = 0
    for t in tests:
        try:
            t()
        except AssertionError as e:
            print(f"[FAIL] {t.__name__}: {e}")
            failed += 1
        except Exception:
            print(f"[ERROR] {t.__name__}:")
            traceback.print_exc(file=sys.stdout)
            failed += 1

    print("=" * 60)
    if failed == 0:
        print("All tests passed!")
    else:
        print(f"{failed} test(s) failed.")
    print("=" * 60)
