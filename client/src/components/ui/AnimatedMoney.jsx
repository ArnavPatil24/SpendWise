import { useCountUp } from '../../hooks/useCountUp';
import { useFormat } from '../../hooks/useFormat';

export default function AnimatedMoney({ value, prefix = '' }) {
  const { fmt } = useFormat();
  const animated = useCountUp(Number(value) || 0);
  return <>{prefix}{fmt(animated)}</>;
}
