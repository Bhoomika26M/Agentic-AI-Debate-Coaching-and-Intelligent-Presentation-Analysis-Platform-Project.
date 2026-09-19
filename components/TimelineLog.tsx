import { TimelineEntry } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { Clock, MapPin, Bus, CheckCircle2, ShieldCheck } from "lucide-react";

interface TimelineLogProps {
  timeline: TimelineEntry[];
}

export default function TimelineLog({ timeline }: TimelineLogProps) {
  if (!timeline || timeline.length === 0) {
    return (
      <p className="text-xs text-slate-500 font-mono italic">
        No timeline scan events logged yet.
      </p>
    );
  }

  // Reverse chronological (newest first)
  const sorted = [...timeline].reverse();

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
      {sorted.map((entry, idx) => {
        const isLatest = idx === 0;

        return (
          <div key={idx} className="relative group">
            {/* Timeline Dot */}
            <div
              className={`absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full border-2 ${
                isLatest
                  ? "bg-amber-500 border-amber-600 active-pulse"
                  : "bg-emerald-600 border-emerald-700"
              }`}
            />

            {/* Event Card */}
            <div
              className={`p-3.5 rounded border transition-all ${
                isLatest
                  ? "bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/60 shadow-sm"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <span
                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                    isLatest
                      ? "bg-amber-500 text-slate-950"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  {entry.status}
                </span>

                <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>{formatDate(entry.at)}</span>
                </div>
              </div>

              <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 font-sans leading-relaxed">
                {entry.note}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
