import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

export default function InterviewerDashboard() {
  const [meetings, setMeetings] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newMeeting, setNewMeeting] = useState({ title: '', scheduled_at: '', description: '' });
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      const res = await api.get('/meetings/my');
      setMeetings(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      // Must combine date and time to ISO format, but input type="datetime-local" gives local ISO format.
      // Append :00.000Z or just send it if backend parses natively.
      const payload = {
        ...newMeeting,
        scheduled_at: newMeeting.scheduled_at
      };
      await api.post('/meetings/create', payload);
      setShowCreate(false);
      setNewMeeting({ title: '', scheduled_at: '', description: '' });
      fetchMeetings();
    } catch (err) {
      alert("Failed to create meeting.");
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert("Copied code: " + text);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Recruiter Dashboard</h1>
            <p className="text-slate-400">Welcome, {user?.name} | Role: Interviewer</p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowCreate(!showCreate)} 
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-medium transition-colors"
            >
              + Create Meeting
            </button>
            <button onClick={logout} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl font-medium transition-colors text-white">
              Sign Out
            </button>
          </div>
        </div>

        {/* Create Meeting Drawer */}
        {showCreate && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl animate-in slide-in-from-top-4 fade-in duration-300">
            <h2 className="text-xl font-bold text-white mb-4">Schedule New Interview</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Position / Title</label>
                  <input required placeholder="e.g. Senior Frontend Dev" type="text" value={newMeeting.title} onChange={e => setNewMeeting({...newMeeting, title: e.target.value})} className="w-full bg-slate-800 border-slate-700 rounded-lg p-3 text-white focus:ring-1 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Scheduled Time</label>
                  <input required type="datetime-local" value={newMeeting.scheduled_at} onChange={e => setNewMeeting({...newMeeting, scheduled_at: e.target.value})} className="w-full bg-slate-800 border-slate-700 rounded-lg p-3 text-white focus:ring-1 focus:ring-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Description (Optional)</label>
                <textarea rows="2" value={newMeeting.description} onChange={e => setNewMeeting({...newMeeting, description: e.target.value})} className="w-full bg-slate-800 border-slate-700 rounded-lg p-3 text-white focus:ring-1 focus:ring-indigo-500" />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowCreate(false)} className="px-5 py-2 text-slate-400 hover:text-white transition-colors">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white font-medium shadow-lg shadow-indigo-500/20">Create & Generate Code</button>
              </div>
            </form>
          </div>
        )}

        {/* Meeting List */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          {meetings.length === 0 ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center">
              <span className="text-4xl mb-4">📅</span>
              <p>You haven't scheduled any interviews yet.</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-800/50 text-slate-400 text-sm">
                  <th className="p-4 font-semibold">Invite Code</th>
                  <th className="p-4 font-semibold">Title</th>
                  <th className="p-4 font-semibold">Scheduled For</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {meetings.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono bg-slate-950 text-indigo-400 px-2 py-1 rounded border border-slate-800">{m.invite_code}</span>
                        <button title="Copy link to join" onClick={() => copyToClipboard(m.invite_code)} className="text-slate-500 hover:text-white transition-colors">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        </button>
                      </div>
                    </td>
                    <td className="p-4 text-slate-200 font-medium">{m.title}</td>
                    <td className="p-4 text-slate-400 text-sm">
                      {new Date(m.scheduled_at).toLocaleDateString()} at {new Date(m.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        m.status === 'scheduled' ? 'bg-blue-900/50 text-blue-400' :
                        m.status === 'active' ? 'bg-amber-900/50 text-amber-400' :
                        'bg-emerald-900/50 text-emerald-400'
                      }`}>
                        {m.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {m.status !== 'completed' ? (
                        <button 
                          onClick={() => navigate(`/interviewer/proctor/${m.id}`)}
                          className="px-4 py-2 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-lg transition-all text-sm font-medium"
                        >
                          Proctor Room
                        </button>
                      ) : (
                        <button 
                          onClick={() => navigate(`/interviewer/report/${m.id}`)}
                          className="px-4 py-2 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-lg transition-all text-sm font-medium"
                        >
                          View Report
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
