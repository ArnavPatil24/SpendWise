import { useMemo } from 'react';
import { useFormat } from '../../hooks/useFormat';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const pad = n => String(n).padStart(2, '0');

/** Calendar for one month; darker days are heavier spending. Any day can be selected. */
export default function SpendHeatmap({ year, month, days, selected, onPick }) {
  const { fmt } = useFormat();

  const { cells, max } = useMemo(() => {
    const byDate = new Map(days.map(d => [d.date, d]));
    const first = new Date(year, month - 1, 1).getDay();
    const count = new Date(year, month, 0).getDate();
    const peak = Math.max(0, ...days.map(d => d.expenses));
    const list = Array.from({ length: first }, () => null);
    for (let d = 1; d <= count; d += 1) {
      const key = `${year}-${pad(month)}-${pad(d)}`;
      list.push({ key, day: d, data: byDate.get(key) });
    }
    return { cells: list, max: peak };
  }, [year, month, days]);

  const todayKey = (() => { const n = new Date(); return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`; })();
  const level = amount => (amount <= 0 || max <= 0 ? 0 : Math.min(4, Math.ceil((amount / max) * 4)));

  return (
    <div className="heatmap">
      <div className="heatmap-head">{WEEKDAYS.map((d, i) => <span key={i}>{d}</span>)}</div>
      <div className="heatmap-grid">
        {cells.map((c, i) => {
          if (!c) return <span key={`pad-${i}`} className="heat-pad" />;
          const spent = c.data?.expenses || 0;
          const label = c.data
            ? `${c.day}: ${fmt(spent)} spent, ${c.data.count} transaction${c.data.count === 1 ? '' : 's'}`
            : `${c.day}: nothing recorded`;
          return (
            <button
              key={c.key}
              className={`heat-cell lvl-${level(spent)} ${c.key === todayKey ? 'is-today' : ''} ${c.key === selected ? 'is-selected' : ''}`}
              title={label}
              aria-label={label}
              aria-pressed={c.key === selected}
              onClick={() => onPick(c.key)}
            >
              {c.day}
            </button>
          );
        })}
      </div>
      <div className="heatmap-legend"><span>Less</span>{[0, 1, 2, 3, 4].map(l => <i key={l} className={`heat-swatch lvl-${l}`} />)}<span>More</span></div>
    </div>
  );
}
