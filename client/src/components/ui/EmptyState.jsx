export default function EmptyState({ icon: Icon, title, text, action, compact = false }) {
  return (
    <div className={`empty ${compact ? 'empty-compact' : ''}`}>
      {Icon && <div className="empty-icon"><Icon size={compact ? 20 : 26} /></div>}
      {title && <h3>{title}</h3>}
      <p>{text}</p>
      {action}
    </div>
  );
}
