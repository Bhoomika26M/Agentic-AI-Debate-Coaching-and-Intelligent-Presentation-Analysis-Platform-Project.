import React from 'react';

export const ScoreGauge = ({ score, size = 'lg', label = 'Overall Score', weight }) => {
  const numericScore = parseFloat(score || 0);
  
  const getColor = (s) => {
    if (s >= 85) return 'text-emerald-400 stroke-emerald-500';
    if (s >= 75) return 'text-primary-400 stroke-primary-500';
    if (s >= 65) return 'text-amber-400 stroke-amber-500';
    return 'text-rose-400 stroke-rose-500';
  };

  const radius = size === 'lg' ? 42 : (size === 'md' ? 32 : 24);
  const strokeWidth = size === 'lg' ? 7 : (size === 'md' ? 5 : 4);
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (numericScore / 100) * circumference;
  const viewBoxSize = (radius + strokeWidth) * 2;

  return (
    <div className="flex flex-col items-center justify-center text-center">
      <div className="relative flex items-center justify-center">
        <svg
          width={viewBoxSize}
          height={viewBoxSize}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={viewBoxSize / 2}
            cy={viewBoxSize / 2}
            r={radius}
            className="stroke-slate-700/60"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress circle */}
          <circle
            cx={viewBoxSize / 2}
            cy={viewBoxSize / 2}
            r={radius}
            className={`${getColor(numericScore)} transition-all duration-1000 ease-out`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-extrabold tracking-tight ${size === 'lg' ? 'text-2xl' : (size === 'md' ? 'text-lg' : 'text-sm')} text-white`}>
            {numericScore.toFixed(1)}
          </span>
          <span className="text-[10px] text-slate-400 uppercase font-semibold">/100</span>
        </div>
      </div>
      {label && (
        <div className="mt-2">
          <p className="text-xs font-medium text-slate-300">{label}</p>
          {weight && <p className="text-[10px] text-primary-400 font-semibold">{weight}</p>}
        </div>
      )}
    </div>
  );
};
