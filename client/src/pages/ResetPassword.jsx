import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import api, { errorMessage } from '../api/client';
import { Logo } from '../components/ui/Logo';
import PasswordMeter from '../components/ui/PasswordMeter';
import { useToast } from '../context/ToastContext';
import { passwordProblem } from '../utils/password';

/** The page a reset email links to: choose a new password. */
export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (passwordProblem(password)) return setError(passwordProblem(password));
    if (password !== confirm) return setError('The two passwords do not match.');
    setBusy(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      toast.success('Password updated. Sign in with your new password.');
      navigate('/login', { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'Could not reset the password. Please request a new link.'));
    } finally {
      setBusy(false);
    }
    return undefined;
  }

  return (
    <div className="auth-form-side reset-page">
      <div className="auth-form-wrap">
        <div className="auth-mobile-brand reset-brand"><Logo size={34} /></div>
        {!/^[0-9a-f]{64}$/i.test(token) ? (
          <>
            <h2>This link is incomplete</h2>
            <p className="auth-sub">Open the link from your email again, or request a new one.</p>
            <Link className="btn btn-primary btn-lg" to="/login">Back to sign in</Link>
          </>
        ) : (
          <>
            <h2>Choose a new password</h2>
            <p className="auth-sub">Pick something you do not use anywhere else.</p>
            <form className="form" onSubmit={submit}>
              <label>New password
                <div className="input-with-action">
                  <input type={show ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" required maxLength={72} autoFocus />
                  <button type="button" className="input-action" onClick={() => setShow(s => !s)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff size={17} /> : <Eye size={17} />}</button>
                </div>
                <PasswordMeter value={password} />
              </label>
              <label>Confirm new password
                <input type={show ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" required maxLength={72} />
              </label>
              {error && <div className="form-error" role="alert">{error}</div>}
              <button className="btn btn-primary btn-lg" disabled={busy || !password}>{busy ? 'Saving…' : 'Update password'}</button>
            </form>
            <p className="auth-switch"><Link className="link-btn" to="/login">Back to sign in</Link></p>
          </>
        )}
      </div>
    </div>
  );
}
