import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

export default function IntervieweeDashboard() {
  const [inviteCode, setInviteCode] = useState('');
  const [meetings, setMeetings] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    fetchMyMeetings();
  }, []);

  const fetchMyMeetings = async () => {
    try {
      const res = await api.get('/meetings/my');
      setMeetings(res.data);
    } catch (err) {
      console.error("Failed to fetch history", err);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/meetings/join', { invite_code: inviteCode });
      navigate(`/interviewee/room/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to join meeting");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white">Candidate Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-slate-400">Welcome, {user?.name}</span>
            <button onClick={logout} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-colors">
              Sign Out
            </button>
          </div>
        </div>

        {/* Join Gateway */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-xl text-white font-semibold mb-4">Join an Interview</h2>
          <form onSubmit={handleJoin} className="flex gap-4 items-start">
            <div className="flex-1">
              <input 
                type="text" 
                placeholder="Enter 8-character Invite Code (e.g. ABC-123)"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                required
                className="w-full bg-slate-800 border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono text-lg uppercase"
              />
              {error && <p className="text-red-400 mt-2 text-sm">{error}</p>}
            </div>
            <button 
              type="submit" 
              disabled={loading || !inviteCode}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Joining..." : "Join Room"}
            </button>
          </form>
        </div>

        {/* Past History */}
        <div>
          <h2 className="text-xl text-white font-semibold mb-4">Past Interviews</h2>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            {meetings.length === 0 ? (
              <div className="p-8 text-center text-slate-500">You haven't attended any interviews yet.</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-800/50 text-slate-400 text-sm">
                    <th className="p-4 font-semibold">Title</th>
                    <th className="p-4 font-semibold text-center">Date</th>
                    <th className="p-4 font-semibold text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {meetings.map(m => (
                    <tr key={m.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="p-4 font-medium text-slate-200">{m.title}</td>
                      <td className="p-4 text-center">{new Date(m.scheduled_at).toLocaleString()}</td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${m.status === 'completed' ? 'bg-emerald-900/50 text-emerald-400' : 'bg-amber-900/50 text-amber-400'}`}>
                          {m.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
