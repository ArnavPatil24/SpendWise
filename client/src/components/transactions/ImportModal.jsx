import { useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, UploadCloud } from 'lucide-react';
import ModalShell from '../ui/ModalShell';
import { parseCsv } from '../../utils/csvParse';
import { SAMPLE_CSV, buildTransactions, detectColumns, detectDateOrder } from '../../utils/importMapper';
import { downloadFile } from '../../utils/csv';
import { useFormat } from '../../hooks/useFormat';
import { useToast } from '../../context/ToastContext';
import { useCategories } from '../../context/CategoryContext';

const FIELDS = [
  { key: 'date', label: 'Date', required: true },
  { key: 'title', label: 'Description' },
  { key: 'amount', label: 'Amount' },
  { key: 'debit', label: 'Debit (money out)' },
  { key: 'credit', label: 'Credit (money in)' },
  { key: 'type', label: 'Type (optional)' },
  { key: 'category', label: 'Category (optional)' },
  { key: 'note', label: 'Note (optional)' }
];
const MAX_ROWS = 5000;

export default function ImportModal({ onClose, onImport }) {
  const { base, fmt, fmtDate } = useFormat();
  const toast = useToast();
  const { custom } = useCategories();
  const input = useRef(null);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState(null);
  const [mapping, setMapping] = useState({});
  const [direction, setDirection] = useState('auto');
  const [dateOrder, setDateOrder] = useState('DMY');
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load(file) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error('That file is larger than 5 MB.');
    const parsed = parseCsv(await file.text());
    if (parsed.length < 2) return toast.error('That file has no data rows. Check that it is a CSV with a header row.');
    if (parsed.length - 1 > MAX_ROWS) return toast.error(`Import up to ${MAX_ROWS} rows at a time. Split the file and try again.`);
    setFileName(file.name);
    setRows(parsed);
    setMapping(detectColumns(parsed[0]));
    setDateOrder(detectDateOrder(parsed.slice(1, 60).map(r => r[detectColumns(parsed[0]).date] ?? '')));
    return undefined;
  }

  const result = useMemo(
    () => (rows ? buildTransactions(rows.slice(1), mapping, { direction, dateOrder, currency: base, customCategories: custom }) : null),
    [rows, mapping, direction, dateOrder, base, custom]
  );

  async function submit() {
    setBusy(true);
    const done = await onImport(result.valid, skipDuplicates);
    setBusy(false);
    if (done) onClose();
  }

  const income = result?.valid.filter(t => t.type === 'income').length || 0;

  return (
    <ModalShell title="Import from CSV" subtitle="Bring in a bank statement or another tracker’s export. Categories are filled in automatically." onClose={onClose}>
      {!rows ? (
        <div className="form">
          <div
            className={`dropzone ${dragging ? 'dragging' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); load(e.dataTransfer.files?.[0]); }}
            onClick={() => input.current?.click()}
            role="button" tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') input.current?.click(); }}
          >
            <UploadCloud size={30} />
            <strong>Drop a CSV file here</strong>
            <span>or click to choose one (up to {MAX_ROWS.toLocaleString()} rows)</span>
            <input ref={input} type="file" accept=".csv,text/csv" hidden onChange={e => load(e.target.files?.[0])} />
          </div>
          <div className="tip"><FileSpreadsheet size={15} /><span>Needs a header row with at least a date and an amount (or debit and credit columns). Dates like 13/11/2026, 2026-11-13 and 13 Nov 2026 all work.</span></div>
          <button type="button" className="btn btn-secondary" onClick={() => downloadFile(SAMPLE_CSV, 'spendwise-sample.csv', 'text/csv;charset=utf-8')}>
            <Download size={16} /> Download a sample file
          </button>
        </div>
      ) : (
        <div className="form">
          <div className="import-file"><FileSpreadsheet size={16} /><strong>{fileName}</strong><span>{rows.length - 1} rows</span>
            <button type="button" className="link-btn" onClick={() => { setRows(null); setFileName(''); }}>Choose another</button>
          </div>

          <div className="mapping-grid">
            {FIELDS.map(f => (
              <label key={f.key}>{f.label}
                <select value={mapping[f.key] ?? -1} onChange={e => {
                  const column = Number(e.target.value);
                  setMapping(m => ({ ...m, [f.key]: column }));
                  if (f.key === 'date' && column >= 0) setDateOrder(detectDateOrder(rows.slice(1, 60).map(r => r[column] ?? '')));
                }}>
                  <option value={-1}>{f.required ? 'Select column…' : 'Not in file'}</option>
                  {rows[0].map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}
                </select>
              </label>
            ))}
          </div>

          <div className="form-row">
            <label>When a single amount column is used
              <select value={direction} onChange={e => setDirection(e.target.value)}>
                <option value="auto">Auto: negative = money out</option>
                <option value="expense">Treat every row as an expense</option>
                <option value="income">Treat every row as income</option>
              </select>
            </label>
            <label>Date order
              <select value={dateOrder} onChange={e => setDateOrder(e.target.value)}>
                <option value="DMY">Day first (13/11/2026)</option>
                <option value="MDY">Month first (11/13/2026)</option>
              </select>
            </label>
          </div>

          <label className="checkbox-row">
            <input type="checkbox" className="check" checked={skipDuplicates} onChange={e => setSkipDuplicates(e.target.checked)} />
            <span>Skip rows I already have<small>Same title, amount and day as an existing transaction.</small></span>
          </label>

          <div className={`import-summary ${result.valid.length ? '' : 'is-bad'}`}>
            {result.valid.length ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <div>
              <strong>{result.valid.length} ready to import</strong>
              <small>{result.valid.length - income} expenses, {income} income{result.invalid.length ? `, ${result.invalid.length} skipped (${result.invalid[0].reason.toLowerCase()} on line ${result.invalid[0].line}${result.invalid.length > 1 ? ' and others' : ''})` : ''}</small>
            </div>
          </div>

          {result.valid.length > 0 && (
            <div className="table-scroll preview-table">
              <table className="data-table">
                <thead><tr><th>Date</th><th>Description</th><th>Category</th><th className="num">Amount</th></tr></thead>
                <tbody>
                  {result.valid.slice(0, 5).map((t, i) => (
                    <tr key={i}>
                      <td className="muted">{fmtDate(t.date)}</td>
                      <td>{t.title}</td>
                      <td><span className="chip">{t.category}</span></td>
                      <td className="num"><strong className={t.type === 'income' ? 'amount-pos' : 'amount-neg'}>{t.type === 'income' ? '+' : '−'}{fmt(t.amount)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {result.valid.length > 5 && <small className="preview-more">Showing 5 of {result.valid.length}</small>}
            </div>
          )}

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="button" className="btn btn-primary" disabled={busy || !result.valid.length} onClick={submit}>
              {busy ? 'Importing…' : `Import ${result.valid.length} transaction${result.valid.length === 1 ? '' : 's'}`}
            </button>
          </div>
        </div>
      )}
    </ModalShell>
  );
}
