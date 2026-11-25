import { useState } from 'react';
import { ArrowLeft, MailCheck } from 'lucide-react';
import api, { errorMessage } from '../../api/client';

/** Asks for an email address and requests a reset link. The reply is the same whether or not the address has an account. */
export default function ForgotPassword({ onBack }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email: email.trim() });
      setResult(data);
    } catch (err) {
      setError(errorMessage(err, 'Could not send the reset link. Please try again.'));
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <div className="forgot-done" role="status">
        <i><MailCheck size={26} /></i>
        <h2>Check your email</h2>
        <p>{result.message}</p>
        {result.devResetLink && (
          <div className="tip tip-block">
            <span><strong>Demo mode:</strong> no email server is set up, so here is the link directly. <a className="link-btn inline-link" href={result.devResetLink}>Open the reset page</a></span>
          </div>
        )}
        <button type="button" className="btn btn-secondary" onClick={onBack}><ArrowLeft size={16} /> Back to sign in</button>
      </div>
    );
  }

  return (
    <>
      <h2>Forgot your password?</h2>
      <p className="auth-sub">Enter your email and we will send you a link to choose a new one.</p>
      <form className="form" onSubmit={submit}>
        <label>Email address
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required autoFocus />
        </label>
        {error && <div className="form-error" role="alert">{error}</div>}
        <button className="btn btn-primary btn-lg" disabled={busy || !email.trim()}>{busy ? 'Sending…' : 'Send reset link'}</button>
      </form>
      <p className="auth-switch"><button type="button" onClick={onBack}>Back to sign in</button></p>
    </>
  );
}
