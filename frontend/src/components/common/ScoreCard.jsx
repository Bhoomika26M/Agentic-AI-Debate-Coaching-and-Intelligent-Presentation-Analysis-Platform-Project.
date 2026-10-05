import React from 'react';
import { Card } from './Card';
import { ProgressBar } from './ProgressBar';

export const ScoreCard = ({
  icon: Icon,
  title,
  score,
  maxScore = 100,
  description,
  accent = 'navy', // 'navy', 'blue', 'purple', 'teal', 'green'
  trend,
  className = '',
}) => {
  const accentStyles = {
    navy: {
      iconBg: 'bg-blue-50 text-[#172554] border-blue-100',
      bar: 'navy',
      badge: 'text-[#172554]',
    },
    blue: {
      iconBg: 'bg-blue-50 text-blue-600 border-blue-100',
      bar: 'blue',
      badge: 'text-blue-600',
    },
    purple: {
      iconBg: 'bg-purple-50 text-purple-600 border-purple-100',
      bar: 'purple',
      badge: 'text-purple-600',
    },
    teal: {
      iconBg: 'bg-teal-50 text-teal-600 border-teal-100',
      bar: 'teal',
      badge: 'text-teal-600',
    },
    green: {
      iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      bar: 'green',
      badge: 'text-emerald-600',
    },
  };

  const currentAccent = accentStyles[accent] || accentStyles.navy;

  return (
    <Card className={`flex flex-col justify-between ${className}`}>
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {title}
          </span>
          {Icon && (
            <div
              className={`w-9 h-9 rounded-xl border flex items-center justify-center ${currentAccent.iconBg}`}
            >
              <Icon className="w-5 h-5" />
            </div>
          )}
        </div>

        <div className="flex items-baseline gap-1.5 mb-1.5">
          <span className="text-3xl font-extrabold text-[#0F172A] tracking-tight">{score}</span>
          <span className="text-sm font-medium text-slate-400">/{maxScore}</span>
          {trend && (
            <span className="ml-auto text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              {trend}
            </span>
          )}
        </div>

        <p className="text-xs text-slate-500 leading-relaxed min-h-[2.25rem]">
          {description}
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100">
        <div className="flex justify-between items-center text-[11px] font-medium text-slate-400 mb-1.5">
          <span>Proficiency Target</span>
          <span className="font-semibold text-slate-700">{Math.round((score / maxScore) * 100)}%</span>
        </div>
        <ProgressBar value={score} max={maxScore} variant={currentAccent.bar} size="sm" />
      </div>
    </Card>
  );
};
