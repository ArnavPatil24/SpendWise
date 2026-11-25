export default function Segmented({ options, value, onChange, label, size = 'md' }) {
  return (
    <div className={`segmented-control seg-${size}`} role="group" aria-label={label}>
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          className={value === o.value ? 'active' : ''}
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
