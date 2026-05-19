import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWebSocket } from '../hooks/useWebSocket';
import { useWebRTC } from '../hooks/useWebRTC';
import RiskMeter from '../components/RiskMeter';
import AlertPanel from '../components/AlertPanel';
import api from '../utils/api';

export default function ProctorDashboard() {
  const { id: meetingId } = useParams();
  const navigate = useNavigate();
  
  // Realtime telemetry
  const { liveData, alerts } = useWebSocket(meetingId);
  
  // Realtime Video Feed (Interviewer = Host)
  const { remoteStream, connectionStatus, callPeer } = useWebRTC(meetingId, true, null);

  const [meeting, setMeeting] = useState(null);

  useEffect(() => {
    // Fetch meeting info to ensure it exists and we're authorized
    api.get('/meetings/my').then(res => {
      const match = res.data.find(m => m.id === Number(meetingId));
      if (!match) navigate('/interviewer');
      else setMeeting(match);
    }).catch(() => navigate('/interviewer'));
  }, [meetingId, navigate]);

  const endSession = async () => {
    if (!window.confirm("Are you sure you want to completely end this interview session?")) return;
    try {
      await api.patch(`/meetings/${meetingId}/end`);
      navigate(`/interviewer/report/${meetingId}`);
    } catch (err) {
      console.error(err);
      alert("Failed to end session");
    }
  };

  if (!meeting) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading Room...</div>;

  return (
    <div className="flex h-screen bg-slate-950 font-sans text-slate-200 p-4 gap-4">
      {/* Left Column: Video & Telemetry */}
      <div className="flex-[3] flex flex-col gap-4">
        
        {/* Header Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow p-4 flex justify-between items-center h-20 shrink-0">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Live Proctoring Console
            </h1>
            <p className="text-xs text-slate-400 font-mono mt-1">SESSION: {meeting.invite_code} | {meeting.title}</p>
          </div>
          <div className="flex gap-4 items-center">
            {connectionStatus !== 'connected' && (
              <button onClick={callPeer} className="px-4 py-2 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-lg transition-colors text-sm font-medium">
                Connect to Remote Camera
              </button>
            )}
            <button 
              onClick={endSession}
              className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-red-500/20"
            >
              Force End Session
            </button>
          </div>
        </div>

        {/* Video Feed Component */}
        <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative">
          {remoteStream ? (
            <video 
              autoPlay 
              playsInline 
              muted // Mute remote video so interviewer doesn't hear echo if they're in same room testing, but usually unmute!
              ref={el => { if (el) el.srcObject = remoteStream; }} 
              className="w-full h-full object-cover" 
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/50 backdrop-blur-sm z-10">
              <div className="w-16 h-16 border-4 border-slate-700 border-t-indigo-500 rounded-full animate-spin mb-4" />
              <p className="text-slate-400 font-medium">Waiting for Candidate's WebRTC Camera...</p>
              <p className="text-xs text-slate-500 mt-2">Status: {connectionStatus}</p>
            </div>
          )}

          {/* Connection badge */}
          <div className="absolute top-4 right-4 bg-slate-950/80 backdrop-blur border border-slate-800 px-3 py-1.5 rounded-full flex gap-2 items-center z-20 shadow">
            <div className={`w-2 h-2 rounded-full ${liveData ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <span className="text-xs font-mono tracking-wider font-semibold text-slate-300">
              {liveData ? 'WS LINK UP' : 'WS WAITING'}
            </span>
          </div>

          {/* Telemetry Overlay Panel */}
          <div className="absolute bottom-4 left-4 flex gap-4 z-20">
            <div className="bg-slate-950/80 backdrop-blur rounded-xl p-4 border border-slate-800 shadow-xl min-w-[200px]">
              <div className="text-xs text-slate-500 uppercase font-semibold mb-2">Live Telemetry</div>
              <div className="font-mono text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Gaze X</span>
                  <span className="text-emerald-400">{liveData?.gaze_direction ? liveData.gaze_direction.toUpperCase() : '---'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Confidence</span>
                  <span className="text-emerald-400">{liveData?.confidence != null ? (liveData.confidence * 100).toFixed(0) + '%' : '---'}</span>
                </div>
                <div className="flex justify-between border-t border-slate-800 pt-2 mt-2">
                  <span className="text-slate-400">Direction</span>
                  <span className="text-indigo-400 uppercase">{liveData?.gaze_direction || '---'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Faces detected</span>
                  <span className={liveData?.face_count === 1 ? "text-emerald-400" : "text-amber-400"}>{liveData?.face_count ?? '-'}</span>
                </div>
              </div>
            </div>
            
            {/* Live Verdict popup */}
            {liveData?.verdict && (
              <div className="bg-slate-950/80 backdrop-blur rounded-xl p-4 border border-slate-800 shadow-xl flex items-center gap-4">
                <div className="text-right">
                  <div className="text-xs text-slate-500 uppercase font-semibold">AI Verdict</div>
                  <div className={`text-lg font-bold uppercase tracking-wider ${liveData.verdict === 'trusted' ? 'text-emerald-500' : liveData.verdict === 'suspicious' ? 'text-amber-500' : 'text-red-500'}`}>
                    {liveData.verdict.replace('_', ' ')}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Gauges & Alerts */}
      <div className="flex-[1] flex flex-col gap-4 min-w-[320px] max-w-[400px]">
        {/* Dial Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow p-6 flex flex-col items-center justify-center shrink-0">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-6">Real-time Risk Index</h2>
          <RiskMeter score={liveData?.risk_score || 0} />
          <div className="mt-6 text-center">
            <span className="text-3xl font-bold text-white">{liveData ? liveData.risk_score.toFixed(1) : 0}<span className="text-lg text-slate-500">%</span></span>
          </div>
        </div>

        {/* Alert Stream */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow flex-1 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-800 bg-slate-900/50">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Automated Incident Logs</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <AlertPanel alerts={alerts} />
          </div>
        </div>
      </div>
    </div>
  );
}
