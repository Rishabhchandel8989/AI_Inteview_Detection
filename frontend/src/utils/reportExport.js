import jsPDF from 'jspdf';
import 'jspdf-autotable';

export function downloadJSON(sessionData) {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sessionData, null, 2));
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", `session_${sessionData.session.id}_report.json`);
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}

export function downloadPDF(sessionData) {
  const doc = new jsPDF();
  const { session, alerts } = sessionData;

  doc.setFontSize(18);
  doc.text("AI Interview Proctoring Report", 14, 22);

  doc.setFontSize(11);
  doc.text(`Candidate: ${session.candidate_name}`, 14, 32);
  doc.text(`Session ID: INT-${String(session.id).padStart(4, '0')}`, 14, 40);
  doc.text(`Start Time: ${new Date(session.start_time).toLocaleString()}`, 14, 48);
  doc.text(`Risk Score: ${session.risk_score.toFixed(1)}%`, 14, 56);
  doc.text(`Verdict: ${session.verdict}`, 14, 64);

  doc.setFontSize(14);
  doc.text("Alert Timeline", 14, 80);

  const tableData = alerts.map(a => [
    new Date(a.timestamp).toLocaleTimeString(),
    a.alert_type,
    a.severity,
    a.description?.substring(0, 50) || ""
  ]);

  doc.autoTable({
    startY: 85,
    head: [['Time', 'Type', 'Severity', 'Description']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  doc.save(`session_${session.id}_report.pdf`);
}
