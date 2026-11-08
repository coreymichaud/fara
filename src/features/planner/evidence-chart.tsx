'use client';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Area } from '@/lib/domain/schema';
export function EvidenceChart({ area, areas }: { area: Area; areas: Area[] }) {
  const peers = areas.filter((a) => a.county === area.county);
  const average = (key: 'poverty' | 'lowAccess') => {
    const values = peers.map((a) => a[key]).filter((v) => v !== null);
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  };
  const povertyMean = average('poverty'),
    accessMean = average('lowAccess');
  const data = [
    { name: 'Poverty', tract: area.poverty, county: povertyMean },
    { name: 'Retail distance', tract: area.lowAccess, county: accessMean },
  ];
  return (
    <figure className="evidence-chart">
      <figcaption>
        <span className="chart-key tract-key" />
        Selected tract <span className="chart-key county-key" />
        County tract mean
      </figcaption>
      <div style={{ width: '100%', height: 176 }}>
        <ResponsiveContainer width="100%" height={176} minWidth={0}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 8, right: 10, bottom: 0, left: 0 }}
            barSize={9}
          >
            <CartesianGrid horizontal={false} stroke="#e7ebed" />
            <XAxis
              type="number"
              domain={[0, 100]}
              ticks={[0, 50, 100]}
              tickFormatter={(n) => `${n}%`}
              tick={{ fontSize: 14, fill: '#53636c' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={110}
              tick={{ fontSize: 14, fill: '#3c4b54' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value) => `${Number(value).toFixed(1)}%`}
              cursor={{ fill: '#f1f4f5' }}
              itemStyle={{ color: '#1e343f' }}
            />
            <Bar
              dataKey="tract"
              name="Selected tract (%)"
              fill="#385981"
              radius={[0, 2, 2, 0]}
              isAnimationActive={false}
            />
            <Bar
              dataKey="county"
              name="Unweighted county tract mean (%)"
              fill="#6b8fa8"
              radius={[0, 2, 2, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <span className="sr-only">
        Selected tract poverty: {area.poverty ?? 'missing'} percent; county mean{' '}
        {povertyMean === null ? 'unavailable' : `${povertyMean.toFixed(1)} percent`}. Selected tract
        retail distance: {area.lowAccess ?? 'missing'} percent; county mean{' '}
        {accessMean === null ? 'unavailable' : `${accessMean.toFixed(1)} percent`}.
      </span>
    </figure>
  );
}
