import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

export const PaceTimelineChart = ({ data = [] }) => {
  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
          <XAxis dataKey="time_label" stroke="#64748b" tick={{ fontSize: 11 }} />
          <YAxis domain={[80, 200]} stroke="#64748b" tick={{ fontSize: 11 }} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '0.5rem', color: '#fff', fontSize: '12px' }}
            formatter={(val) => [`${val} WPM`, 'Speaking Pace']}
          />
          <ReferenceLine y={145} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Target (145 WPM)', fill: '#10b981', fontSize: 10 }} />
          <Line type="monotone" dataKey="wpm" stroke="#38bdf8" strokeWidth={3} dot={{ r: 4, fill: '#38bdf8' }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
