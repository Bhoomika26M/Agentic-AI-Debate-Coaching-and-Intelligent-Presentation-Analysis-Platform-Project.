import React, { useState } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import {
  FileText,
  Calendar,
  Search,
  Filter,
  Eye,
  Download,
  Swords,
  Scale,
  Mic,
  Presentation,
  CheckCircle2
} from 'lucide-react';

export const ReportsPage = () => {
  const [filterType, setFilterType] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);

  const reports = [
    {
      id: 'rep-1',
      date: 'Sep 13, 2026',
      topic: 'Universal Basic Income is Essential in the Era of Exponential AI',
      type: 'Debate',
      score: 88,
      status: 'Completed',
      summary: 'Strong affirmative case with clear Toulmin claim structure. Handled inflation objection effectively.',
      keyTakeaway: 'Work on qualifying absolute assertions during round 2 rebuttal.',
    },
    {
      id: 'rep-2',
      date: 'Sep 12, 2026',
      topic: 'AI Judicial Sentencing & Computational Consistency',
      type: 'Argument Analysis',
      score: 76,
      status: 'Analyzed',
      summary: 'Flagged 2 informal fallacies: False Dilemma and Slippery Slope. High linguistic clarity score (88%).',
      keyTakeaway: 'Incorporate empirical data regarding algorithmic skews.',
    },
    {
      id: 'rep-3',
      date: 'Sep 11, 2026',
      topic: 'Opening Constructive on Climate Carbon Border Taxes',
      type: 'Speech Practice',
      score: 84,
      status: 'Evaluated',
      summary: 'Optimal speaking cadence recorded at 142 WPM. Only 2 vocal fillers identified across 3 minutes.',
      keyTakeaway: 'Maintain 1-second silent pauses between major premise shifts.',
    },
    {
      id: 'rep-4',
      date: 'Sep 10, 2026',
      topic: 'Algorithmic Governance & Moral Due Process Slide Deck',
      type: 'Presentation Analysis',
      score: 85,
      status: 'Evaluated',
      summary: 'Clean visual contrast and concise headlines. Slide 3 identified as text-overloaded (>55 words).',
      keyTakeaway: 'Adopt the 6x6 bullet rule for technical presentation slides.',
    },
    {
      id: 'rep-5',
      date: 'Sep 08, 2026',
      topic: 'Social Media Algorithmic Feeds Harm Democratic Deliberation',
      type: 'Debate',
      score: 82,
      status: 'Completed',
      summary: 'Persuasive negative defense against censorship claims. Rebuttal accuracy rated 80%.',
      keyTakeaway: 'Directly address the counter-evidence on epistemic polarization.',
    },
  ];

  const filteredReports = reports.filter((r) => {
    const matchesType = filterType === 'ALL' || r.type.toUpperCase().includes(filterType);
    const matchesSearch =
      r.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.type.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  const getTypeBadgeVariant = (type) => {
    if (type === 'Debate') return 'blue';
    if (type === 'Argument Analysis') return 'purple';
    if (type === 'Speech Practice') return 'teal';
    return 'navy';
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-[#0F172A] tracking-tight">
          Session Evaluation Reports
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Review previous debate matches, argument diagnoses, speech recordings, and slide deck evaluations.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <Card padding="sm" className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search report by topic..."
            className="w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-xs rounded-xl border border-slate-200 focus:border-[#1E3A8A] focus:ring-2 focus:ring-blue-100 pl-9 pr-3.5 py-2.5 outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {['ALL', 'DEBATE', 'ARGUMENT', 'SPEECH', 'PRESENTATION'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                filterType === type
                  ? 'bg-[#172554] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80'
              }`}
            >
              {type === 'ALL' ? 'All Sessions' : type}
            </button>
          ))}
        </div>
      </Card>

      {/* Clean Table / Card Listing */}
      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="text-xs uppercase bg-slate-50/80 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold">Topic / Resolution</th>
                <th className="px-6 py-4 font-semibold">Type</th>
                <th className="px-6 py-4 font-semibold">Score</th>
                <th className="px-6 py-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReports.map((report) => (
                <tr key={report.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{report.date}</span>
                  </td>

                  <td className="px-6 py-4 font-medium text-[#0F172A] max-w-md">
                    <span className="line-clamp-1">{report.topic}</span>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={getTypeBadgeVariant(report.type)} size="sm">
                      {report.type}
                    </Badge>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-bold text-[#172554] text-base">{report.score}</span>
                    <span className="text-xs text-slate-400">/100</span>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedReport(report)}
                      icon={Eye}
                      iconPosition="left"
                    >
                      View Report
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Detailed Report Modal */}
      <Modal
        isOpen={Boolean(selectedReport)}
        onClose={() => setSelectedReport(null)}
        title="Session Performance Report"
        maxWidth="max-w-xl"
      >
        {selectedReport && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-500">{selectedReport.date}</span>
                <Badge variant={getTypeBadgeVariant(selectedReport.type)} size="sm">
                  {selectedReport.type}
                </Badge>
              </div>
              <h4 className="font-bold text-base text-[#0F172A] mt-1">{selectedReport.topic}</h4>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100">
                <span className="text-xs text-slate-500 block">Overall Score</span>
                <span className="text-2xl font-extrabold text-[#172554]">{selectedReport.score}/100</span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-100">
                <span className="text-xs text-slate-500 block">Status</span>
                <span className="text-sm font-bold text-emerald-700 mt-1 inline-block">{selectedReport.status}</span>
              </div>
            </div>

            <div>
              <h5 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Executive Evaluation
              </h5>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed bg-white p-3 rounded-xl border border-slate-200">
                {selectedReport.summary}
              </p>
            </div>

            <div>
              <h5 className="text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-1">
                Primary Takeaway for Next Round
              </h5>
              <p className="text-xs text-emerald-900 bg-emerald-50/70 p-3 rounded-xl border border-emerald-200">
                {selectedReport.keyTakeaway}
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="primary" size="md" onClick={() => setSelectedReport(null)}>
                Close Report
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
