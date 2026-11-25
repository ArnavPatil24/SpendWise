import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import api, { errorMessage } from '../api/client';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const FinanceContext = createContext(null);

const emptySummary = {
  totals: { income: 0, expenses: 0, balance: 0 },
  month: { income: 0, expenses: 0, savings: 0 },
  previousMonth: { income: 0, expenses: 0, savings: 0 },
  categories: [],
  recent: [],
  counts: { transactions: 0 },
  lastLoggedAt: null
};

export function FinanceProvider({ children }) {
  const { user } = useAuth();
  const toast = useToast();

  const [summary, setSummary] = useState(emptySummary);
  const [trend, setTrend] = useState([]);
  const [trendMonths, setTrendMonths] = useState(6);
  const [budgets, setBudgets] = useState([]);
  const [goals, setGoals] = useState([]);
  const [rules, setRules] = useState([]);
  const [health, setHealth] = useState(null);
  const [incomeSources, setIncomeSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0); // bumps after every change so paged lists can refetch
  const announced = useRef(false);
  const monthsRef = useRef(trendMonths);
  monthsRef.current = trendMonths;

  // Which data each kind of change can affect. Fetching only that avoids six requests per click.
  const SCOPES = {
    all: ['summary', 'trend', 'budgets', 'goals', 'health'],
    transactions: ['summary', 'trend', 'budgets', 'health'],
    budgets: ['budgets', 'health'],
    goals: ['goals', 'health'],
    income: ['summary', 'trend', 'health'],
    rules: []
  };

  const fetchers = useMemo(() => ({
    summary: () => api.get('/analytics/summary').then(r => setSummary(r.data)),
    trend: () => api.get('/analytics/trend', { params: { months: monthsRef.current } }).then(r => setTrend(r.data.trend)),
    budgets: () => api.get('/budgets').then(r => setBudgets(r.data.budgets)),
    goals: () => api.get('/goals').then(r => setGoals(r.data.goals)),
    health: () => api.get('/analytics/health').then(r => setHealth(r.data))
  }), []);

  const refresh = useCallback(async (scope = 'all') => {
    try {
      // Scheduled bills and income sources record themselves when they are read, so read them first.
      // Everything fetched afterwards then already includes anything they just created.
      let keys = SCOPES[scope];
      let recorded = 0;
      const first = [];
      if (scope === 'all' || scope === 'rules') {
        first.push(api.get('/recurring').then(r => { setRules(r.data.rules); recorded += r.data.autoExecutedCount; }));
      }
      if (scope === 'all' || scope === 'income' || scope === 'transactions') {
        first.push(api.get('/income').then(r => { setIncomeSources(r.data.sources); recorded += r.data.postedCount; }));
      }
      await Promise.all(first);

      if (recorded > 0) {
        keys = SCOPES.all;
        if (!announced.current) {
          announced.current = true;
          toast.info(`${recorded} scheduled or income entr${recorded > 1 ? 'ies were' : 'y was'} recorded for this month.`);
        }
      }
      await Promise.all(keys.map(k => fetchers[k]()));
      setVersion(v => v + 1);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not load your data. Check your API and database connection.'));
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast, fetchers]);

  useEffect(() => { if (user) refresh('all'); }, [user, refresh]);

  // Switching the chart range only refetches the trend, not everything.
  const changeTrendMonths = useCallback(async months => {
    setTrendMonths(months);
    monthsRef.current = months;
    try {
      const { data } = await api.get('/analytics/trend', { params: { months } });
      setTrend(data.trend);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not load the chart.'));
    }
  }, [toast]);

  const value = useMemo(() => ({
    summary, trend, trendMonths, changeTrendMonths, budgets, goals, rules, incomeSources, health, loading, version, refresh
  }), [summary, trend, trendMonths, changeTrendMonths, budgets, goals, rules, incomeSources, health, loading, version, refresh]);

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export const useFinance = () => useContext(FinanceContext);
