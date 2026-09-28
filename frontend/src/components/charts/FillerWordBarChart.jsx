import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const FillerWordBarChart = ({ breakdown = {} }) => {
  const chartData = Object.entries(breakdown || {}).map(([word, count]) => ({
    word: `"${word}"`,
    count: count
  }));

  if (chartData.length === 0) {
    return <div className="h-56 flex items-center justify-center text-xs text-slate-500">Zero filler words detected! Outstanding clarity.</div>;
  }

  return (
    <div className="w-full h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
          <XAxis dataKey="word" stroke="#64748b" tick={{ fontSize: 11 }} />
          <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '0.5rem', color: '#fff', fontSize: '12px' }}
            formatter={(val) => [`${val} occurrences`, 'Frequency']}
          />
          <Bar dataKey="count" fill="#f43f5e" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
