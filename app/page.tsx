"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search, Package, ShieldCheck, Bus, ArrowRight, CheckCircle2, Ticket } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [refInput, setRefInput] = useState("");

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (refInput.trim()) {
      router.push(`/track/${refInput.trim().toUpperCase()}`);
    }
  };

  const sampleParcels = [
    { ref: "KSRTC-7A8B9C", label: "TVM → Kochi (In Transit)", status: "In transit" },
    { ref: "KSRTC-3X4Y5Z", label: "Kozhikode → Kannur (Ready for Pickup)", status: "Arrived at destination depot" },
    { ref: "KSRTC-9K8J7H", label: "Kollam → Kochi (Booked)", status: "Booked" },
  ];

  return (
    <div className="space-y-12">
      
      {/* Hero Banner */}
      <section className="bg-slate-900 text-white rounded-xl p-6 sm:p-10 border-b-8 border-ksrtc-amber shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-12 -translate-y-12">
          <Bus className="w-96 h-96 text-white" />
        </div>

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 bg-emerald-900/80 border border-emerald-600 px-3 py-1 rounded-full text-xs font-mono text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            OFFICIAL KSRTC BUS LOGISTICS NETWORK
          </div>

          <h1 className="text-3xl sm:text-5xl font-mono font-extrabold text-white tracking-tight leading-tight">
            Inter-Depot Bus Parcel Transit Across Kerala
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed font-sans">
            Send parcels between 30+ KSRTC stations directly on scheduled state transport buses. Track your waybill anywhere using only your reference number — no login or phone lookup required.
          </p>

          {/* Quick Track Input Box */}
          <form onSubmit={handleTrackSubmit} className="pt-4 max-w-xl">
            <div className="flex flex-col sm:flex-row gap-2 bg-slate-950 p-2 rounded-lg border-2 border-amber-500/80 shadow-lg">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Enter Waybill Ref (e.g. KSRTC-7A8B9C)"
                  value={refInput}
                  onChange={(e) => setRefInput(e.target.value)}
                  className="w-full bg-transparent text-white pl-10 pr-4 py-3 text-sm font-mono tracking-wider focus:outline-none placeholder-slate-500 uppercase"
                />
              </div>
              <button
                type="submit"
                className="bg-ksrtc-amber hover:bg-amber-500 text-slate-950 font-bold px-6 py-3 rounded text-sm font-mono flex items-center justify-center gap-2 transition-colors shadow"
              >
                <span>Track Waybill</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Demo Quick Track Samples */}
          <div className="pt-2 flex flex-wrap items-center gap-2 text-xs font-mono text-slate-400">
            <span className="text-amber-400 font-bold">Try Demo Waybills:</span>
            {sampleParcels.map((sp) => (
              <button
                key={sp.ref}
                onClick={() => router.push(`/track/${sp.ref}`)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded border border-slate-700 transition-colors"
              >
                {sp.ref}
              </button>
            ))}
          </div>

        </div>
      </section>

      {/* 3 Main Action Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Book */}
        <div className="bg-white dark:bg-slate-900 rounded-lg p-6 border-2 border-slate-200 dark:border-slate-800 shadow-ticket flex flex-col justify-between hover:border-emerald-600 transition-all group">
          <div>
            <div className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <Package className="w-6 h-6" />
            </div>
            <h3 className="font-mono font-bold text-lg text-slate-900 dark:text-slate-100 mb-2">
              Book a Bus Parcel
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
              Choose origin and destination depots, select bus timings with live remaining cargo space, and get an instant reference number & delivery OTP.
            </p>
          </div>
          <Link
            href="/book"
            className="inline-flex items-center gap-2 text-xs font-mono font-bold text-emerald-800 dark:text-emerald-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-300"
          >
            <span>Start Booking Form</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Card 2: Track */}
        <div className="bg-white dark:bg-slate-900 rounded-lg p-6 border-2 border-slate-200 dark:border-slate-800 shadow-ticket flex flex-col justify-between hover:border-amber-500 transition-all group">
          <div>
            <div className="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="font-mono font-bold text-lg text-slate-900 dark:text-slate-100 mb-2">
              Public Tracking
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
              Enter your reference number to view the 6-stage transit stepper and real-time reverse-chronological timeline of depot scan notes.
            </p>
          </div>
          <Link
            href="/track"
            className="inline-flex items-center gap-2 text-xs font-mono font-bold text-amber-700 dark:text-amber-400 group-hover:text-amber-600 dark:group-hover:text-amber-300"
          >
            <span>Open Tracking Lookup</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Card 3: Staff */}
        <div className="bg-white dark:bg-slate-900 rounded-lg p-6 border-2 border-slate-200 dark:border-slate-800 shadow-ticket flex flex-col justify-between hover:border-slate-700 transition-all group">
          <div>
            <div className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-mono font-bold text-lg text-slate-900 dark:text-slate-100 mb-2">
              Depot Staff Desk
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
              Simulate depot staff scans to advance parcel status, verify receiver OTPs upon final handover, and view station manifests.
            </p>
          </div>
          <Link
            href="/staff"
            className="inline-flex items-center gap-2 text-xs font-mono font-bold text-slate-800 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100"
          >
            <span>Open Depot Desk</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

      </section>

      {/* Hackathon Submission Highlights */}
      <section className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-6 rounded-lg">
        <h3 className="font-mono font-bold text-emerald-900 dark:text-emerald-300 text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
          <Ticket className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          Shared Persistent Storage & Live Walkthrough Ready
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700 dark:text-slate-300">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <p>
              <strong>Multi-device persistent sync:</strong> Book on phone → Advance on depot staff screen → View live tracking update on receiver phone.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <p>
              <strong>OTP Delivery Guard:</strong> Server-side validation ensures parcel delivery cannot be completed without the correct 4-digit receiver code.
            </p>
          </div>
        </div>
      </section>

    </div>
  );
}
