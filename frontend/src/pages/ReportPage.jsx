import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import RiskMeter from '../components/RiskMeter';

const BACKEND_URL = 'http://localhost:8000';

export default function ReportPage() {
  const { id } = useParams(); // This is meeting_id
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await api.get(`/meetings/${id}/report`);
        setData(res.data);
      } catch (err) {
        console.error("Failed to load report:", err);
        setError(err.response?.data?.detail || "Report not found or not yet available.");
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [id]);

  const timelineData = useMemo(() => {
    if (!data?.gaze_events) return [];
    const startTime = new Date(data.session.start_time).getTime();
    const buckets = {};
    data.gaze_events.forEach(g => {
      const secOffset = Math.floor((new Date(g.timestamp).getTime() - startTime) / 1000);
      const bucketIdx = Math.floor(secOffset / 5);
      if (!buckets[bucketIdx]) {
        buckets[bucketIdx] = {
          timeStr: `${bucketIdx * 5}s`,
          gaze_off: 0
        };
      }
      if (g.is_flagged) buckets[bucketIdx].gaze_off += 1;
    });
    return Object.values(buckets);
  }, [data]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-slate-700 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
        <p>Loading Report Data...</p>
      </div>
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-center p-8">
      <div>
        <div className="text-5xl mb-4">📋</div>
        <p className="text-red-400 text-xl font-semibold mb-2">Report Unavailable</p>
        <p className="text-slate-500">{error || "No proctoring session was recorded for this meeting."}</p>
        <button onClick={() => navigate('/interviewer')} className="mt-6 px-6 py-3 bg-indigo-600 rounded-xl text-white font-medium">
          ← Back to Dashboard
        </button>
      </div>
    </div>
  );

  const { session, alerts, gaze_events } = data;

  const gazeOffCount = gaze_events?.filter(g => g.is_flagged).length || 0;
  const verdictColor = session.verdict === 'trusted' ? 'text-emerald-400' : (session.verdict === 'suspicious' ? 'text-amber-400' : 'text-red-400');

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-200 p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div>
            <button
              onClick={() => navigate('/interviewer')}
              className="text-indigo-400 hover:text-indigo-300 font-medium text-sm mb-4 inline-flex items-center gap-1 transition-colors"
            >
              ← Back to Dashboard
            </button>
            <h1 className="text-3xl font-bold text-white mb-2">Proctoring Report</h1>
            <p className="text-slate-400 text-lg">
              Candidate: <span className="text-white font-medium">{session.candidate_name || 'Unknown'}</span>
            </p>
            <p className="text-slate-500 font-mono text-sm mt-1">Meeting ID: {id}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg font-medium text-sm transition-colors"
            >
              🖨️ Print Report
            </button>
          </div>
        </div>

        {/* Top Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <p className="text-slate-500 text-sm mb-1 uppercase tracking-wider">Verdict</p>
            <p className={`text-2xl font-bold uppercase ${verdictColor}`}>{session.verdict}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <p className="text-slate-500 text-sm mb-1 uppercase tracking-wider">Risk Score</p>
            <p className="text-2xl font-bold text-white">{Number(session.risk_score).toFixed(1)}<span className="text-sm text-slate-500">%</span></p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <p className="text-slate-500 text-sm mb-1 uppercase tracking-wider">Gaze Off Events</p>
            <p className="text-2xl font-bold text-amber-400">{session.total_gaze_off ?? gazeOffCount}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <p className="text-slate-500 text-sm mb-1 uppercase tracking-wider">Total Flags</p>
            <p className="text-2xl font-bold text-red-400">{session.total_flags ?? alerts.length}</p>
          </div>
        </div>

        {/* Risk Meter + Session Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center">
            <p className="text-slate-500 text-sm mb-4 uppercase tracking-wider">Risk Index</p>
            <RiskMeter score={Number(session.risk_score)} />
          </div>
          <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-slate-300 mb-4">Session Details</h3>
            <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
              <div>
                <p className="text-slate-500 uppercase tracking-wider text-xs mb-1">Started At</p>
                <p className="text-slate-200 font-medium">{new Date(session.start_time).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-slate-500 uppercase tracking-wider text-xs mb-1">Ended At</p>
                <p className="text-slate-200 font-medium">{session.end_time ? new Date(session.end_time).toLocaleString() : 'Ongoing'}</p>
              </div>
              <div>
                <p className="text-slate-500 uppercase tracking-wider text-xs mb-1">Total Events</p>
                <p className="text-slate-200 font-medium">{gaze_events?.length ?? 0}</p>
              </div>
              <div>
                <p className="text-slate-500 uppercase tracking-wider text-xs mb-1">Alerts Raised</p>
                <p className="text-slate-200 font-medium">{alerts?.length ?? 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Suspicion Timeline */}
        {timelineData.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-slate-300 mb-6">Gaze-Off Timeline (per 5s bucket)</h3>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timelineData}>
                  <XAxis dataKey="timeStr" stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <ReferenceLine y={0} stroke="#334155" />
                  <Line type="monotone" dataKey="gaze_off" name="Gaze-off events" stroke="#f59e0b" strokeWidth={2} dot={false} activeDot={{ r: 5, fill: '#fbbf24' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Alert Log with Screenshots */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="border-b border-slate-800 p-6 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-300">Alert Log</h3>
            <span className="text-sm text-slate-500">{alerts?.length ?? 0} events recorded</span>
          </div>
          {!alerts || alerts.length === 0 ? (
            <div className="p-10 text-center text-slate-500 text-sm">
              No suspicious events were recorded. ✅
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-800/40 text-slate-400 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3">Time</th>
                    <th className="px-5 py-3">Type</th>
                    <th className="px-5 py-3">Severity</th>
                    <th className="px-5 py-3">Screenshot</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {alerts.map((a, i) => (
                    <tr key={a.id || i} className="hover:bg-slate-800/20 transition-colors">
                      <td className="px-5 py-3 font-mono text-slate-400">
                        {new Date(a.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="px-5 py-3 text-slate-300 font-medium">
                        {(a.alert_type || '').replace(/_/g, ' ').toUpperCase()}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          a.severity === 'high' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                          a.severity === 'medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          'bg-slate-700 text-slate-400'
                        }`}>
                          {(a.severity || '').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {a.screenshot_path ? (
                          <a
                            href={`${BACKEND_URL}/screenshots/${a.screenshot_path.split('/').pop()}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-400 hover:text-indigo-300 font-medium underline underline-offset-2"
                          >
                            View Image ↗
                          </a>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
