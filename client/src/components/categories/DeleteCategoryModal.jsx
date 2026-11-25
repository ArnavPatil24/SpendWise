import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import ModalShell from '../ui/ModalShell';
import { useCategories } from '../../context/CategoryContext';

/** Shows where a category is used and, if it is, asks where those entries should move to. */
export default function DeleteCategoryModal({ category, onClose }) {
  const { usage: loadUsage, listFor, remove } = useCategories();
  const [usage, setUsage] = useState(null);
  const options = listFor(category.type).filter(name => name !== category.name);
  const [target, setTarget] = useState(category.type === 'income' ? 'Other income' : 'Other');
  const [busy, setBusy] = useState(false);

  useEffect(() => { loadUsage(category._id).then(setUsage); }, [category._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const moving = usage ? usage.transactions + usage.rules + usage.sources : 0;

  async function confirm() {
    setBusy(true);
    const ok = await remove(category._id, moving > 0 ? target : undefined);
    setBusy(false);
    if (ok) onClose();
  }

  return (
    <ModalShell title={`Delete “${category.name}”?`} subtitle="This can’t be undone." onClose={onClose}>
      <div className="form">
        {!usage ? <p className="muted-small">Checking where it is used…</p> : (
          <>
            {usage.total === 0 && <p>Nothing uses this category yet, so it can be removed safely.</p>}
            {moving > 0 && (
              <>
                <p>
                  <strong>{usage.transactions}</strong> transaction{usage.transactions === 1 ? '' : 's'}
                  {usage.rules > 0 && <>, <strong>{usage.rules}</strong> scheduled</>}
                  {usage.sources > 0 && <>, <strong>{usage.sources}</strong> income source{usage.sources === 1 ? '' : 's'}</>} use it.
                </p>
                <label>Move them to
                  <select value={target} onChange={e => setTarget(e.target.value)}>
                    {options.map(name => <option key={name}>{name}</option>)}
                  </select>
                </label>
              </>
            )}
            {usage.budgets > 0 && (
              <div className="tip"><AlertTriangle size={15} /><span>Its {usage.budgets} budget{usage.budgets === 1 ? '' : 's'} will be removed, because a budget is a limit on that one category.</span></div>
            )}
          </>
        )}
        <div className="form-actions">
          <button className="btn btn-secondary" onClick={onClose}>Keep it</button>
          <button className="btn btn-danger" disabled={!usage || busy} onClick={confirm}>{busy ? 'Deleting…' : 'Delete category'}</button>
        </div>
      </div>
    </ModalShell>
  );
}
