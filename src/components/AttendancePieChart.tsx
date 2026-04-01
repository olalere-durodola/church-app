import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';
import type { AttendanceRecord } from '../types/attendance';
import { formatDisplayDate } from '../utils/attendanceUtils';

const SEGMENTS = [
  { key: 'men',      label: 'Men',      color: '#3b82f6' },
  { key: 'women',    label: 'Women',    color: '#ec4899' },
  { key: 'children', label: 'Children', color: '#22c55e' },
  { key: 'visitors', label: 'Visitors', color: '#f97316' },
] as const;

interface Props {
  record: AttendanceRecord;
  date: string;
}

export default function AttendancePieChart({ record, date }: Props) {
  const data = SEGMENTS.map(s => ({ name: s.label, value: record[s.key], color: s.color }))
    .filter(d => d.value > 0);

  if (data.length === 0) return null;

  return (
    <div className="chart-wrapper">
      <h2 className="section-title">Breakdown — {formatDisplayDate(date)}</h2>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={100}
            label={({ name, percent, x, y }) => (
              <text x={x} y={y} fill="#94a3b8" fontSize={12} textAnchor="middle" dominantBaseline="central">
                {`${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
              </text>
            )}
            labelLine={{ stroke: '#475569' }}
          >
            {data.map(entry => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => [value]}
            contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9' }}
          />
          <Legend wrapperStyle={{ color: '#94a3b8' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
