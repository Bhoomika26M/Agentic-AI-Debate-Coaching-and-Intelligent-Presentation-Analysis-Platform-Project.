import React from 'react';
import { Compass, TrendingUp, Sparkles, Flame, Tag, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TRENDING_TOPICS = [
  {
    category: "Technology & AI",
    title: "This House would ban fully autonomous weapons systems in interstate warfare.",
    debatesCount: 142,
    clash: "Humanitarian Ethics vs. Deterrence Parity"
  },
  {
    category: "Economics & Labor",
    title: "Resolved: A universal four-day work week increases national aggregate productivity.",
    debatesCount: 89,
    clash: "Labor Welfare vs. Small Business Overhead"
  },
  {
    category: "Biomedical Ethics",
    title: "This House would legalize germline gene editing for hereditary disease elimination.",
    debatesCount: 116,
    clash: "Therapeutic Progress vs. Eugenics Slippery Slope"
  },
  {
    category: "Governance & Law",
    title: "Resolved: Judicial lifetime appointments should be replaced with 18-year term limits.",
    debatesCount: 74,
    clash: "Judicial Independence vs. Democratic Accountability"
  }
];

export default function Discover() {
  const navigate = useNavigate();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-[#ECE7DE] p-6 shadow-card flex items-center justify-between">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#FCF6E5] flex items-center justify-center text-[#D49B19]">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#1E242B]">Discover Trending Debates</h2>
            <p className="text-xs text-gray-500">
              Explore hot topics, community resolutions, and championship motion briefs across high-stakes domains.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {TRENDING_TOPICS.map((topic, i) => (
          <div key={i} className="bg-white rounded-2xl border border-[#ECE7DE] p-6 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#B87E0E] bg-[#FCF6E5] px-2 py-0.5 rounded-full border border-[#F4E9C0]">
                  {topic.category}
                </span>
                <span className="text-[11px] text-gray-400 font-medium">{topic.debatesCount} Debates</span>
              </div>
              <h3 className="font-bold text-sm text-[#1E242B] leading-snug">{topic.title}</h3>
              <p className="text-xs text-gray-500 italic">Primary Clash: {topic.clash}</p>
            </div>

            <div className="pt-2 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => navigate('/ai-coach')}
                className="px-4 py-2 rounded-xl bg-[#FAF8F3] hover:bg-[#FCF6E5] border border-[#ECE7DE] hover:border-[#D49B19] text-xs font-bold text-[#1E242B] transition-colors flex items-center space-x-1.5"
              >
                <span>Spar This Motion</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#D49B19]" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
