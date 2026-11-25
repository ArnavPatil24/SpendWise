import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarDays, Download, FolderInput, Plus, Receipt, Search, Trash2, Upload, X } from 'lucide-react';
import api, { errorMessage } from '../api/client';
import SectionTitle from '../components/ui/SectionTitle';
import Segmented from '../components/ui/Segmented';
import Pagination from '../components/ui/Pagination';
import EmptyState from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import TransactionTable from '../components/transactions/TransactionTable';
import TransactionModal from '../components/transactions/TransactionModal';
import ImportModal from '../components/transactions/ImportModal';
import CategoryModal from '../components/categories/CategoryModal';
import { useFinance } from '../context/FinanceContext';
import { useToast } from '../context/ToastContext';
import { useFinanceActions } from '../hooks/useFinanceActions';
import { useDebounce } from '../hooks/useDebounce';
import { useFormat } from '../hooks/useFormat';
import { downloadFile, today, transactionsToCsv } from '../utils/csv';
import { useCategories } from '../context/CategoryContext';

const typeOptions = [{ value: 'all', label: 'All' }, { value: 'income', label: 'Income' }, { value: 'expense', label: 'Expenses' }];
const sortOptions = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'highest', label: 'Highest amount' },
  { value: 'lowest', label: 'Lowest amount' }
];

