import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useWebSocket } from '../hooks/useWebSocket';
import { getSessionDetail } from '../utils/api';
import RiskMeter from '../components/RiskMeter';
import AlertPanel from '../components/AlertPanel';

export default function ProctorDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const sessionId = new URLSearchParams(location.search).get('sessionId');

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Use the websocket connection
  const { alerts, riskScore, isConnected } = useWebSocket(sessionId);

  useEffect(() => {
    if (!sessionId) {
      navigate('/history');
      return;
    }

    const fetchSession = async () => {
      try {
        const data = await getSessionDetail(sessionId);
        setSession(data.session);
      } catch (err) {
        console.error("Failed to load session", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSession();
  }, [sessionId, navigate]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading Session Details...</div>;
  }

  if (!session) {
    return <div className="min-h-screen flex items-center justify-center text-red-500">Session not found</div>;
  }

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-200">
      {/* Top Navigation Bar */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-800 bg-slate-900/80 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/history')}
            className="text-slate-400 hover:text-white transition-colors p-2"
          >
            ← Back
          </button>
          <div>
            <h1 className="font-semibold text-xl leading-tight">Proctor Dashboard</h1>
            <p className="text-sm text-slate-400">
              Session INT-{String(session.id).padStart(4, '0')} • {session.candidate_name}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">Status:</span>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${isConnected ? 'border-green-500/30 text-green-400 bg-green-500/10' : 'border-slate-600 text-slate-400 bg-slate-800'}`}>
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`} />
              {isConnected ? 'Live' : 'Disconnected'}
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid Layout */}
      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
        
        {/* Left Column: Alerts & Risk */}
        <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-6 h-full">
          <RiskMeter score={riskScore || session.risk_score} />
          
          <div className="flex-1 min-h-[300px]">
            <AlertPanel alerts={alerts} />
          </div>
        </div>

        {/* Right Column: Placeholder for Video Feed */}
        <div className="lg:col-span-8 xl:col-span-9 glass-panel rounded-xl overflow-hidden flex flex-col">
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 bg-slate-900/50">
            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4">
               📷
            </div>
            <h3 className="text-xl font-medium text-slate-300 mb-2">WebRTC Video Feed Placeholder</h3>
            <p className="max-w-md mx-auto">
              In a full production build, a WebRTC peer-to-peer connection or media server stream would be rendered here so the proctor can view the candidate in real-time.
              <br /><br />
              Currently relying on the WebSocket event stream to monitor behavior.
            </p>
          </div>
          
          {/* Quick Session Stats */}
          <div className="h-24 bg-slate-900 border-t border-slate-800 flex divide-x divide-slate-800">
             <div className="flex-1 px-6 py-4 flex flex-col justify-center">
               <span className="text-xs text-slate-400 uppercase tracking-wider mb-1">Started At</span>
               <span className="font-medium font-mono">
                 {new Date(session.start_time).toLocaleTimeString()}
               </span>
             </div>
             <div className="flex-1 px-6 py-4 flex flex-col justify-center">
               <span className="text-xs text-slate-400 uppercase tracking-wider mb-1">Total Events</span>
               <span className="font-medium text-xl text-brand-400">{alerts.length}</span>
             </div>
             <div className="flex-1 px-6 py-4 flex flex-col justify-center align-end">
               <button 
                 onClick={() => navigate(`/report/${session.id}`)}
                 className="w-full bg-slate-800 hover:bg-slate-700 transition-colors py-2 rounded font-medium text-sm text-brand-300 border border-slate-700"
               >
                 View Full Report
               </button>
             </div>
          </div>
        </div>

      </main>
    </div>
  );
}
