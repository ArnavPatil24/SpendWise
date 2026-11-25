import { useState } from 'react';
import { KeyRound, ShieldCheck, Trash2, UserRound } from 'lucide-react';
import SectionTitle from '../components/ui/SectionTitle';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinanceContext';
import { useFinanceActions } from '../hooks/useFinanceActions';
import { useFormat } from '../hooks/useFormat';
import PasswordMeter from '../components/ui/PasswordMeter';
import DeleteAccountModal from '../components/account/DeleteAccountModal';
import { passwordProblem } from '../utils/password';

export default function Profile() {
  const { user } = useAuth();
  const { summary, budgets, goals, rules } = useFinance();
  const { updateName, changePassword } = useFinanceActions();
  const { fmt, fmtDate } = useFormat();

  const [name, setName] = useState(user.name);
  const [nameBusy, setNameBusy] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function saveName(e) {
    e.preventDefault();
    setNameBusy(true);
    await updateName(name.trim());
    setNameBusy(false);
  }

  async function savePassword(e) {
    e.preventDefault();
    setPwError('');
    if (passwordProblem(next)) return setPwError(passwordProblem(next));
    if (next !== confirm) return setPwError('The new passwords do not match.');
    if (next === current) return setPwError('Choose a password that is different from your current one.');
    setPwBusy(true);
    const ok = await changePassword(current, next);
    setPwBusy(false);
    if (ok) { setCurrent(''); setNext(''); setConfirm(''); }
    return undefined;
  }

  const stats = [
    ['Transactions', summary.counts.transactions],
    ['Budgets', budgets.length],
    ['Goals', goals.length],
    ['Scheduled', rules.length]
  ];

  return (
    <>
      <SectionTitle title="Profile" subtitle="Your details and sign-in security." />
      <div className="profile-layout">
        <aside className="panel profile-card">
          <div className="profile-avatar">{user.name?.[0]?.toUpperCase()}</div>
          <h2>{user.name}</h2>
          <p>{user.email}</p>
          <span className="status-pill ok"><ShieldCheck size={12} /> Signed in securely</span>
          <small className="muted-small">Member since {user.createdAt ? fmtDate(user.createdAt) : 'recently'}</small>
          <div className="profile-balance"><span>Net balance</span><strong>{fmt(summary.totals.balance)}</strong></div>
          <div className="profile-stats">
            {stats.map(([label, value]) => <div key={label}><strong>{value}</strong><small>{label}</small></div>)}
          </div>
        </aside>

        <div className="stack">
          <section className="panel">
            <div className="settings-head">
              <i className="tile"><UserRound size={19} /></i>
              <div><h3>Personal information</h3><p>Your name appears in the greeting and sidebar.</p></div>
            </div>
            <form className="form" onSubmit={saveName}>
              <label>Full name
                <input value={name} onChange={e => setName(e.target.value)} required minLength={2} maxLength={80} />
              </label>
              <label>Email address
                <input value={user.email} readOnly className="readonly" />
                <small>Your email is your account ID and can’t be changed.</small>
              </label>
              <div className="form-actions">
                <button className="btn btn-primary" disabled={nameBusy || name.trim() === user.name || name.trim().length < 2}>{nameBusy ? 'Saving…' : 'Save changes'}</button>
              </div>
            </form>
          </section>

          <section className="panel">
            <div className="settings-head">
              <i className="tile tile-brand"><KeyRound size={19} /></i>
              <div><h3>Password</h3><p>Use at least 8 characters you don’t use anywhere else.</p></div>
            </div>
            <form className="form" onSubmit={savePassword}>
              <label>Current password
                <input type="password" autoComplete="current-password" value={current} onChange={e => setCurrent(e.target.value)} required />
              </label>
              <div className="form-row">
                <label>New password
                  <input type="password" autoComplete="new-password" value={next} onChange={e => setNext(e.target.value)} required maxLength={72} />
                  <PasswordMeter value={next} />
                </label>
                <label>Confirm new password
                  <input type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={8} maxLength={72} />
                </label>
              </div>
              {pwError && <div className="form-error" role="alert">{pwError}</div>}
              <div className="form-actions">
                <button className="btn btn-primary" disabled={pwBusy || !current || !next}>{pwBusy ? 'Updating…' : 'Update password'}</button>
              </div>
            </form>
          </section>

          <section className="panel panel-danger">
            <div className="settings-head">
              <i className="tile tile-neg"><Trash2 size={19} /></i>
              <div><h3>Delete account</h3><p>Permanently remove your account and every record in it.</p></div>
            </div>
            <button className="btn btn-danger-outline" onClick={() => setDeleting(true)}><Trash2 size={16} /> Delete my account</button>
          </section>
        </div>
      </div>
      {deleting && <DeleteAccountModal onClose={() => setDeleting(false)} />}
    </>
  );
}
