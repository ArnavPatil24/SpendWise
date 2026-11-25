import { useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { usePreferences } from '../context/PreferencesContext';
import { useFormat } from './useFormat';
import { dateInput, upcomingAll } from '../utils/format';

/** Things worth the user's attention right now: budgets, goals and upcoming bills. */
export function useAlerts() {
  const { budgets, goals, rules, incomeSources } = useFinance();
  const { budgetAlerts } = usePreferences();
  const { fmt } = useFormat();

  return useMemo(() => {
    const alerts = [];
    const today = new Date();
    const todayKey = dateInput(today);

    if (budgetAlerts) {
      budgets.forEach(b => {
        const pct = b.amount ? (b.spent / b.amount) * 100 : 0;
        if (pct >= 100) {
          alerts.push({ id: `b-${b._id}`, tone: 'danger', title: `${b.category} is over budget`, detail: `${fmt(b.spent)} spent of ${fmt(b.amount)}`, to: '/budgets' });
        } else if (pct >= 80) {
          alerts.push({ id: `b-${b._id}`, tone: 'warn', title: `${b.category} is at ${Math.round(pct)}%`, detail: `${fmt(b.amount - b.spent)} left this month`, to: '/budgets' });
        }
      });
    }

    goals.filter(g => g.status !== 'completed' && String(g.targetDate).slice(0, 10) < todayKey).forEach(g => {
      alerts.push({ id: `g-${g._id}`, tone: 'warn', title: `${g.title} is past its target date`, detail: 'Edit the date or add funds to catch up.', to: '/goals' });
    });

    upcomingAll(rules, incomeSources).filter(r => r.daysLeft <= 3).forEach(r => {
      alerts.push({
        id: `r-${r._id}`, tone: 'info',
        title: `${r.title} is due in ${r.daysLeft} day${r.daysLeft > 1 ? 's' : ''}`,
        detail: `${r.type === 'income' ? 'Incoming' : 'Outgoing'} ${fmt(r.amount)}`, to: r.fromIncome ? '/income' : '/scheduled'
      });
    });

    return alerts;
  }, [budgets, goals, rules, incomeSources, budgetAlerts, fmt]);
}
