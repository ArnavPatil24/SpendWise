import { useFormat } from '../../hooks/useFormat';

export default function ChartTooltip({ active, payload, label }) {
  const { fmtFull } = useFormat();
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <strong>{label ?? payload[0].name}</strong>
      {payload.map(p => (
        <div key={p.dataKey || p.name} className="chart-tooltip-row">
          <i style={{ background: p.color || p.payload?.fill || p.stroke }} />
          <span>{p.name === 'value' ? '' : p.name}</span>
          <b>{fmtFull(p.value)}</b>
        </div>
      ))}
    </div>
  );
}
