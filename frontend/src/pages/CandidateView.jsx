import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWebcam } from '../hooks/useWebcam';
import { useFaceDetection } from '../hooks/useFaceDetection';
import { useWebRTC } from '../hooks/useWebRTC';
import GazeOverlay from '../components/GazeOverlay';
import api from '../utils/api';

export default function CandidateView() {
  const { id: meetingId } = useParams();
  const navigate = useNavigate();
  
  // 1. Get Camera
  const { videoRef, stream, error: camError, startWebcam, stopWebcam } = useWebcam();
  
  // 2. State
  const [sessionData, setSessionData] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  
  // 3. WebRTC Networking (Candidate = Guest)
  const { peer, remoteStream, connectionStatus, callPeer } = useWebRTC(meetingId, false, stream);

  // 4. AI Proctoring (Runs silently on local stream)
  const { isModelLoaded, faces, canvasRef } = useFaceDetection(videoRef, sessionData?.id, isRecording);

  useEffect(() => {
    startWebcam();
    return () => stopWebcam();
  }, [startWebcam]);

  const handleStart = async (e) => {
    e.preventDefault();
    if (!stream) return;
    try {
      // Create the proctoring session link in the backend
      const res = await api.post('/sessions/start', { meeting_id: Number(meetingId) });
      setSessionData(res.data);
      setIsRecording(true);
      
      // Attempt to call the interviewer if they are ready
      callPeer();
    } catch (err) {
      alert("Failed to start session. Is backend running?");
    }
  };

  const handleEnd = async () => {
    stopWebcam();
    navigate('/interviewee');
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6 flex flex-col font-sans text-slate-200">
      
      {/* Header */}
      <header className="flex justify-between items-center mb-6 bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
            Live Interview
          </h1>
          <p className="text-sm text-slate-400">
            {isRecording ? "Proctoring Active" : "Waiting to Start"} 
            <span className="ml-4 text-xs bg-slate-800 px-2 py-1 rounded">Peer: {connectionStatus}</span>
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${camError ? 'bg-red-500' : stream ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
            <span className="text-sm font-medium text-slate-300">
              {camError ? 'Camera Error' : stream ? 'Camera Active' : 'Starting Camera...'}
            </span>
          </div>
          {isRecording && (
            <button 
              onClick={handleEnd}
              className="bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white px-6 py-2 rounded-xl font-medium transition-all"
            >
              End Interview
            </button>
          )}
        </div>
      </header>

      {/* Main Split View */}
      <main className="flex-1 flex gap-6 mt-4">
        
        {/* Left: Remote Interviewer Video Feed */}
        <div className="flex-[2] bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden relative flex flex-col items-center justify-center">
          {remoteStream ? (
            <video 
              autoPlay 
              playsInline 
              ref={(ref) => { if (ref) ref.srcObject = remoteStream; }} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center p-8">
              <div className="text-6xl mb-4 opacity-50">👨‍💼</div>
              <p className="text-xl text-slate-400 font-medium">Waiting for Interviewer...</p>
              <p className="text-sm text-slate-500 mt-2">Their video feed will appear here when connected.</p>
            </div>
          )}
          
          {/* Controls overlay */}
          {connectionStatus === 'connected' && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-950/80 backdrop-blur px-4 py-2 rounded-full border border-slate-800 flex gap-4">
               <button className="text-slate-300 hover:text-white">🔇 Mute</button>
               <button className="text-slate-300 hover:text-white">📷 Camera</button>
            </div>
          )}
        </div>

        {/* Right: Local Candidate Video & System State */}
        <div className="flex-1 flex flex-col gap-6 w-full max-w-sm">
          
          <div className={`relative bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl aspect-[4/3] ${!isRecording && 'opacity-70 grayscale'}`}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform -scale-x-100 bg-slate-950" 
            />
            {isRecording && <GazeOverlay faces={faces} canvasRef={canvasRef} videoRef={videoRef} />}
            
            {!isRecording && (
              <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-6 text-center flex-col">
                <h3 className="text-white font-semibold text-lg mb-2">Ready to join?</h3>
                <p className="text-slate-300 text-sm mb-6">AI proctoring will monitor your eye gaze continuously.</p>
                <button
                  onClick={handleStart}
                  disabled={!stream || !isModelLoaded}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-wait text-white py-3 rounded-xl font-medium shadow-lg transition-transform hover:scale-[1.02]"
                >
                  {!isModelLoaded ? 'Loading AI Model...' : 'Start Monitoring & Connect'}
                </button>
              </div>
            )}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex-1 flex flex-col">
             <h3 className="text-slate-400 font-semibold mb-4 uppercase text-sm tracking-wider">System Status</h3>
             <ul className="space-y-4 text-sm mt-auto mb-auto">
               <li className="flex justify-between items-center border-b border-slate-800 pb-3">
                 <span className="text-slate-400">MediaPipe AI</span>
                 <span className={isModelLoaded ? "text-emerald-400" : "text-amber-400"}>{isModelLoaded ? 'Loaded' : 'Downloading'}</span>
               </li>
               <li className="flex justify-between items-center border-b border-slate-800 pb-3">
                 <span className="text-slate-400">Visual Tracking</span>
                 <span className={isRecording ? "text-emerald-400" : "text-slate-600"}>{isRecording ? 'Active' : 'Standby'}</span>
               </li>
               <li className="flex justify-between items-center border-b border-slate-800 pb-3">
                 <span className="text-slate-400">Server Link</span>
                 <span className={sessionData ? "text-emerald-400" : "text-slate-600"}>{sessionData ? 'Connected' : 'Offline'}</span>
               </li>
               <li className="flex justify-between items-center">
                 <span className="text-slate-400">Peer to Peer</span>
                 <span className={connectionStatus === 'connected' ? "text-emerald-400" : "text-amber-400"}>{connectionStatus}</span>
               </li>
             </ul>
          </div>
        </div>

      </main>
    </div>
  );
}
