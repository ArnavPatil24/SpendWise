import { useEffect, useState } from 'react';

export default function ProgressRing({ value, size = 64, stroke = 6, tone = 'gold', children }) {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setPct(Math.max(0, Math.min(100, value))));
    return () => cancelAnimationFrame(id);
  }, [value]);

  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className={`ring tone-${tone}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} className="ring-track" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} className="ring-value" strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <span className="ring-label">{children}</span>
    </div>
  );
}
