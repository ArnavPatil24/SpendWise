import { passwordStrength } from '../../utils/password';

export default function PasswordMeter({ value }) {
  const { score, label } = passwordStrength(value);
  if (!value) return <small>At least 8 characters, with a letter and a number.</small>;
  return (
    <div className="pw-meter" aria-live="polite">
      <div className="pw-bars" aria-hidden="true">
        {[1, 2, 3, 4].map(n => <i key={n} className={n <= score ? `on s${score}` : ''} />)}
      </div>
      <small>{label}</small>
    </div>
  );
}
