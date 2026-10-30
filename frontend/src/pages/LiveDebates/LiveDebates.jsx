import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Plus, Users, Clock, Shield, Sparkles } from 'lucide-react';

const LIVE_ROOMS = [
  {
    id: 101,
    title: "AI Copyright & Generative Intellectual Property",
    format: "Oxford Debate",
    host: "Stanford Debate Society",
    participants: 18,
    status: "Live Now",
    duration: "14 mins"
  },
  {
    id: 102,
    title: "Central Bank Digital Currencies vs. Financial Privacy",
    format: "Policy Debate",
    host: "Cambridge Union",
    participants: 42,
    status: "Live Now",
    duration: "22 mins"
  },
  {
    id: 103,
    title: "Nuclear Energy in Developing Economies",
    format: "Parliamentary Debate",
    host: "Global Orators Club",
    participants: 9,
    status: "Live Now",
    duration: "8 mins"
  }
];

export default function LiveDebates() {
  const navigate = useNavigate();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-[#ECE7DE] p-6 shadow-card flex items-center justify-between">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#FCF6E5] flex items-center justify-center text-[#D49B19]">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#1E242B]">Live Debate Arena</h2>
            <p className="text-xs text-gray-500">
              Join active synchronous debate rooms, spectate championship matches, or launch an instant room.
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate('/ai-coach')}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#DF9E16] to-[#B87E0E] text-white font-bold text-xs shadow-xs hover:opacity-95 transition-all flex items-center space-x-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Create Debate Room</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {LIVE_ROOMS.map((room) => (
          <div key={room.id} className="bg-white rounded-2xl border border-[#ECE7DE] p-5 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                  <span>{room.status}</span>
                </span>
                <span className="text-[11px] text-gray-400 font-medium">{room.format}</span>
              </div>
              <h3 className="font-bold text-sm text-[#1E242B] leading-snug">{room.title}</h3>
              <p className="text-xs text-gray-500">Host: {room.host}</p>
            </div>

            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center space-x-1">
                <Users className="w-3.5 h-3.5" />
                <span>{room.participants} listening</span>
              </div>
              <button
                onClick={() => navigate('/ai-coach')}
                className="px-3 py-1.5 rounded-lg bg-[#FAF8F3] hover:bg-[#F2ECE1] border border-[#ECE7DE] text-xs font-bold text-[#1E242B] transition-colors"
              >
                Join Room
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
