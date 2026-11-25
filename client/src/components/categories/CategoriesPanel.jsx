import { useState } from 'react';
import { Pencil, Plus, Tags, Trash2 } from 'lucide-react';
import CategoryModal from './CategoryModal';
import DeleteCategoryModal from './DeleteCategoryModal';
import { categoryIcons } from '../../constants/categoryIcons';
import { expenseCategories, incomeCategories } from '../../constants';
import { useCategories } from '../../context/CategoryContext';

function Group({ title, builtIn, custom, onEdit, onDelete }) {
  return (
    <div className="cat-group">
      <h4>{title}</h4>
      <div className="chip-row">{builtIn.map(name => <span key={name} className="chip" title="Built in">{name}</span>)}</div>
      {custom.length > 0 && (
        <ul className="cat-custom-list">
          {custom.map(c => {
            const Icon = categoryIcons[c.icon] || categoryIcons.tag;
            return (
              <li key={c._id}>
                <i style={{ background: `${c.color}22`, color: c.color }}><Icon size={16} strokeWidth={1.9} /></i>
                <strong>{c.name}</strong>
                <button className="btn-icon" onClick={() => onEdit(c)} aria-label={`Edit ${c.name}`}><Pencil size={15} /></button>
                <button className="btn-icon btn-icon-danger" onClick={() => onDelete(c)} aria-label={`Delete ${c.name}`}><Trash2 size={15} /></button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Settings panel: see the built-in categories, and create, edit or delete your own. */
export default function CategoriesPanel() {
  const { custom } = useCategories();
  const [modal, setModal] = useState(null); // { kind: 'edit' | 'delete', category } or { kind: 'new' }

  return (
    <section className="panel panel-wide">
      <div className="settings-head">
        <i className="tile tile-gold"><Tags size={19} /></i>
        <div><h3>Categories</h3><p>Built-in categories are always available. Add your own for anything they miss.</p></div>
        <button className="btn btn-primary btn-sm head-action" onClick={() => setModal({ kind: 'new' })}><Plus size={15} /> New category</button>
      </div>
      <div className="cat-groups">
        <Group title="Spending" builtIn={expenseCategories} custom={custom.filter(c => c.type === 'expense')}
          onEdit={c => setModal({ kind: 'edit', category: c })} onDelete={c => setModal({ kind: 'delete', category: c })} />
        <Group title="Income" builtIn={incomeCategories} custom={custom.filter(c => c.type === 'income')}
          onEdit={c => setModal({ kind: 'edit', category: c })} onDelete={c => setModal({ kind: 'delete', category: c })} />
      </div>
      {modal?.kind === 'new' && <CategoryModal onClose={() => setModal(null)} />}
      {modal?.kind === 'edit' && <CategoryModal category={modal.category} onClose={() => setModal(null)} />}
      {modal?.kind === 'delete' && <DeleteCategoryModal category={modal.category} onClose={() => setModal(null)} />}
    </section>
  );
}
