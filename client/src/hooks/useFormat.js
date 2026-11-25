import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import { formatDate, money } from '../utils/format';

/** Currency and date formatters that follow the user's base currency and display preferences. */
export function useFormat() {
  const { user } = useAuth();
  const { compactNumbers, dateFormat } = usePreferences();
  const base = user?.baseCurrency || 'INR';

  const fmt = useCallback(value => money(value, base, compactNumbers), [base, compactNumbers]);
  const fmtFull = useCallback(value => money(value, base, false), [base]);
  const fmtDate = useCallback(date => formatDate(date, dateFormat), [dateFormat]);

  return { base, fmt, fmtFull, fmtDate };
}
