import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSessionDetail } from '../utils/api';
import { downloadJSON, downloadPDF } from '../utils/reportExport';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import RiskMeter from '../components/RiskMeter';

export default function ReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFullReport = async () => {
      try {
        const result = await getSessionDetail(id);
        setData(result);
      } catch (err) {
        console.error("Failed to load report", err);
      } finally {
        setLoading(false);
      }
    };
    fetchFullReport();
  }, [id]);

  const timelineData = useMemo(() => {
    if (!data?.gaze_events) return [];
    
    // Group gaze events into 5-second buckets to avoid rendering 1000s of points
    const buckets = {};
    const startTime = new Date(data.session.start_time).getTime();
    
    data.gaze_events.forEach(g => {
      const gTime = new Date(g.timestamp).getTime();
      const secOffset = Math.floor((gTime - startTime) / 1000);
      const bucketIdx = Math.floor(secOffset / 5);
      
      if (!buckets[bucketIdx]) {
        buckets[bucketIdx] = { 
          timeStr: new Date(g.timestamp).toLocaleTimeString([], {minute:'2-digit', second:'2-digit'}),
          flagCount: 0 
        };
      }
      if (g.flagged) buckets[bucketIdx].flagCount += 1;
    });
    
    return Object.values(buckets);
  }, [data]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">Loading Report Data...</div>;
  if (!data) return <div className="min-h-screen flex items-center justify-center text-red-500">Report not found</div>;

  const { session, alerts } = data;

  const getVerdictGradient = (verdict) => {
    switch (verdict) {
      case 'TRUSTED': return 'from-green-500/20 to-transparent border-t border-green-500/50';
      case 'SUSPICIOUS': return 'from-yellow-500/20 to-transparent border-t border-yellow-500/50';
      case 'HIGH RISK': return 'from-red-500/20 to-transparent border-t border-red-500/50';
      default: return 'from-slate-800 to-transparent';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-200 p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div>
            <button 
              onClick={() => navigate('/history')}
              className="text-brand-400 hover:text-brand-300 font-medium text-sm mb-4 inline-flex items-center gap-1 transition-colors"
            >
              ← Back to History
            </button>
            <h1 className="text-3xl font-bold text-white mb-2">Proctoring Report</h1>
            <p className="text-slate-400 text-lg">Candidate: <span className="text-white font-medium">{session.candidate_name}</span></p>
            <p className="text-slate-500 font-mono text-sm mt-1">Session ID: INT-{String(session.id).padStart(4, '0')}</p>
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={() => downloadJSON(data)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg font-medium text-sm transition-colors shadow-sm"
            >
              Download JSON
            </button>
            <button 
              onClick={() => downloadPDF(data)}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-medium text-sm transition-colors shadow-lg shadow-brand-500/20"
            >
              Export PDF
            </button>
          </div>
        </div>

        {/* Top Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className={`col-span-1 glass-panel rounded-2xl p-6 bg-gradient-to-b ${getVerdictGradient(session.verdict)}`}>
            <RiskMeter score={session.risk_score} />
          </div>
          
          <div className="col-span-1 md:col-span-2 glass-panel rounded-2xl p-6 flex flex-col justify-center">
            <h3 className="text-lg font-semibold text-slate-300 mb-6">Session Details</h3>
            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
              <div>
                <p className="text-sm text-slate-500 uppercase tracking-wider mb-1">Started At</p>
                <p className="font-medium text-slate-200">{new Date(session.start_time).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 uppercase tracking-wider mb-1">Ended At</p>
                <p className="font-medium text-slate-200">
                  {session.end_time ? new Date(session.end_time).toLocaleString() : 'Ongoing'}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500 uppercase tracking-wider mb-1">Total Flags Raised</p>
                <p className="font-medium text-xl text-brand-400">{alerts.length}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 uppercase tracking-wider mb-1">Final Verdict</p>
                <p className={`font-bold ${session.verdict === 'TRUSTED' ? 'text-green-400' : session.verdict === 'SUSPICIOUS' ? 'text-yellow-400' : 'text-red-400'}`}>
                  {session.verdict}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline Chart */}
        <div className="glass-panel rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-slate-300 mb-6">Suspicion Timeline</h3>
          <div className="h-64 w-full">
            {timelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timelineData}>
                  <XAxis dataKey="timeStr" stroke="#64748b" tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                  <YAxis stroke="#64748b" tick={{fill: '#94a3b8', fontSize: 12}} dx={-10} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                    itemStyle={{ color: '#bae6fd' }}
                    labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                  />
                  <ReferenceLine y={0} stroke="#334155" />
                  <Line 
                    type="monotone" 
                    dataKey="flagCount" 
                    name="Flags / 5s"
                    stroke="#0ea5e9" 
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6, fill: '#38bdf8', stroke: '#0284c7', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500">No event data to display</div>
            )}
          </div>
        </div>

        {/* Detailed Alert Log */}
        <div className="glass-panel rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-slate-300 mb-6 flex justify-between items-end">
            Alert Log
            <span className="text-sm font-normal text-slate-500">{alerts.length} total events recorded</span>
          </h3>
          
          {alerts.length === 0 ? (
            <div className="text-center py-12 text-slate-500 border border-slate-800 border-dashed rounded-xl">
              No suspicious events recorded. Great job!
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left">
                <thead className="bg-slate-900 border-b border-slate-800">
                  <tr className="text-slate-400 text-sm uppercase tracking-wider">
                    <th className="px-5 py-3 font-medium">Time</th>
                    <th className="px-5 py-3 font-medium">Type</th>
                    <th className="px-5 py-3 font-medium">Severity</th>
                    <th className="px-5 py-3 font-medium">Description</th>
                    <th className="px-5 py-3 font-medium text-center">Snapshot</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/30">
                  {alerts.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-4 font-mono text-sm text-slate-400 whitespace-nowrap">
                        {new Date(a.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="px-5 py-4 font-medium text-slate-300">
                        {a.alert_type.replace(/_/g, ' ')}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold border ${a.severity === 'HIGH' ? 'bg-red-500/10 text-red-400 border-red-500/20' : a.severity === 'MEDIUM' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'}`}>
                          {a.severity}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-400 max-w-sm">
                        {a.description}
                      </td>
                      <td className="px-5 py-4 text-center">
                        {a.screenshot_path ? (
                          <a href={`http://localhost:8000/${a.screenshot_path}`} target="_blank" rel="noreferrer" className="text-brand-500 hover:text-brand-400 text-sm border-b border-transparent hover:border-brand-400 transition-colors inline-block pb-0.5">
                            View Image ↗
                          </a>
                        ) : (
                          <span className="text-slate-600 text-sm">—</span>
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
