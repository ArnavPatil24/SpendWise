import { useEffect, useState } from 'react';

/** Bar that animates from 0 to its value when it first appears. */
export default function ProgressBar({ value, tone = 'brand', height = 8, color }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setWidth(Math.max(0, Math.min(100, value))));
    return () => cancelAnimationFrame(id);
  }, [value]);

  return (
    <div className="progress" style={{ height }} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <span className={`progress-fill tone-${tone}`} style={{ width: `${width}%`, ...(color ? { background: color } : {}) }} />
    </div>
  );
}
