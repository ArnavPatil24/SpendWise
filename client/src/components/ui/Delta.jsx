import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';

/**
 * Month-over-month change chip. `goodWhenUp={false}` flips the colours for things
 * like expenses, where an increase is the bad direction.
 */
export default function Delta({ value, goodWhenUp = true, label = 'last month' }) {
  if (value === null || value === undefined) return <span className="delta delta-flat"><Minus size={12} /> No earlier month</span>;
  if (value === 0) return <span className="delta delta-flat"><Minus size={12} /> Same as {label}</span>;
  const up = value > 0;
  const good = up === goodWhenUp;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return <span className={`delta ${good ? 'delta-good' : 'delta-bad'}`}><Icon size={12} /> {Math.abs(value)}% vs {label}</span>;
}
