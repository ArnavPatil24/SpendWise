import { useCallback, useMemo } from 'react';
import api, { errorMessage, tokenStore } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinanceContext';
import { useToast } from '../context/ToastContext';
import { usePreferences } from '../context/PreferencesContext';
import { useConfirm } from '../context/ConfirmContext';
import { useFormat } from './useFormat';
import { money } from '../utils/format';

/**
 * Every create / update / delete call lives here so pages stay focused on layout.
 * Each action resolves to true on success and false on failure, so modals know
 * whether to close.
 */
const pickFields = ({ type, title, category, amount, currency, exchangeRate, date, note, sourceId }) =>
  ({ type, title, category, amount, currency, exchangeRate, date, note: note || '', sourceId: sourceId || null });

export function useFinanceActions() {
  const { setUser } = useAuth();
  const { refresh } = useFinance();
  const toast = useToast();
  const confirm = useConfirm();
  const { milestoneAlerts } = usePreferences();
  const { fmt, fmtDate } = useFormat();

  // `scope` says which data the change can affect (see FinanceContext), so only that is refetched.
  const run = useCallback(async (task, success, failure, scope = 'all') => {
    try {
      const result = await task();
      // The change already succeeded on the server, so building the message must never stop the refresh.
      let message = success;
      if (typeof success === 'function') {
        try { message = success(result); } catch { message = 'Done.'; }
      }
      if (message) toast.success(message);
      await refresh(scope);
      return true;
    } catch (err) {
      toast.error(errorMessage(err, failure));
      return false;
    }
  }, [refresh, toast]);

  const ask = useCallback((title, message, confirmLabel) => confirm({ title, message, confirmLabel }), [confirm]);

  const restore = useCallback(async items => {
    try {
      await api.post('/transactions/bulk', { transactions: items.map(pickFields) });
      toast.success(items.length === 1 ? 'Transaction restored.' : `${items.length} transactions restored.`);
      await refresh('transactions');
    } catch (err) { toast.error(errorMessage(err, 'Could not restore the transactions.')); }
  }, [refresh, toast]);

  return useMemo(() => ({
    saveTransaction: async (payload, id) => {
      if (id) return run(() => api.put(`/transactions/${id}`, payload), 'Transaction updated.', 'Could not save the transaction.', 'transactions');

      const post = force => api.post(force ? '/transactions?force=true' : '/transactions', payload);
      try {
        try {
          await post(false);
        } catch (err) {
          const data = err.response?.data;
          if (data?.code !== 'POSSIBLE_DUPLICATE') throw err;
          const e = data.existing;
          const proceed = await confirm({
            title: 'Possible duplicate',
            message: `You already added “${e.title}” for ${money(e.amount, e.currency)} on ${fmtDate(e.date)}. Add this one anyway?`,
            confirmLabel: 'Add anyway', cancelLabel: 'Cancel', tone: 'primary'
          });
          if (!proceed) return false;
          await post(true);
        }
        toast.success('Transaction added.');
        await refresh('transactions');
        return true;
      } catch (err) {
        toast.error(errorMessage(err, 'Could not save the transaction.'));
        return false;
      }
    },

    // Deletes happen instantly and can be undone, which is faster than asking first.
    deleteTransaction: async transaction => {
      try {
        await api.delete(`/transactions/${transaction._id}`);
        await refresh('transactions');
        toast.success('Transaction deleted.', {
          duration: 7000,
          action: { label: 'Undo', onClick: () => restore([transaction]) }
        });
        return true;
      } catch (err) { toast.error(errorMessage(err, 'Could not delete the transaction.')); return false; }
    },
    bulkDeleteTransactions: async items => {
      const many = items.length > 1;
      if (many && !(await ask(`Delete ${items.length} transactions?`, 'They will be removed from your history and totals. You can undo right after.', 'Delete'))) return false;
      try {
        const { data } = await api.post('/transactions/bulk-delete', { ids: items.map(t => t._id) });
        await refresh('transactions');
        toast.success(`${data.deleted} transaction${data.deleted === 1 ? '' : 's'} deleted.`, {
          duration: 8000,
          action: { label: 'Undo', onClick: () => restore(items) }
        });
        return true;
      } catch (err) { toast.error(errorMessage(err, 'Could not delete the selection.')); return false; }
    },
    bulkCategory: (ids, category) => run(
      () => api.patch('/transactions/bulk-category', { ids, category }),
      ({ data }) => `${data.updated} transaction${data.updated === 1 ? '' : 's'} moved to ${category}.`,
      'Could not change the category.', 'transactions'
    ),
    importTransactions: async (rows, skipDuplicates) => {
      try {
        let inserted = 0;
        let skipped = 0;
        for (let i = 0; i < rows.length; i += 500) {
          const { data } = await api.post('/transactions/bulk', { transactions: rows.slice(i, i + 500), skipDuplicates });
          inserted += data.inserted;
          skipped += data.skipped;
        }
        await refresh('transactions');
        toast.success(`Imported ${inserted} transaction${inserted === 1 ? '' : 's'}${skipped ? `, skipped ${skipped} duplicate${skipped === 1 ? '' : 's'}` : ''}.`);
        return { inserted, skipped };
      } catch (err) { toast.error(errorMessage(err, 'The import failed. Nothing after the error was saved.')); return null; }
    },

    applyBudgetSuggestions: (budgets) => run(
      () => api.post('/budgets/bulk', { budgets }),
      `${budgets.length} budget${budgets.length === 1 ? '' : 's'} created.`, 'Could not create the budgets.', 'budgets'
    ),
    saveBudget: payload => run(() => api.post('/budgets', payload), 'Budget saved.', 'Could not save the budget.', 'budgets'),
    deleteBudget: async id => {
      if (!(await ask('Delete this budget?', 'Spending in this category will no longer be tracked against a limit.'))) return false;
      return run(() => api.delete(`/budgets/${id}`), 'Budget deleted.', 'Could not delete the budget.', 'budgets');
    },

    saveGoal: (payload, id) => run(
      () => (id ? api.put(`/goals/${id}`, payload) : api.post('/goals', payload)),
      id ? 'Goal updated.' : 'Goal created.', 'Could not save the goal.', 'goals'
    ),
    deleteGoal: async id => {
      if (!(await ask('Delete this goal?', 'The goal and its saved progress will be removed.'))) return false;
      return run(() => api.delete(`/goals/${id}`), 'Goal deleted.', 'Could not delete the goal.', 'goals');
    },
    depositToGoal: (id, amount) => run(
      () => api.patch(`/goals/${id}/deposit`, { amount }),
      ({ data }) => (data.goal.status === 'completed' && milestoneAlerts
        ? `Goal reached: ${data.goal.title}`
        : `${fmt(amount)} added to ${data.goal.title}.`),
      'Could not add funds.', 'goals'
    ),

    saveIncomeSource: (payload, id) => run(
      () => (id ? api.put(`/income/${id}`, payload) : api.post('/income', payload)),
      id ? 'Income source updated.' : 'Income source added.', 'Could not save the income source.', 'income'
    ),
    raiseIncome: (id, payload) => run(
      () => api.patch(`/income/${id}/raise`, payload),
      'New amount saved. Months already recorded are unchanged.', 'Could not change the amount.', 'income'
    ),
    toggleIncome: source => run(
      () => api.put(`/income/${source._id}`, { status: source.status === 'active' ? 'paused' : 'active' }),
      source.status === 'active' ? 'Income source paused.' : 'Income source resumed.', 'Could not update it.', 'income'
    ),
    deleteIncome: async source => {
      if (!(await ask(`Delete “${source.name}”?`, 'Income already recorded stays in your history, but is no longer linked to this source.'))) return false;
      return run(() => api.delete(`/income/${source._id}`), 'Income source deleted.', 'Could not delete it.', 'income');
    },
    moveRuleToIncome: ruleId => run(
      () => api.post(`/income/from-rule/${ruleId}`),
      'Moved to Income. It will keep recording on the same day.', 'Could not move it.', 'all'
    ),

    saveRule: (payload, id) => run(
      () => (id ? api.put(`/recurring/${id}`, payload) : api.post('/recurring', payload)),
      id ? 'Scheduled transaction updated.' : 'Scheduled transaction created.', 'Could not save the scheduled transaction.', 'rules'
    ),
    deleteRule: async id => {
      if (!(await ask('Delete this scheduled transaction?', 'It will stop being recorded automatically. Past entries stay in your history.'))) return false;
      return run(() => api.delete(`/recurring/${id}`), 'Scheduled transaction deleted.', 'Could not delete it.', 'rules');
    },
    toggleRule: id => run(
      () => api.patch(`/recurring/${id}/toggle`),
      ({ data }) => (data.rule.status === 'active' ? 'Scheduled transaction resumed.' : 'Scheduled transaction paused.'),
      'Could not update it.', 'rules'
    ),

    updateName: async name => {
      try {
        const { data } = await api.patch('/auth/profile', { name });
        setUser(data.user);
        toast.success('Name updated.');
        return true;
      } catch (err) { toast.error(errorMessage(err, 'Could not update your name.')); return false; }
    },
    changePassword: async (currentPassword, newPassword) => {
      try {
        const { data } = await api.patch('/auth/change-password', { currentPassword, newPassword });
        if (data.token) tokenStore.set(data.token); // other devices are signed out; this one gets a fresh session
        toast.success('Password changed. Other devices have been signed out.');
        return true;
      } catch (err) { toast.error(errorMessage(err, 'Could not change your password.')); return false; }
    },
    saveCurrency: async currency => {
      try {
        const { data } = await api.patch('/auth/preferences', { baseCurrency: currency });
        setUser(data.user);
        toast.success('Base currency updated.');
        await refresh('all');
        return true;
      } catch (err) { toast.error(errorMessage(err, 'Could not update the currency.')); return false; }
    }
  }), [run, ask, restore, confirm, setUser, toast, refresh, milestoneAlerts, fmt, fmtDate]);
}
