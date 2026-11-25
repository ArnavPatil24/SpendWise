import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

const ToastContext = createContext(null);
const icons = { success: CheckCircle2, error: AlertCircle, info: Info };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);

  const dismiss = useCallback(id => setToasts(list => list.filter(t => t.id !== id)), []);

  // options: { action: { label, onClick }, duration }
  const push = useCallback((type, message, options = {}) => {
    const id = nextId.current++;
    setToasts(list => [...list.slice(-3), { id, type, message, action: options.action }]);
    window.setTimeout(() => dismiss(id), options.duration || (type === 'error' ? 5200 : 3400));
  }, [dismiss]);

  const api = useMemo(() => ({
    success: (m, o) => push('success', m, o),
    error: (m, o) => push('error', m, o),
    info: (m, o) => push('info', m, o)
  }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map(t => {
          const Icon = icons[t.type];
          return (
            <div key={t.id} className={`toast toast-${t.type}`}>
              <Icon size={18} />
              <span>{t.message}</span>
              {t.action && (
                <button className="toast-action" onClick={() => { dismiss(t.id); t.action.onClick(); }}>{t.action.label}</button>
              )}
              <button className="toast-close" onClick={() => dismiss(t.id)} aria-label="Dismiss"><X size={14} /></button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
