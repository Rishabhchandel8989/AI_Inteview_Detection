import React from 'react';

export default function RiskMeter({ score }) {
  // score is 0-100
  const normalizedScore = Math.min(100, Math.max(0, score || 0));
  
  let colorClass = 'text-green-500';
  let bgClass = 'bg-green-500';
  let label = 'TRUSTED';
  
  if (normalizedScore >= 70) {
    colorClass = 'text-red-500';
    bgClass = 'bg-red-500';
    label = 'HIGH RISK';
  } else if (normalizedScore >= 40) {
    colorClass = 'text-yellow-500';
    bgClass = 'bg-yellow-500';
    label = 'SUSPICIOUS';
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 glass-panel rounded-xl">
      <h3 className="text-slate-400 text-sm font-medium mb-4 uppercase tracking-wider">Live Risk Score</h3>
      
      <div className="relative w-40 h-40 flex items-center justify-center">
        {/* Background Circle */}
        <svg className="absolute w-full h-full transform -rotate-90">
          <circle
            cx="80"
            cy="80"
            r="70"
            fill="transparent"
            stroke="currentColor"
            strokeWidth="12"
            className="text-slate-700"
          />
          {/* Progress Circle */}
          <circle
            cx="80"
            cy="80"
            r="70"
            fill="transparent"
            stroke="currentColor"
            strokeWidth="12"
            strokeDasharray={`${2 * Math.PI * 70}`}
            strokeDashoffset={`${2 * Math.PI * 70 * (1 - normalizedScore / 100)}`}
            className={`${colorClass} transition-all duration-1000 ease-out`}
            strokeLinecap="round"
          />
        </svg>
        
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className={`text-4xl font-bold ${colorClass}`}>
            {Math.round(normalizedScore)}
          </span>
          <span className="text-xs text-slate-400 mt-1">%</span>
        </div>
      </div>
      
      <div className={`mt-6 px-4 py-1.5 rounded-full text-sm font-semibold border ${colorClass.replace('text', 'border')} ${colorClass.replace('text', 'bg').replace('500', '500/10')} ${colorClass}`}>
        {label}
      </div>
    </div>
  );
}
