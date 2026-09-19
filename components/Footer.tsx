import Link from "next/link";
import { Bus } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 py-10 mt-16 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Bus className="w-5 h-5 text-amber-500" />
              <span className="font-mono font-bold text-lg text-white">Aanavandi Parcel</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Official State Bus Cargo Network for Kerala. Direct depot-to-depot parcel transit across 30+ KSRTC stations.
            </p>
          </div>

          <div>
            <h4 className="font-mono font-bold text-amber-400 uppercase text-xs tracking-wider mb-3">
              Timetable & Data Source
            </h4>
            <p className="text-slate-400 text-xs leading-relaxed">
              Route schedules are based on published KSRTC timetables. No live GPS hardware is assumed; parcel handovers are tracked via depot desk scans.
            </p>
          </div>

          <div>
            <h4 className="font-mono font-bold text-amber-400 uppercase text-xs tracking-wider mb-3">
              Quick Portals
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-400 font-mono">
              <li>
                <Link href="/book" className="hover:text-amber-300 transition-colors">
                  &gt; Book a Parcel Ticket
                </Link>
              </li>
              <li>
                <Link href="/track" className="hover:text-amber-300 transition-colors">
                  &gt; Public Tracking Lookup
                </Link>
              </li>
              <li>
                <Link href="/staff" className="hover:text-amber-300 transition-colors">
                  &gt; Station Manifest & Desk Scan
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 font-mono">
          <p>© {new Date().getFullYear()} Kerala State Road Transport Corporation (KSRTC Logistics)</p>
          <p className="mt-2 sm:mt-0">Public Waybill System • Hackathon Edition</p>
        </div>
      </div>
    </footer>
  );
}
