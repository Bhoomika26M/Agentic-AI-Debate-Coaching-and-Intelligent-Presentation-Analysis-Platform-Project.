import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, CheckCircle, Info } from 'lucide-react';

export const FallacyBadge = ({ fallacy }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-rose-500/40 bg-rose-950/30 rounded-lg p-3 my-2 text-xs transition-all">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span className="font-semibold text-rose-300 tracking-wide uppercase">
            {fallacy.fallacy_name}
          </span>
          <span className="bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded text-[10px] font-mono">
            {Math.round((fallacy.confidence || 0.85) * 100)}% Confidence
          </span>
        </div>
        <button className="text-slate-400 hover:text-white p-1">
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      <p className="text-slate-300 mt-1 italic">
        "{fallacy.problematic_statement}"
      </p>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-rose-500/20 space-y-2 text-slate-300">
          <div>
            <span className="text-rose-400 font-medium">Why Problematic: </span>
            <span>{fallacy.why_problematic}</span>
          </div>
          <div>
            <span className="text-emerald-400 font-medium">Correct Reasoning: </span>
            <span>{fallacy.correct_reasoning}</span>
          </div>
          <div className="bg-slate-900/60 p-2 rounded border border-slate-700/50">
            <span className="text-primary-400 font-medium flex items-center gap-1 mb-1">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Improved Version:
            </span>
            <span className="text-slate-200">{fallacy.improved_argument}</span>
          </div>
        </div>
      )}
    </div>
  );
};
