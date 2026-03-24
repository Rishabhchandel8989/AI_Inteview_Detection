import json
from datetime import datetime
from typing import List
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
import os


def build_json_report(session, gaze_events, alerts) -> dict:
    duration = ""
    if session.end_time and session.start_time:
        diff = (session.end_time - session.start_time).total_seconds()
        h = int(diff // 3600)
        m = int((diff % 3600) // 60)
        s = int(diff % 60)
        duration = f"{h:02d}:{m:02d}:{s:02d}"

    events_data = []
    for a in alerts:
        events_data.append({
            "time": a.timestamp.strftime("%H:%M:%S") if a.timestamp else "",
            "type": a.alert_type,
            "severity": a.severity,
            "description": a.description,
            "screenshot": a.screenshot_path,
        })

    gaze_log = []
    for g in gaze_events:
        gaze_log.append({
            "timestamp": g.timestamp.isoformat() if g.timestamp else "",
            "direction": g.gaze_direction,
            "confidence": g.confidence,
            "flagged": g.flagged,
        })

    return {
        "session_id": f"INT-{session.id:04d}",
        "candidate": session.candidate_name,
        "start_time": session.start_time.isoformat() if session.start_time else None,
        "end_time": session.end_time.isoformat() if session.end_time else None,
        "duration": duration,
        "risk_score": session.risk_score,
        "verdict": session.verdict,
        "events": events_data,
        "gaze_log": gaze_log,
    }


def build_pdf_report(session, gaze_events, alerts, output_path: str):
    doc = SimpleDocTemplate(output_path, pagesize=A4, topMargin=2 * cm, bottomMargin=2 * cm)
    styles = getSampleStyleSheet()
    story = []

    # Title
    title_style = ParagraphStyle("Title", fontSize=18, spaceAfter=12, textColor=colors.HexColor("#1e293b"), fontName="Helvetica-Bold")
    story.append(Paragraph("AI Interview Proctoring Report", title_style))

    sub_style = ParagraphStyle("Sub", fontSize=11, spaceAfter=6, textColor=colors.HexColor("#475569"))
    story.append(Paragraph(f"Candidate: <b>{session.candidate_name}</b>", sub_style))
    story.append(Paragraph(f"Session ID: INT-{session.id:04d}", sub_style))
    story.append(Paragraph(f"Start Time: {session.start_time.strftime('%Y-%m-%d %H:%M:%S') if session.start_time else 'N/A'}", sub_style))
    story.append(Paragraph(f"End Time: {session.end_time.strftime('%Y-%m-%d %H:%M:%S') if session.end_time else 'Ongoing'}", sub_style))

    verdict_color = "#16a34a" if session.verdict == "TRUSTED" else ("#d97706" if session.verdict == "SUSPICIOUS" else "#dc2626")
    story.append(Paragraph(f"Risk Score: <b>{session.risk_score:.1f}%</b>", sub_style))
    story.append(Paragraph(f"Verdict: <font color='{verdict_color}'><b>{session.verdict}</b></font>", sub_style))
    story.append(Spacer(1, 0.5 * cm))

    # Summary Stats
    story.append(Paragraph("Summary Statistics", ParagraphStyle("H2", fontSize=13, spaceAfter=6, fontName="Helvetica-Bold", textColor=colors.HexColor("#1e293b"))))

    gaze_off_count = sum(1 for a in alerts if a.alert_type == "GAZE_OFF")
    multi_face_count = sum(1 for a in alerts if a.alert_type == "MULTIPLE_FACES")
    no_face_count = sum(1 for a in alerts if a.alert_type == "NO_FACE")

    stats_data = [
        ["Metric", "Value"],
        ["Total Alerts", str(len(alerts))],
        ["Gaze Off Events", str(gaze_off_count)],
        ["Multiple Faces Detected", str(multi_face_count)],
        ["No Face Detected", str(no_face_count)],
        ["Total Gaze Records", str(len(gaze_events))],
    ]
    stats_table = Table(stats_data, colWidths=[10 * cm, 6 * cm])
    stats_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#f8fafc"), colors.white]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("PADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(stats_table)
    story.append(Spacer(1, 0.5 * cm))

    # Alert Timeline
    if alerts:
        story.append(Paragraph("Alert Timeline", ParagraphStyle("H2", fontSize=13, spaceAfter=6, fontName="Helvetica-Bold", textColor=colors.HexColor("#1e293b"))))
        alert_data = [["Time", "Type", "Severity", "Description"]]
        for a in alerts:
            t = a.timestamp.strftime("%H:%M:%S") if a.timestamp else ""
            alert_data.append([t, a.alert_type or "", a.severity or "", (a.description or "")[:60]])

        alert_table = Table(alert_data, colWidths=[3 * cm, 4.5 * cm, 3 * cm, 8 * cm])
        sev_colors = {"HIGH": colors.HexColor("#fee2e2"), "MEDIUM": colors.HexColor("#fef9c3"), "LOW": colors.HexColor("#dcfce7")}
        style_cmds = [
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("PADDING", (0, 0), (-1, -1), 5),
        ]
        for i, a in enumerate(alerts, 1):
            bg = sev_colors.get(a.severity, colors.white)
            style_cmds.append(("BACKGROUND", (0, i), (-1, i), bg))
        alert_table.setStyle(TableStyle(style_cmds))
        story.append(alert_table)
        story.append(Spacer(1, 0.5 * cm))

    # Screenshots
    screenshot_paths = [a.screenshot_path for a in alerts if a.screenshot_path and os.path.exists(a.screenshot_path)]
    if screenshot_paths:
        story.append(Paragraph("Suspicious Moment Screenshots", ParagraphStyle("H2", fontSize=13, spaceAfter=6, fontName="Helvetica-Bold", textColor=colors.HexColor("#1e293b"))))
        for sp in screenshot_paths[:6]:
            try:
                img = Image(sp, width=8 * cm, height=5 * cm)
                story.append(img)
                story.append(Spacer(1, 0.3 * cm))
            except Exception:
                pass

    doc.build(story)
    return output_path
