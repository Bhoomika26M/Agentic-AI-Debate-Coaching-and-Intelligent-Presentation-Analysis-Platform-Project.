"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin, Bus, Ticket } from "lucide-react";

export default function TrackSearchPage() {
  const router = useRouter();
  const [refInput, setRefInput] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (refInput.trim()) {
      router.push(`/track/${refInput.trim().toUpperCase()}`);
    }
  };

  const sampleRefs = [
    { ref: "KSRTC-7A8B9C", label: "TVM → Kochi (In Transit)" },
    { ref: "KSRTC-3X4Y5Z", label: "Kozhikode → Kannur (At Destination Depot)" },
    { ref: "KSRTC-9K8J7H", label: "Kollam → Kochi (Booked)" },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-4">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 px-3 py-1 rounded-full text-xs font-mono font-bold border border-amber-300 dark:border-amber-800">
          <Ticket className="w-3.5 h-3.5" />
          PUBLIC WAYBILL LOOKUP
        </div>
        <h1 className="text-3xl font-mono font-extrabold text-slate-900 dark:text-slate-100">
          Track Your Bus Parcel
        </h1>
        <p className="text-xs text-slate-600 dark:text-slate-400 font-sans max-w-md mx-auto">
          Enter your 6-character KSRTC parcel reference number to view real-time transit status and depot scan logs.
        </p>
      </div>

      <form onSubmit={handleSearch} className="bg-white dark:bg-slate-900 p-6 rounded-lg border-2 border-slate-300 dark:border-slate-700 shadow-ticket space-y-4">
        <label className="block text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
          WAYBILL REFERENCE NUMBER
        </label>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
            <input
              type="text"
              required
              placeholder="e.g. KSRTC-7A8B9C"
              value={refInput}
              onChange={(e) => setRefInput(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 pl-10 pr-4 py-3 text-base font-mono tracking-wider border border-slate-300 dark:border-slate-700 rounded focus:ring-2 focus:ring-amber-500 focus:outline-none uppercase"
            />
          </div>

          <button
            type="submit"
            className="bg-ksrtc-amber hover:bg-amber-500 text-slate-950 font-mono font-bold px-6 py-3 rounded text-sm transition-colors shadow"
          >
            Track Status
          </button>
        </div>
      </form>

      {/* Demo Reference Numbers */}
      <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-mono space-y-2">
        <span className="font-bold text-amber-700 dark:text-amber-400 block uppercase">
          DEMO WAYBILLS AVAILABLE FOR TESTING:
        </span>
        <div className="space-y-1.5">
          {sampleRefs.map((s) => (
            <button
              key={s.ref}
              onClick={() => router.push(`/track/${s.ref}`)}
              className="w-full text-left p-2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 hover:border-amber-400 flex items-center justify-between transition-colors"
            >
              <span className="font-bold text-slate-900 dark:text-slate-100">{s.ref}</span>
              <span className="text-slate-500">{s.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