export default function Transactions() {
  const [params, setParams] = useSearchParams();
  const toast = useToast();
  const { version } = useFinance();
  const { saveTransaction, deleteTransaction, bulkDeleteTransactions, bulkCategory, importTransactions } = useFinanceActions();
  const { base, fmt, fmtDate } = useFormat();
  const { expenseList, incomeList } = useCategories();

  const [search, setSearch] = useState(params.get('q') || '');
  const [type, setType] = useState('all');
  const [category, setCategory] = useState('all');
  const [day, setDay] = useState(params.get('date') || '');
  const [selected, setSelected] = useState(() => new Set());
  const [importing, setImporting] = useState(false);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [categories, setCategories] = useState([]);
  const [data, setData] = useState({ transactions: [], totals: { income: 0, expenses: 0 }, pagination: { page: 1, limit: 10, total: 0, totalPages: 1 } });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(params.get('new') === '1' ? { initial: null } : null);

  const debouncedSearch = useDebounce(search);

  // Deep links from the topbar (?new=1) and the command palette (?q=…) are one-shot.
  useEffect(() => {
    if (params.has('new') || params.has('q') || params.has('date') || params.has('import')) {
      if (params.get('import') === '1') setImporting(true);
      if (params.get('q')) setSearch(params.get('q'));
      if (params.get('date')) setDay(params.get('date'));
      if (params.get('new') === '1') setModal({ initial: null });
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  const query = useMemo(() => {
    const q = { page, limit, sort };
    if (type !== 'all') q.type = type;
    if (category !== 'all') q.category = category;
    if (day) q.date = day;
    if (debouncedSearch.trim()) q.search = debouncedSearch.trim();
    return q;
  }, [page, limit, sort, type, category, day, debouncedSearch]);

  // Reset to page 1 whenever a filter changes.
  useEffect(() => { setPage(1); }, [type, category, day, sort, debouncedSearch, limit]);

  // A selection only makes sense for the rows currently on screen.
  useEffect(() => { setSelected(new Set()); }, [query, version]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get('/transactions', { params: query })
      .then(res => { if (!cancelled) setData(res.data); })
      .catch(err => { if (!cancelled) toast.error(errorMessage(err, 'Could not load transactions.')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [query, version, toast]);

  useEffect(() => {
    api.get('/transactions/categories').then(res => setCategories(res.data.categories)).catch(() => {});
  }, [version]);

  // If deleting the last row of a page leaves it empty, step back one page.
  useEffect(() => {
    if (!loading && data.transactions.length === 0 && page > 1) setPage(p => p - 1);
  }, [loading, data.transactions.length, page]);

  const exportCsv = useCallback(async () => {
    try {
      const { page: _p, limit: _l, ...filters } = query;
      const { data: all } = await api.get('/transactions/export', { params: filters });
      if (!all.transactions.length) { toast.info('There are no transactions to export.'); return; }
      downloadFile(transactionsToCsv(all.transactions, base), `spendwise-transactions-${today()}.csv`, 'text/csv;charset=utf-8');
      if (all.truncated) toast.info(`Exported the newest ${all.limit.toLocaleString()} matching transactions. Narrow the filters to export the rest.`);
      else toast.success(`Exported ${all.transactions.length} transactions.`);
    } catch (err) { toast.error(errorMessage(err, 'Could not export transactions.')); }
  }, [query, base, toast]);

  const hasFilters = type !== 'all' || category !== 'all' || day || search.trim();
  const clearFilters = () => { setType('all'); setCategory('all'); setSearch(''); setDay(''); };

  const selection = {
    selected,
    toggle: id => setSelected(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; }),
    toggleAll: () => setSelected(prev => (data.transactions.every(t => prev.has(t._id)) ? new Set() : new Set(data.transactions.map(t => t._id))))
  };
  const selectedItems = data.transactions.filter(t => selected.has(t._id));
  const selectedTypes = new Set(selectedItems.map(t => t.type));
  const bulkCategoryType = selectedTypes.size === 1 ? [...selectedTypes][0] : undefined;
  const allCategories = [...new Set([...expenseList, ...incomeList, ...categories])].sort((a, b) => a.localeCompare(b));

  return (
    <>
      <SectionTitle
        title="Transactions"
        subtitle="Every payment in and out, searchable and sortable."
        action={
          <div className="btn-group">
            <button className="btn btn-secondary" onClick={() => setImporting(true)}><Upload size={16} /> Import CSV</button>
            <button className="btn btn-secondary" onClick={exportCsv}><Download size={16} /> Export CSV</button>
            <button className="btn btn-primary" onClick={() => setModal({ initial: null })}><Plus size={17} /> Add transaction</button>
          </div>
        }
      />

      <div className="toolbar">
        <div className="search-field">
          <Search size={17} />
          <input placeholder="Search by title, category or note" value={search} onChange={e => setSearch(e.target.value)} aria-label="Search transactions" />
          {search && <button className="btn-icon" onClick={() => setSearch('')} aria-label="Clear search"><X size={15} /></button>}
        </div>
        <Segmented label="Filter by type" value={type} onChange={setType} options={typeOptions} />
        <select value={category} onChange={e => setCategory(e.target.value)} aria-label="Filter by category">
          <option value="all">All categories</option>
          {allCategories.map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={sort} onChange={e => setSort(e.target.value)} aria-label="Sort order">
          {sortOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {day && (
          <button className="filter-chip" onClick={() => setDay('')} aria-label="Remove day filter">
            <CalendarDays size={14} /> {fmtDate(`${day}T12:00:00`)} <X size={13} />
          </button>
        )}
      </div>

      <section className="panel panel-flush">
        <div className="panel-head panel-head-pad">
          <div>
            <h3>{data.pagination.total} transaction{data.pagination.total === 1 ? '' : 's'}</h3>
            <p>
              <span className="amount-pos">+{fmt(data.totals.income)}</span> in
              <span className="sep" />
              <span className="amount-neg">−{fmt(data.totals.expenses)}</span> out
              {hasFilters && <button className="link-btn inline" onClick={clearFilters}>Clear filters</button>}
            </p>
          </div>
        </div>

        {selected.size > 0 && (
          <div className="bulk-bar" role="region" aria-label="Bulk actions">
            <strong>{selected.size} selected</strong>
            <label className="bulk-category">
              <FolderInput size={15} />
              <select value="" onChange={e => {
                if (e.target.value === '__new__') setCreatingCategory(true);
                else if (e.target.value) bulkCategory([...selected], e.target.value);
              }} aria-label="Move selected to category">
                <option value="">Move to category…</option>
                {allCategories.map(c => <option key={c}>{c}</option>)}
                <option value="__new__">＋ New category…</option>
              </select>
            </label>
            <button className="btn btn-danger-outline btn-sm" onClick={() => bulkDeleteTransactions(selectedItems)}><Trash2 size={14} /> Delete</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setSelected(new Set())}>Clear</button>
          </div>
        )}

        {loading && data.transactions.length === 0 ? (
          <div className="table-skeleton">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} height={52} radius={12} />)}</div>
        ) : data.transactions.length ? (
          <div className={loading ? 'is-refreshing' : ''}>
            <TransactionTable
              transactions={data.transactions}
              onEdit={t => setModal({ initial: t })}
              onDelete={deleteTransaction}
              selection={selection}
            />
            <Pagination pagination={data.pagination} onPage={setPage} onLimit={setLimit} />
          </div>
        ) : (
          <EmptyState
            icon={Receipt}
            title={hasFilters ? 'Nothing matches those filters' : 'No transactions yet'}
            text={hasFilters ? 'Try a different search or clear the filters.' : 'Add your first income or expense to start building your history.'}
            action={hasFilters
              ? <button className="btn btn-secondary" onClick={clearFilters}>Clear filters</button>
              : <button className="btn btn-primary" onClick={() => setModal({ initial: null })}><Plus size={16} /> Add transaction</button>}
          />
        )}
      </section>

      {modal && <TransactionModal initial={modal.initial} onClose={() => setModal(null)} onSave={saveTransaction} />}
      {importing && <ImportModal onClose={() => setImporting(false)} onImport={importTransactions} />}
      {creatingCategory && (
        <CategoryModal
          type={bulkCategoryType}
          types={['expense', 'income']}
          onClose={() => setCreatingCategory(false)}
          onCreated={created => bulkCategory([...selected], created.name)}
        />
      )}
    </>
  );
}
