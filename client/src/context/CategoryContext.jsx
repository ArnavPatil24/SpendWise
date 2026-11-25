import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { errorMessage } from '../api/client';
import { expenseCategories, goalCategories, incomeCategories } from '../constants';
import { useFinance } from './FinanceContext';
import { useToast } from './ToastContext';

const CategoryContext = createContext(null);

/** Built-in categories plus the ones the user has created, with the calls to manage them. */
export function CategoryProvider({ children }) {
  const toast = useToast();
  const { refresh } = useFinance();
  const [custom, setCustom] = useState([]);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/categories');
      setCustom(data.categories);
    } catch (err) { toast.error(errorMessage(err, 'Could not load your categories.')); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const value = useMemo(() => {
    const expenseList = [...expenseCategories, ...custom.filter(c => c.type === 'expense').map(c => c.name)];
    const incomeList = [...incomeCategories, ...custom.filter(c => c.type === 'income').map(c => c.name)];
    const goalList = [...goalCategories, ...custom.filter(c => c.type === 'goal').map(c => c.name)];
    const byName = new Map(custom.map(c => [c.name.toLowerCase(), c]));

    return {
      custom, expenseList, incomeList, goalList,
      listFor: type => (type === 'income' ? incomeList : type === 'goal' ? goalList : expenseList),
      metaFor: name => byName.get(String(name || '').toLowerCase()) || null,

      // Each returns the saved category (or true) on success and null/false on failure.
      create: async payload => {
        try {
          const { data } = await api.post('/categories', payload);
          toast.success(`Category “${data.category.name}” created.`);
          await load();
          return data.category;
        } catch (err) { toast.error(errorMessage(err, 'Could not create the category.')); return null; }
      },
      update: async (id, payload) => {
        try {
          const { data } = await api.put(`/categories/${id}`, payload);
          toast.success('Category updated.');
          await load();
          if (payload.name) await refresh('all'); // a rename changes transactions, budgets and rules
          return data.category;
        } catch (err) { toast.error(errorMessage(err, 'Could not update the category.')); return null; }
      },
      usage: async id => {
        try { return (await api.get(`/categories/${id}/usage`)).data.usage; }
        catch (err) { toast.error(errorMessage(err, 'Could not check where this category is used.')); return null; }
      },
      remove: async (id, reassignTo) => {
        try {
          await api.delete(`/categories/${id}`, { params: reassignTo ? { reassignTo } : {} });
          toast.success('Category deleted.');
          await load();
          await refresh('all');
          return true;
        } catch (err) { toast.error(errorMessage(err, 'Could not delete the category.')); return false; }
      }
    };
  }, [custom, load, toast, refresh]);

  return <CategoryContext.Provider value={value}>{children}</CategoryContext.Provider>;
}

export const useCategories = () => useContext(CategoryContext);
