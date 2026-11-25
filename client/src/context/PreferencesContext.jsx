import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const PreferencesContext = createContext(null);

function useStored(key, fallback) {
  const [value, setValue] = useState(() => {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    try { return JSON.parse(raw); } catch { return fallback; }
  });
  useEffect(() => { localStorage.setItem(key, JSON.stringify(value)); }, [key, value]);
  return [value, setValue];
}

const systemTheme = () =>
  window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

export function PreferencesProvider({ children }) {
  const [theme, setTheme] = useStored('spendwise_theme_v2', systemTheme());
  const [dateFormat, setDateFormat] = useStored('spendwise_dateFormat_v2', 'standard');
  const [compactNumbers, setCompactNumbers] = useStored('spendwise_compact_v2', false);
  const [budgetAlerts, setBudgetAlerts] = useStored('spendwise_budgetAlerts_v2', true);
  const [milestoneAlerts, setMilestoneAlerts] = useStored('spendwise_milestones_v2', true);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#080F1D' : '#F4F5F9');
  }, [theme]);

  const value = useMemo(() => ({
    theme, setTheme, toggleTheme: () => setTheme(t => (t === 'dark' ? 'light' : 'dark')),
    dateFormat, setDateFormat,
    compactNumbers, setCompactNumbers,
    budgetAlerts, setBudgetAlerts,
    milestoneAlerts, setMilestoneAlerts
  }), [theme, dateFormat, compactNumbers, budgetAlerts, milestoneAlerts,
    setTheme, setDateFormat, setCompactNumbers, setBudgetAlerts, setMilestoneAlerts]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export const usePreferences = () => useContext(PreferencesContext);
