import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebcam } from '../hooks/useWebcam';
import { useFaceDetection } from '../hooks/useFaceDetection';
import { createSession, endSession } from '../utils/api';
import GazeOverlay from '../components/GazeOverlay';

export default function CandidateView() {
  const [candidateName, setCandidateName] = useState('');
  const [sessionData, setSessionData] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const navigate = useNavigate();

  const { videoRef, stream, error, startWebcam, stopWebcam } = useWebcam();
  const { isModelLoaded, faces, canvasRef } = useFaceDetection(videoRef, sessionData?.id, isRecording);

  useEffect(() => {
    startWebcam();
    return () => stopWebcam();
  }, [startWebcam]); // Only depend on startWebcam, which is stable

  const handleStart = async (e) => {
    e.preventDefault();
    if (!candidateName.trim() || !stream) return;
    try {
      const s = await createSession(candidateName);
      setSessionData(s);
      setIsRecording(true);
    } catch (err) {
      alert("Failed to start session. Is backend running?");
    }
  };

  const handleEnd = async () => {
    if (sessionData) {
      setIsRecording(false);
      await endSession(sessionData.id);
      stopWebcam();
      navigate('/history');
    }
  };

  if (error) {
    return <div className="p-8 text-center text-red-500 bg-slate-900 min-h-screen">
      <h2 className="text-2xl mb-4">Camera Error</h2>
      <p>{error}</p>
    </div>;
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-950">
      {/* Header */}
      <div className="px-6 py-4 flex justify-between items-center bg-slate-900 border-b border-slate-800 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-slate-500'}`} />
          <h1 className="font-semibold text-lg text-slate-200">
            {isRecording ? 'Assessment in Progress' : 'Candidate Setup'}
          </h1>
        </div>
        
        {isRecording && (
          <button 
            onClick={handleEnd}
            className="px-4 py-2 bg-slate-800 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg transition-colors border border-slate-700 hover:border-red-500/50 font-medium text-sm"
          >
            End Assessment
          </button>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative flex items-center justify-center p-6 sm:p-12 overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800/40 via-slate-950/20 to-slate-950">
        
        {!isRecording && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
            <form onSubmit={handleStart} className="glass-panel p-8 rounded-2xl w-full max-w-sm flex flex-col gap-6 animate-fade-in">
              <div className="text-center mb-2">
                <h2 className="text-2xl font-bold text-white mb-2">Welcome</h2>
                <p className="text-sm text-slate-400">Please enter your name as it appears on your application to begin.</p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Full Name</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={candidateName}
                  onChange={e => setCandidateName(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all placeholder:text-slate-600"
                  placeholder="e.g. Jane Doe"
                />
              </div>

              {!isModelLoaded ? (
                <div className="flex flex-col items-center justify-center py-4 text-brand-400">
                  <div className="w-6 h-6 border-2 border-brand-500/20 border-t-brand-500 rounded-full animate-spin mb-3"></div>
                  <span className="text-sm">Loading AI Models...</span>
                </div>
              ) : (
                <button 
                  type="submit"
                  disabled={!stream}
                  className="w-full bg-brand-600 hover:bg-brand-500 text-white font-semibold py-3 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-500/20 active:scale-[0.98]"
                >
                  Start Monitoring
                </button>
              )}
            </form>
          </div>
        )}

        {/* Video Container */}
        <div className={`relative rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 mx-auto transition-all duration-700 ${isRecording ? 'w-full max-w-5xl aspect-video' : 'w-full max-w-sm aspect-[4/3] blur-sm scale-95 opacity-50'}`}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover transform -scale-x-100 bg-slate-900" 
          />
          {isRecording && (
            <GazeOverlay faces={faces} canvasRef={canvasRef} videoRef={videoRef} />
          )}
          
          {/* subtle scanning effect line */}
          {isRecording && (
            <div className="absolute inset-0 z-20 pointer-events-none opacity-20">
              <div className="w-full h-[2px] bg-brand-400/50 blur-[1px] shadow-[0_0_15px_rgba(14,165,233,0.8)] animate-[scan_3s_ease-in-out_infinite]" />
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes scan {
          0% { transform: translateY(-10%); }
          50% { transform: translateY(110%); }
          100% { transform: translateY(-10%); }
        }
      `}</style>
    </div>
  );
}
