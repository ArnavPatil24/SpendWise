import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { isTopDialog, useFocusTrap } from '../../hooks/useFocusTrap';

export default function ModalShell({ title, subtitle, onClose, children }) {
  const card = useRef(null);
  const titleId = useId();
  useFocusTrap(card);

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape' && isTopDialog(card.current)) onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    const first = card.current?.querySelector('input:not([readonly]):not([type=hidden]), select, textarea');
    first?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      // Only unlock page scrolling once the last dialog has closed.
      if (!document.querySelector('.modal-backdrop')) document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card" ref={card} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="modal-heading">
          <div><h2 id={titleId}>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
          <button className="btn-icon" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
