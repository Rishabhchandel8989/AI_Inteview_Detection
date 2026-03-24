import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSessions } from '../utils/api';

export default function SessionHistory() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await getSessions();
        setSessions(data);
      } catch (err) {
        console.error("Failed to load sessions", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const getVerdictStyle = (verdict) => {
    switch (verdict) {
      case 'TRUSTED': return 'bg-green-500/20 text-green-400 border border-green-500/30';
      case 'SUSPICIOUS': return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
      case 'HIGH RISK': return 'bg-red-500/20 text-red-400 border border-red-500/30';
      default: return 'bg-slate-700 text-slate-300';
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-950 font-medium text-slate-400">Loading Sessions...</div>;

  return (
    <div className="min-h-screen bg-slate-950 p-6 sm:p-12 font-sans text-slate-200">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div className="flex justify-between items-end pb-6 border-b border-slate-800">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Proctoring History</h1>
            <p className="text-slate-400">Review past assessment sessions and AI-generated risk reports.</p>
          </div>
          <button 
            onClick={() => navigate('/candidate')}
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-medium transition-colors shadow-lg shadow-brand-500/20"
          >
            Start New Session
          </button>
        </div>

        {sessions.length === 0 ? (
          <div className="text-center py-20 px-6 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/50">
            <h3 className="text-xl font-medium mb-3 text-slate-300">No Sessions Yet</h3>
            <p className="text-slate-500 mb-6 max-w-sm mx-auto">Click "Start New Session" to begin monitoring your first assessment.</p>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/50 text-slate-400 text-sm uppercase tracking-wider border-b border-slate-800">
                    <th className="px-6 py-4 font-medium">Session ID</th>
                    <th className="px-6 py-4 font-medium">Candidate</th>
                    <th className="px-6 py-4 font-medium">Started At</th>
                    <th className="px-6 py-4 font-medium text-center">Score</th>
                    <th className="px-6 py-4 font-medium">Verdict</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {sessions.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-800/50 transition-colors group">
                      <td className="px-6 py-4 font-mono text-sm text-slate-400">
                        INT-{String(s.id).padStart(4, '0')}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-200">
                        {s.candidate_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400">
                        {new Date(s.start_time).toLocaleString()}
                        {!s.end_time && (
                           <span className="ml-2 inline-flex items-center gap-1 text-xs font-mono text-brand-400">
                             <div className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" /> LIVE
                           </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center font-mono font-semibold">
                        {s.risk_score.toFixed(1)}%
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold leading-none uppercase tracking-wide ${getVerdictStyle(s.verdict)}`}>
                          {s.verdict}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-3">
                        {!s.end_time ? (
                          <button
                            onClick={() => navigate(`/proctor?sessionId=${s.id}`)}
                            className="text-brand-400 hover:text-brand-300 font-medium text-sm transition-colors"
                          >
                            Join Dashboard
                          </button>
                        ) : (
                          <button
                            onClick={() => navigate(`/report/${s.id}`)}
                            className="text-slate-400 hover:text-white font-medium text-sm transition-colors group-hover:underline"
                          >
                            View Report →
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
