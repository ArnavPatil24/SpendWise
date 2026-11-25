import { Pencil, Trash2 } from 'lucide-react';
import { CategoryIcon } from '../ui/CategoryIcon';
import { useFormat } from '../../hooks/useFormat';
import { money } from '../../utils/format';

/**
 * `selection` (optional) adds a checkbox column: { selected: Set<id>, toggle(id), toggleAll() }.
 * `onDelete` receives the whole transaction so a delete can be undone.
 */
export default function TransactionTable({ transactions, compact = false, onEdit, onDelete, selection }) {
  const { base, fmt, fmtDate } = useFormat();
  const allSelected = selection && transactions.length > 0 && transactions.every(t => selection.selected.has(t._id));
  const someSelected = selection && !allSelected && transactions.some(t => selection.selected.has(t._id));

  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            {selection && (
              <th className="check-cell">
                <input
                  type="checkbox" className="check" aria-label="Select all on this page"
                  checked={allSelected} ref={el => { if (el) el.indeterminate = someSelected; }}
                  onChange={selection.toggleAll}
                />
              </th>
            )}
            <th>Transaction</th>
            <th>Category</th>
            <th>Date</th>
            <th className="num">Amount</th>
            {!compact && <th><span className="sr-only">Actions</span></th>}
          </tr>
        </thead>
        <tbody>
          {transactions.map(t => {
            const checked = selection?.selected.has(t._id);
            return (
              <tr key={t._id} className={checked ? 'is-selected' : ''}>
                {selection && (
                  <td className="check-cell">
                    <input type="checkbox" className="check" checked={checked} onChange={() => selection.toggle(t._id)} aria-label={`Select ${t.title}`} />
                  </td>
                )}
                <td>
                  <div className="tx-name">
                    <div className={`tx-icon ${t.type}`}><CategoryIcon category={t.category} /></div>
                    <div>
                      <strong>{t.title}</strong>
                      <small>{t.note || t.currency}</small>
                    </div>
                  </div>
                </td>
                <td><span className="chip">{t.category}</span></td>
                <td className="muted">{fmtDate(t.date)}</td>
                <td className="num">
                  <strong className={t.type === 'income' ? 'amount-pos' : 'amount-neg'}>
                    {t.type === 'income' ? '+' : '−'}{fmt(t.convertedAmount)}
                  </strong>
                  {t.currency !== base && <small className="original-amount">{money(t.amount, t.currency)}</small>}
                </td>
                {!compact && (
                  <td>
                    <div className="row-actions">
                      <button className="btn-icon" title="Edit" aria-label={`Edit ${t.title}`} onClick={() => onEdit(t)}><Pencil size={15} /></button>
                      <button className="btn-icon btn-icon-danger" title="Delete" aria-label={`Delete ${t.title}`} onClick={() => onDelete(t)}><Trash2 size={15} /></button>
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
