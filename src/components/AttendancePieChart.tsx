import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const SEGMENTS = [
  { key: 'men', label: 'Men', color: '#C9A24B' },        // brass
  { key: 'women', label: 'Women', color: '#5B9A84' },    // sage
  { key: 'children', label: 'Children', color: '#C2603A' }, // clay
  { key: 'visitors', label: 'Visitors', color: '#8C9BB5' }, // muted slate
] as const;

interface Props {
  men: number;
  women: number;
  children: number;
  visitors: number;
}

export default function AttendancePieChart({ men, women, children, visitors }: Props) {
  const counts = { men, women, children, visitors };
  const total = men + women + children + visitors;
  const data = SEGMENTS.map(s => ({ name: s.label, value: counts[s.key], color: s.color }))
    .filter(d => d.value > 0);

  if (data.length === 0) {
    return (
      <div className="pie-empty">
        <div className="pie-empty-ring" />
        <span>No counts yet</span>
      </div>
    );
  }

  return (
    <div className="pie-donut">
      <ResponsiveContainer width="100%" height={188}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={58}
            outerRadius={84}
            paddingAngle={data.length > 1 ? 2 : 0}
            stroke="none"
          >
            {data.map(entry => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => {
              const v = Number(value);
              return [`${v} (${Math.round((v / total) * 100)}%)`, name];
            }}
            contentStyle={{
              background: 'var(--color-surface-2, #232733)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '8px',
              color: '#ECE7DC',
              fontSize: '12px',
            }}
            itemStyle={{ color: '#ECE7DC' }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pie-center">
        <div className="pie-center-num">{total}</div>
        <div className="pie-center-lbl">total</div>
      </div>
    </div>
  );
}
