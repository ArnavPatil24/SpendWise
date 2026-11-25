import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { AlertTriangle } from 'lucide-react';

const ConfirmContext = createContext(null);

function ConfirmDialog({ dialog, onClose }) {
  const card = useRef(null);
  useFocusTrap(card);
  return (
    <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(false); }}>
      <div className="confirm-card" ref={card} role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-text">
        <div className={`confirm-icon ${dialog.tone === 'primary' ? 'is-primary' : ''}`}><AlertTriangle size={22} /></div>
        <h2 id="confirm-title">{dialog.title}</h2>
        <p id="confirm-text">{dialog.message}</p>
        <div className="confirm-actions">
          <button className="btn btn-secondary" onClick={() => onClose(false)}>{dialog.cancelLabel || 'Keep it'}</button>
          <button className={`btn ${dialog.tone === 'primary' ? 'btn-primary' : 'btn-danger'}`} autoFocus onClick={() => onClose(true)}>{dialog.confirmLabel || 'Delete'}</button>
        </div>
      </div>
    </div>
  );
}

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const resolver = useRef(null);

  const confirm = useCallback(options => new Promise(resolve => {
    resolver.current = resolve;
    setDialog(options);
  }), []);

  const close = useCallback(result => {
    resolver.current?.(result);
    resolver.current = null;
    setDialog(null);
  }, []);

  useEffect(() => {
    if (!dialog) return undefined;
    const onKey = e => { if (e.key === 'Escape') close(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialog, close]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialog && <ConfirmDialog dialog={dialog} onClose={close} />}
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);
