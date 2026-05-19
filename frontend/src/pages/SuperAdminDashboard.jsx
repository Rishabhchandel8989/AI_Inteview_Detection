import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function SuperAdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('users');

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-300">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 border-r border-slate-800 p-6 flex flex-col justify-between">
        <div>
          <h1 className="text-xl font-bold text-white mb-2">Admin Panel</h1>
          <p className="text-xs text-slate-500 mb-8">{user?.email}</p>
          
          <nav className="space-y-2">
            <button 
              onClick={() => setActiveTab('stats')}
              className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${activeTab === 'stats' ? 'bg-indigo-600/20 text-indigo-400' : 'hover:bg-slate-800'}`}
            >
              System Overview
            </button>
            <button 
              onClick={() => setActiveTab('users')}
              className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${activeTab === 'users' ? 'bg-indigo-600/20 text-indigo-400' : 'hover:bg-slate-800'}`}
            >
              User Management
            </button>
            <button 
              onClick={() => setActiveTab('sessions')}
              className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${activeTab === 'sessions' ? 'bg-indigo-600/20 text-indigo-400' : 'hover:bg-slate-800'}`}
            >
              All Sessions
            </button>
            <button 
              onClick={() => setActiveTab('logs')}
              className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${activeTab === 'logs' ? 'bg-indigo-600/20 text-indigo-400' : 'hover:bg-slate-800'}`}
            >
              Audit Logs
            </button>
          </nav>
        </div>
        
        <button onClick={logout} className="w-full text-left px-4 py-2 text-red-400 hover:bg-slate-800 rounded-lg transition-colors">
          Sign Out
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-8">
        <h2 className="text-2xl text-white font-bold mb-6 capitalize">{activeTab}</h2>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl flex items-center justify-center min-h-[400px]">
          <span className="text-slate-500 font-mono">Loading data for {activeTab}... (Backend APIs pending)</span>
        </div>
      </div>
    </div>
  );
}
