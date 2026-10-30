import React from 'react';
import { Archive as ArchiveIcon, BookOpen, Download, Search, Shield } from 'lucide-react';

const ARCHIVE_DEBATES = [
  {
    id: "ARCH-2025-01",
    title: "The Oxford Union Grand Debate on Artificial General Intelligence",
    date: "October 2025",
    adjudication: "Side A Prevails (Score 88.4 / 100)",
    summary: "A seminal philosophical clash on catastrophic AI risk and existential safety frameworks.",
    format: "Oxford Union Style"
  },
  {
    id: "ARCH-2025-02",
    title: "World Universities Debating Championship - Climate Reparations",
    date: "December 2025",
    adjudication: "Side B Prevails (Score 91.2 / 100)",
    summary: "Complex multi-jurisdictional debate on sovereign ecological liability and loss-and-damage funds.",
    format: "British Parliamentary"
  },
  {
    id: "ARCH-2026-01",
    title: "Harvard-Yale Invitational: Global Monetary Hegemony & Digital Currencies",
    date: "February 2026",
    adjudication: "Side A Prevails (Score 89.8 / 100)",
    summary: "Rigorous macro-economic analysis of cross-border reserve asset diversification.",
    format: "Policy Debate"
  }
];

export default function Archive() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-[#ECE7DE] p-6 shadow-card flex items-center justify-between">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#FCF6E5] flex items-center justify-center text-[#D49B19]">
            <ArchiveIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#1E242B]">Debate Hall of Fame & Archives</h2>
            <p className="text-xs text-gray-500">
              Browse historically benchmarked debates, world championship transcripts, and expert adjudicative rubrics.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#ECE7DE] shadow-card overflow-hidden">
        <div className="divide-y divide-gray-100">
          {ARCHIVE_DEBATES.map((deb) => (
            <div key={deb.id} className="p-6 space-y-2 hover:bg-[#FAF8F3]/60 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-400 uppercase font-mono">{deb.id} • {deb.date}</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FCF6E5] text-[#B87E0E] border border-[#F4E9C0]">
                  {deb.format}
                </span>
              </div>
              <h3 className="font-bold text-base text-[#1E242B]">{deb.title}</h3>
              <p className="text-xs text-gray-600 leading-relaxed">{deb.summary}</p>
              <div className="pt-2 flex items-center justify-between text-xs">
                <span className="font-semibold text-[#D49B19]">{deb.adjudication}</span>
                <button
                  onClick={() => alert("Full archived dossier loaded into debate history.")}
                  className="px-3 py-1.5 rounded-lg bg-[#FAF8F3] hover:bg-[#F2ECE1] border border-[#ECE7DE] text-xs font-semibold text-gray-700 transition-colors"
                >
                  Inspect Case Dossier
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
