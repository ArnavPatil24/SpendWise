import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import api, { errorMessage } from '../../api/client';
import ModalShell from '../ui/ModalShell';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

/** Permanently deletes the account and all of its data, after the password is confirmed. */
export default function DeleteAccountModal({ onClose }) {
  const { logout } = useAuth();
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [understood, setUnderstood] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.delete('/auth/account', { data: { password } });
      toast.success('Your account and all of its data were deleted.');
      logout();
    } catch (err) {
      setError(errorMessage(err, 'Could not delete the account. Please try again.'));
      setBusy(false);
    }
  }

  return (
    <ModalShell title="Delete your account?" subtitle="This permanently removes everything and cannot be undone." onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <div className="tip"><AlertTriangle size={15} /><span>
          All your transactions, income sources, budgets, goals, bills and custom categories will be deleted.{' '}
          <Link className="link-btn inline-link" to="/settings" onClick={onClose}>Download a backup first</Link>
        </span></div>
        <label>Enter your password to confirm
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required maxLength={72} />
        </label>
        <label className="checkbox-row">
          <input type="checkbox" className="check" checked={understood} onChange={e => setUnderstood(e.target.checked)} />
          <span>I understand this is permanent</span>
        </label>
        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Keep my account</button>
          <button className="btn btn-danger" disabled={busy || !password || !understood}>{busy ? 'Deleting…' : 'Delete everything'}</button>
        </div>
      </form>
    </ModalShell>
  );
}
