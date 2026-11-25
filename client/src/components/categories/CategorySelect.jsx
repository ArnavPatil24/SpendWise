import { useState } from 'react';
import { createPortal } from 'react-dom';
import CategoryModal from './CategoryModal';
import { useCategories } from '../../context/CategoryContext';

const NEW = '__new__';

/** A category dropdown with "+ New category" built in, so a missing category never stops you mid-entry. */
export default function CategorySelect({ type, value, onChange, label = 'Category' }) {
  const { listFor } = useCategories();
  const [creating, setCreating] = useState(false);
  const list = listFor(type);
  const options = !value || list.includes(value) ? list : [value, ...list]; // keep an older/unknown value selectable

  return (
    <label>{label}
      <select value={value} onChange={e => (e.target.value === NEW ? setCreating(true) : onChange(e.target.value))}>
        {options.map(c => <option key={c}>{c}</option>)}
        <option value={NEW}>＋ New category…</option>
      </select>
      {creating && createPortal(
        <CategoryModal type={type} onClose={() => setCreating(false)} onCreated={created => onChange(created.name)} />,
        document.body
      )}
    </label>
  );
}
