import React, { useState, useEffect } from 'react';
import {
  History as HistoryIcon,
  Download,
  Award,
  Calendar,
  Layers,
  ChevronRight,
  Filter,
  FileText
} from 'lucide-react';
import api from '../../services/api';

export default function HistoryPage() {
  const [debates, setDebates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDebates();
  }, []);

  const fetchDebates = async () => {
    try {
      const res = await api.get('/debates/');
      setDebates(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-[#ECE7DE] p-6 shadow-card flex items-center justify-between">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#FCF6E5] flex items-center justify-center text-[#D49B19]">
            <HistoryIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#1E242B]">Debate Match History</h2>
            <p className="text-xs text-gray-500">
              Review completed debate transcripts, weighted adjudication scores, and download official PDF reports.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#ECE7DE] shadow-card overflow-hidden">
        <div className="p-4 border-b border-[#ECE7DE] bg-[#FAF8F3] flex items-center justify-between">
          <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
            All Sessions ({debates.length})
          </span>
        </div>

        <div className="divide-y divide-gray-100">
          {debates.map((deb) => (
            <div key={deb.id} className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-[#FAF8F3]/60 transition-colors">
              <div className="space-y-1.5 max-w-xl">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FCF6E5] text-[#B87E0E] border border-[#F4E9C0]">
                    {deb.format}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700">
                    {deb.difficulty}
                  </span>
                  <span className="text-[11px] text-gray-400">
                    {new Date(deb.created_at).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="font-bold text-sm text-[#1E242B]">{deb.topic}</h3>
                <p className="text-xs text-gray-500">
                  Position: <b className="text-gray-800">{deb.user_position}</b> • Winner: <b className="text-[#D49B19]">{deb.winner}</b>
                </p>
              </div>

              <div className="flex items-center space-x-3 shrink-0">
                {deb.evaluation && (
                  <div className="text-right pr-2">
                    <span className="text-[10px] text-gray-400 uppercase font-bold block">Score</span>
                    <span className="text-base font-black text-[#1E242B]">{deb.evaluation.total_score}</span>
                  </div>
                )}
                <a
                  href={`/api/debates/${deb.id}/export/pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-white border border-[#ECE7DE] hover:bg-gray-50 text-xs font-semibold text-gray-700 flex items-center space-x-1.5 shadow-xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-[#D49B19]" />
                  <span>PDF Dossier</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
