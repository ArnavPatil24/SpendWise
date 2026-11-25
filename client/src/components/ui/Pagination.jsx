import { ChevronLeft, ChevronRight } from 'lucide-react';
import { pageSizes } from '../../constants';

function pageList(page, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, page, page - 1, page + 1]);
  if (page <= 3) { pages.add(2); pages.add(3); pages.add(4); }
  if (page >= total - 2) { pages.add(total - 1); pages.add(total - 2); pages.add(total - 3); }
  const sorted = [...pages].filter(p => p >= 1 && p <= total).sort((a, b) => a - b);
  const out = [];
  sorted.forEach((p, i) => {
    if (i && p - sorted[i - 1] > 1) out.push('gap-' + p);
    out.push(p);
  });
  return out;
}

export default function Pagination({ pagination, onPage, onLimit }) {
  const { page, limit, total, totalPages } = pagination;
  const from = total ? (page - 1) * limit + 1 : 0;
  const to = Math.min(total, page * limit);

  return (
    <nav className="pagination" aria-label="Pagination">
      <span className="pagination-range">Showing <strong>{from}–{to}</strong> of <strong>{total}</strong></span>
      <div className="pagination-pages">
        <button className="page-btn" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeft size={16} /></button>
        {pageList(page, totalPages).map(p => (
          typeof p === 'number'
            ? <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => onPage(p)} aria-current={p === page ? 'page' : undefined}>{p}</button>
            : <span key={p} className="page-gap">…</span>
        ))}
        <button className="page-btn" disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label="Next page"><ChevronRight size={16} /></button>
      </div>
      <label className="pagination-size">
        Rows
        <select value={limit} onChange={e => onLimit(Number(e.target.value))}>
          {pageSizes.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>
    </nav>
  );
}
