import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, TrendingUp } from 'lucide-react';
import { Logo } from '../components/ui/Logo';
import { currencies, currencyNames } from '../constants';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { errorMessage } from '../api/client';
import PasswordMeter from '../components/ui/PasswordMeter';
import ForgotPassword from '../components/auth/ForgotPassword';
import { passwordProblem } from '../utils/password';

const bars = [34, 48, 40, 68, 55, 78, 62, 92, 72, 85, 66, 98];

export default function AuthPage() {
  const { login, register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState('login');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [waitUntil, setWaitUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  const remaining = Math.max(0, Math.ceil((waitUntil - now) / 1000));

  // The server tells us how long the sign-in lockout lasts; count it down so the user knows when to retry.
  useEffect(() => {
    if (!waitUntil) return undefined;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= waitUntil) { setWaitUntil(0); setError(''); }
    }, 500);
    return () => clearInterval(id);
  }, [waitUntil]);
  const isLogin = mode === 'login';

  async function submit(e) {
    e.preventDefault();
    setError('');
    const payload = Object.fromEntries(new FormData(e.currentTarget).entries());
    if (!isLogin && passwordProblem(payload.password)) { setError(passwordProblem(payload.password)); return; }
    setBusy(true);
    try {
      const user = await (isLogin ? login(payload) : register(payload));
      toast.success(isLogin ? `Welcome back, ${user.name.split(' ')[0]}.` : 'Your account is ready.');
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'Unable to sign in. Please try again.'));
      const wait = err.response?.data?.retryAfter;
      if (wait) { setNow(Date.now()); setWaitUntil(Date.now() + wait * 1000); }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-shell">
      <section className="auth-visual">
        <Logo size={40} light />
        <div className="auth-hero">
          <h1>Know where every rupee goes.</h1>
          <p>Track spending, set budgets and reach savings goals from one calm, private dashboard.</p>

          <div className="auth-preview" aria-hidden="true">
            <div className="auth-preview-head">
              <div><small>Net balance (sample)</small><strong>₹ 84,290.50</strong></div>
              <span className="auth-preview-trend"><TrendingUp size={14} /> 12.8%</span>
            </div>
            <div className="auth-preview-bars">
              {bars.map((h, i) => <span key={i} style={{ height: `${h}%`, animationDelay: `${i * 60}ms` }} />)}
            </div>
          </div>
        </div>
      </section>

      <section className="auth-form-side">
        <div className="auth-form-wrap">
          <div className="auth-mobile-brand"><Logo size={34} /></div>
          {mode === 'forgot' ? <ForgotPassword onBack={() => { setMode('login'); setError(''); }} /> : (
          <>
          <h2>{isLogin ? 'Sign in to SpendWise' : 'Create your account'}</h2>
          <p className="auth-sub">{isLogin ? 'Pick up where you left off.' : 'It takes less than a minute.'}</p>

          <form className="form" onSubmit={submit}>
            {!isLogin && (
              <label>Full name
                <input name="name" placeholder="e.g. Arnav Patil" autoComplete="name" required minLength={2} maxLength={80} />
              </label>
            )}
            <label>Email address
              <input name="email" type="email" placeholder="you@example.com" autoComplete="email" required />
            </label>
            <label>Password
              <div className="input-with-action">
                <input name="password" type={showPassword ? 'text' : 'password'} placeholder="At least 8 characters" autoComplete={isLogin ? 'current-password' : 'new-password'} required maxLength={72} value={password} onChange={e => setPassword(e.target.value)} />
                <button type="button" className="input-action" onClick={() => setShowPassword(s => !s)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {!isLogin && <PasswordMeter value={password} />}
            </label>
            {isLogin && <div className="forgot-row"><button type="button" className="link-btn" onClick={() => { setMode('forgot'); setError(''); }}>Forgot password?</button></div>}
            {!isLogin && (
              <label>Base currency
                <select name="baseCurrency" defaultValue="INR">
                  {currencies.map(c => <option key={c} value={c}>{c} · {currencyNames[c]}</option>)}
                </select>
                <small>Pick this now. It can’t be changed after you add transactions.</small>
              </label>
            )}
            {error && <div className="form-error" role="alert">{error}</div>}
            <button className="btn btn-primary btn-lg" disabled={busy || remaining > 0}>
              {remaining > 0
                ? `Try again in ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`
                : busy ? 'Please wait…' : isLogin ? 'Sign in' : 'Create account'}
              {!busy && remaining === 0 && <ArrowRight size={17} />}
            </button>
          </form>

          <p className="auth-switch">
            {isLogin ? 'New to SpendWise?' : 'Already have an account?'}
            <button type="button" onClick={() => { setMode(isLogin ? 'register' : 'login'); setError(''); setPassword(''); }}>
              {isLogin ? 'Create an account' : 'Sign in'}
            </button>
          </p>
          </>
          )}
        </div>
      </section>
    </div>
  );
}
