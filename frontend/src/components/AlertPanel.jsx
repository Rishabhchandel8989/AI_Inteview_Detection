import React, { useEffect, useRef } from 'react';

const SEVERITY_STYLES = {
  HIGH: 'bg-red-500/10 border-red-500/30 text-red-400',
  MEDIUM: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
  LOW: 'bg-green-500/10 border-green-500/30 text-green-400'
};

const TYPE_ICONS = {
  GAZE_OFF: '👀',
  HEAD_TURN_RAPID: '🔄',
  MULTIPLE_FACES: '👥',
  NO_FACE: '👻',
  LIP_MOVEMENT: '👄'
};

export default function AlertPanel({ alerts }) {
  const containerRef = useRef(null);

  useEffect(() => {
    // Auto scroll to latest
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [alerts]);

  return (
    <div className="flex flex-col h-full glass-panel rounded-xl overflow-hidden">
      <div className="p-4 border-b border-slate-700/50 bg-slate-800/50 flex justify-between items-center">
        <h3 className="font-semibold text-slate-200">Live Event Feed</h3>
        <span className="text-xs font-mono bg-brand-500/20 text-brand-400 px-2 py-1 rounded">
          {alerts.length} events
        </span>
      </div>

      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3"
      >
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <span className="text-4xl mb-2">✨</span>
            <p>Monitoring active. No events yet.</p>
          </div>
        ) : (
          alerts.map((alert, idx) => (
            <div 
              key={`${alert.timestamp}-${idx}`} 
              className={`flex items-start gap-4 p-3 rounded-lg border animate-slide-in ${
                SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.LOW
              }`}
            >
              <div className="text-2xl mt-1">
                {TYPE_ICONS[alert.alert_type] || '⚠️'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-medium truncate pr-2">
                    {(alert.alert_type || 'ALERT').replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs font-mono opacity-60 shrink-0">
                    {alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString() : '—'}
                  </span>
                </div>
                <p className="text-sm opacity-80 leading-snug">
                  {alert.description || alert.msg || ''}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
