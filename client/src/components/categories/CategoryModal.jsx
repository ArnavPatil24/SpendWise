import { useState } from 'react';
import { Check } from 'lucide-react';
import ModalShell from '../ui/ModalShell';
import Segmented from '../ui/Segmented';
import { categoryColors, categoryIconKeys, categoryIcons } from '../../constants/categoryIcons';
import { useCategories } from '../../context/CategoryContext';

/**
 * Create a category, or edit an existing one (name, icon and colour; the type is fixed once created).
 * `type` pre-selects and locks the type when opened from a form that already knows it.
 */
export default function CategoryModal({ category, type: lockedType, onClose, onCreated }) {
  const { create, update } = useCategories();
  const editing = Boolean(category);
  const [type, setType] = useState(category?.type || lockedType || 'expense');
  const [name, setName] = useState(category?.name || '');
  const [icon, setIcon] = useState(category?.icon || 'tag');
  const [color, setColor] = useState(category?.color || categoryColors[0]);
  const [busy, setBusy] = useState(false);
  const Preview = categoryIcons[icon] || categoryIcons.tag;

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    const saved = editing ? await update(category._id, { name: name.trim(), icon, color }) : await create({ name: name.trim(), type, icon, color });
    setBusy(false);
    if (saved) { onCreated?.(saved); onClose(); }
  }

  return (
    <ModalShell
      title={editing ? 'Edit category' : 'New category'}
      subtitle={editing ? 'Renaming also updates every entry that uses it.' : 'Make a category that fits the way you spend or earn.'}
      onClose={onClose}
    >
      <form className="form" onSubmit={submit}>
        {!editing && !lockedType && (
          <Segmented label="Category type" value={type} onChange={setType}
            options={[{ value: 'expense', label: 'Spending' }, { value: 'income', label: 'Income' }]} />
        )}
        {!editing && lockedType && <div className="tip"><span>This will be a <strong>{lockedType === 'income' ? 'income' : 'spending'}</strong> category.</span></div>}

        <label>Name
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Pets, Gym, Tutoring" required minLength={2} maxLength={30} autoComplete="off" />
        </label>

        <div className="picker">
          <span className="picker-label">Icon</span>
          <div className="icon-grid" role="group" aria-label="Icon">
            {categoryIconKeys.map(key => {
              const Icon = categoryIcons[key];
              return (
                <button type="button" key={key} className={icon === key ? 'on' : ''} aria-pressed={icon === key} aria-label={key.replace('-', ' ')} onClick={() => setIcon(key)}>
                  <Icon size={18} strokeWidth={1.9} />
                </button>
              );
            })}
          </div>
        </div>

        <div className="picker">
          <span className="picker-label">Colour</span>
          <div className="swatches" role="group" aria-label="Colour">
            {categoryColors.map(c => (
              <button type="button" key={c} className={color === c ? 'on' : ''} style={{ background: c }} aria-pressed={color === c} aria-label={`Colour ${c}`} onClick={() => setColor(c)}>
                {color === c && <Check size={14} />}
              </button>
            ))}
          </div>
        </div>

        <div className="cat-preview"><i style={{ background: `${color}22`, color }}><Preview size={18} strokeWidth={1.9} /></i><strong>{name.trim() || 'Your category'}</strong></div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy || name.trim().length < 2}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Create category'}</button>
        </div>
      </form>
    </ModalShell>
  );
}
