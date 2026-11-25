import { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import CommandPalette from './CommandPalette';
import { PageSkeleton } from '../ui/Skeleton';
import { FinanceProvider } from '../../context/FinanceContext';
import { CategoryProvider } from '../../context/CategoryContext';

export default function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = e => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(o => !o);
      }
    };
    // Single-key shortcuts: N adds a transaction, / opens search. Ignored while typing or in a dialog.
    const onShortcut = e => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target;
      if (el.closest?.('input, textarea, select, [contenteditable="true"]') || document.querySelector('.modal-backdrop')) return;
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); navigate('/transactions?new=1'); }
      else if (e.key === '/') { e.preventDefault(); setPaletteOpen(true); }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keydown', onShortcut);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('keydown', onShortcut); };
  }, [navigate]);

  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  return (
    <FinanceProvider>
      <CategoryProvider>
      <div className="app-shell">
        <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
        {menuOpen && <div className="mobile-scrim" onClick={() => setMenuOpen(false)} />}
        <div className="main-area">
          <Topbar onMenu={() => setMenuOpen(true)} onSearch={() => setPaletteOpen(true)} />
          <main className="page-content" key={pathname}>
            <Suspense fallback={<PageSkeleton />}>
              <Outlet />
            </Suspense>
          </main>
        </div>
        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      </div>
      </CategoryProvider>
    </FinanceProvider>
  );
}
