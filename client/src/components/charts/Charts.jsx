import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid
} from 'recharts';

const COLORS = ['#0c8ee9', '#38bdf8', '#818cf8', '#a855f7', '#f43f5e', '#f59e0b', '#10b981'];

export const ScoreDistributionChart = ({ data = [] }) => {
  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="range" stroke="#64748b" fontSize={12} tickLine={false} />
          <YAxis stroke="#64748b" fontSize={12} tickLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
          />
          <Bar dataKey="count" fill="#0c8ee9" radius={[4, 4, 0, 0]} name="Students" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const ViolationDistributionChart = ({ data = [] }) => {
  const chartData = data.map((d) => ({
    name: (d.type || d._id || 'other').replace('_', ' '),
    value: d.count || 0
  }));

  return (
    <div className="w-full h-64 flex items-center justify-center">
      {chartData.length === 0 ? (
        <span className="text-xs text-slate-500">No violations recorded</span>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={4}
              dataKey="value"
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};
