import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import CandidateView from './pages/CandidateView';
import ProctorDashboard from './pages/ProctorDashboard';
import SessionHistory from './pages/SessionHistory';
import ReportPage from './pages/ReportPage';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-brand-500/30">
        <Routes>
          <Route path="/" element={<Navigate to="/history" replace />} />
          <Route path="/candidate" element={<CandidateView />} />
          <Route path="/proctor" element={<ProctorDashboard />} />
          <Route path="/history" element={<SessionHistory />} />
          <Route path="/report/:id" element={<ReportPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
