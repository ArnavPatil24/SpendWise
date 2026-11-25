import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Bell, CalendarClock, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useAlerts } from '../../hooks/useAlerts';

const toneIcon = { danger: ShieldAlert, warn: AlertTriangle, info: CalendarClock };

export default function NotificationBell() {
  const alerts = useAlerts();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = e => { if (!wrap.current?.contains(e.target)) setOpen(false); };
    const onKey = e => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div className="bell-wrap" ref={wrap}>
      <button className="btn-icon bell-btn" onClick={() => setOpen(o => !o)} aria-label={`Notifications (${alerts.length})`} aria-expanded={open}>
        <Bell size={18} />
        {alerts.length > 0 && <span className="bell-dot">{alerts.length > 9 ? '9+' : alerts.length}</span>}
      </button>
      {open && (
        <div className="popover" role="dialog" aria-label="Notifications">
          <div className="popover-head"><strong>Notifications</strong><span>{alerts.length ? `${alerts.length} need attention` : 'All clear'}</span></div>
          {alerts.length === 0 ? (
            <div className="popover-empty"><CheckCircle2 size={22} /><p>Nothing needs your attention. Budgets and goals are on track.</p></div>
          ) : (
            <ul>
              {alerts.map(a => {
                const Icon = toneIcon[a.tone];
                return (
                  <li key={a.id}>
                    <button onClick={() => { setOpen(false); navigate(a.to); }}>
                      <span className={`alert-icon tone-${a.tone}`}><Icon size={16} /></span>
                      <span><strong>{a.title}</strong><small>{a.detail}</small></span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
