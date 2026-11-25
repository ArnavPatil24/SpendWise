import { CalendarDays, Database, Download, Globe2, LogOut, Moon, Palette, Sun, BellRing, Keyboard } from 'lucide-react';
import api, { errorMessage } from '../api/client';
import SectionTitle from '../components/ui/SectionTitle';
import Switch from '../components/ui/Switch';
import CategoriesPanel from '../components/categories/CategoriesPanel';
import { currencies, currencyNames } from '../constants';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinanceContext';
import { useCategories } from '../context/CategoryContext';
import { usePreferences } from '../context/PreferencesContext';
import { useToast } from '../context/ToastContext';
import { useFinanceActions } from '../hooks/useFinanceActions';
import { downloadFile, today, transactionsToCsv } from '../utils/csv';
import { formatDate, money } from '../utils/format';

function Row({ title, text, children }) {
  return (
    <div className="setting-row">
      <div><strong>{title}</strong><small>{text}</small></div>
      {children}
    </div>
  );
}

export default function Settings() {
  const { user, logout } = useAuth();
  const { budgets, goals, rules, incomeSources } = useFinance();
  const { custom: customCategories } = useCategories();
  const prefs = usePreferences();
  const toast = useToast();
  const { saveCurrency } = useFinanceActions();
  const sample = new Date(2026, 10, 20);

  async function exportCsv() {
    try {
      const { data } = await api.get('/transactions/export');
      if (!data.transactions.length) return toast.info('There are no transactions to export.');
      downloadFile(transactionsToCsv(data.transactions, user.baseCurrency), `spendwise-transactions-${today()}.csv`, 'text/csv;charset=utf-8');
      if (data.truncated) toast.info(`Exported the newest ${data.limit.toLocaleString()} transactions.`);
      else toast.success(`Exported ${data.transactions.length} transactions.`);
    } catch (err) { toast.error(errorMessage(err, 'Could not export transactions.')); }
    return undefined;
  }

  async function exportBackup() {
    try {
      const { data } = await api.get('/transactions/export');
      const backup = {
        exportedAt: new Date().toISOString(),
        user: { name: user.name, email: user.email, baseCurrency: user.baseCurrency },
        transactions: data.transactions, incomeSources, budgets, goals, scheduled: rules, customCategories
      };
      downloadFile(JSON.stringify(backup, null, 2), `spendwise-backup-${today()}.json`, 'application/json');
      if (data.truncated) toast.info(`Backup downloaded. It holds the newest ${data.limit.toLocaleString()} transactions only.`);
      else toast.success('Backup downloaded.');
    } catch (err) { toast.error(errorMessage(err, 'Could not create the backup.')); }
  }

  return (
    <>
      <SectionTitle title="Settings" subtitle="Appearance, number formats, alerts and your data." />
      <div className="settings-grid">
        <section className="panel">
          <div className="settings-head"><i className="tile tile-gold"><Palette size={19} /></i><div><h3>Appearance</h3><p>Choose how SpendWise looks.</p></div></div>
          <div className="theme-choices">
            {[['light', 'Light', Sun, 'Bright and clear'], ['dark', 'Dark', Moon, 'Easy on the eyes']].map(([value, label, Icon, hint]) => (
              <button key={value} className={`theme-choice ${prefs.theme === value ? 'selected' : ''}`} onClick={() => prefs.setTheme(value)} aria-pressed={prefs.theme === value}>
                <span className={`theme-swatch swatch-${value}`}><Icon size={18} /></span>
                <strong>{label}</strong><small>{hint}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="settings-head"><i className="tile"><Globe2 size={19} /></i><div><h3>Currency</h3><p>Totals are shown in your base currency.</p></div></div>
          <div className="form">
            <label>Base currency
              <select value={user.baseCurrency} onChange={e => saveCurrency(e.target.value)}>
                {currencies.map(c => <option key={c} value={c}>{c} · {currencyNames[c]}</option>)}
              </select>
              <small>You can only change this before adding your first transaction.</small>
            </label>
          </div>
        </section>

        <CategoriesPanel />

        <section className="panel">
          <div className="settings-head"><i className="tile tile-brand"><CalendarDays size={19} /></i><div><h3>Display</h3><p>Dates and number formats.</p></div></div>
          <div className="form">
            <label>Date format
              <select value={prefs.dateFormat} onChange={e => prefs.setDateFormat(e.target.value)}>
                <option value="standard">{formatDate(sample, 'standard')}</option>
                <option value="DD/MM/YYYY">{formatDate(sample, 'DD/MM/YYYY')} (day first)</option>
                <option value="YYYY-MM-DD">{formatDate(sample, 'YYYY-MM-DD')} (ISO)</option>
              </select>
            </label>
          </div>
          <Row title="Compact numbers" text={`Show ${money(15500, user.baseCurrency, true)} instead of ${money(15500, user.baseCurrency)}`}>
            <Switch checked={prefs.compactNumbers} onChange={prefs.setCompactNumbers} label="Compact numbers" />
          </Row>
        </section>

        <section className="panel">
          <div className="settings-head"><i className="tile tile-violet"><BellRing size={19} /></i><div><h3>Alerts</h3><p>Control what shows up in notifications.</p></div></div>
          <Row title="Budget warnings" text="Flag a category once it passes 80% of its limit.">
            <Switch checked={prefs.budgetAlerts} onChange={prefs.setBudgetAlerts} label="Budget warnings" />
          </Row>
          <Row title="Goal celebrations" text="Show a special message when you reach a goal.">
            <Switch checked={prefs.milestoneAlerts} onChange={prefs.setMilestoneAlerts} label="Goal celebrations" />
          </Row>
        </section>

        <section className="panel">
          <div className="settings-head"><i className="tile tile-pos"><Database size={19} /></i><div><h3>Your data</h3><p>Export everything at any time.</p></div></div>
          <div className="stack-tight">
            <button className="btn btn-secondary btn-block" onClick={exportCsv}><Download size={16} /> Export transactions (CSV)</button>
            <button className="btn btn-secondary btn-block" onClick={exportBackup}><Database size={16} /> Full backup (JSON)</button>
          </div>
          <small className="muted-small">Backups include transactions, income sources, budgets, goals, scheduled transactions and custom categories.</small>
        </section>

        <section className="panel">
          <div className="settings-head"><i className="tile tile-brand"><Keyboard size={19} /></i><div><h3>Keyboard shortcuts</h3><p>Move faster without the mouse.</p></div></div>
          <ul className="shortcut-list">
            <li><span>Add a transaction</span><span><kbd>N</kbd></span></li>
            <li><span>Search, jump or quick add</span><span><kbd>/</kbd> or <kbd>Ctrl</kbd><kbd>K</kbd></span></li>
            <li><span>Close any dialog</span><span><kbd>Esc</kbd></span></li>
          </ul>
        </section>

        <section className="panel panel-danger">
          <div className="settings-head"><i className="tile tile-neg"><LogOut size={19} /></i><div><h3>Session</h3><p>Sign out on this device.</p></div></div>
          <button className="btn btn-danger-outline" onClick={logout}><LogOut size={16} /> Sign out</button>
        </section>
      </div>
    </>
  );
}
