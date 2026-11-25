import ProgressRing from '../ui/ProgressRing';
import ProgressBar from '../ui/ProgressBar';

const toneFor = score => (score >= 80 ? 'pos' : score >= 60 ? 'brand' : score >= 40 ? 'warn' : 'neg');

export function HealthRing({ score, size = 132 }) {
  return (
    <ProgressRing value={score.value} size={size} stroke={size > 100 ? 10 : 7} tone={toneFor(score.value)}>
      <span className="health-ring-label"><strong>{score.value}</strong><small>/ 100</small></span>
    </ProgressRing>
  );
}

export default function HealthScore({ score, basis }) {
  const tone = toneFor(score.value);
  return (
    <div className="health">
      <div className="health-summary">
        <HealthRing score={score} />
        <div>
          <span className={`grade grade-${tone}`}>{score.grade}</span>
          <p>Built from three parts of your money habits. Each one is explained below, so you know exactly what to improve.</p>
          {basis && <small>{basis.kind === 'completed' ? `Based on your last ${basis.months} completed month${basis.months === 1 ? '' : 's'}, so a few unlogged days this month can’t skew it.` : 'Based on this month so far. It becomes steadier after your first full month.'}</small>}
        </div>
      </div>
      <ul className="health-parts">
        {score.components.map(c => (
          <li key={c.key}>
            <div className="health-part-top">
              <strong>{c.label}</strong>
              <span>{c.points} <small>/ {c.max}</small></span>
            </div>
            <ProgressBar value={(c.points / c.max) * 100} height={6} tone={c.points / c.max >= 0.7 ? 'pos' : c.points / c.max >= 0.4 ? 'brand' : 'warn'} />
            <small>{c.hint}</small>
          </li>
        ))}
      </ul>
    </div>
  );
}
