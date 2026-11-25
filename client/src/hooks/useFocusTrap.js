import { useEffect } from 'react';

// Dialogs can open on top of each other (for example "New category" inside the add-transaction form).
// Only the top-most one traps focus or closes on Escape.
const stack = [];
export const isTopDialog = node => stack[stack.length - 1] === node;

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Keeps Tab and Shift+Tab inside a dialog and hands focus back to whatever opened it.
 * Call it before any effect that moves focus, so the opener is remembered correctly.
 */
export function useFocusTrap(ref, active = true) {
  useEffect(() => {
    const node = ref.current;
    if (!active || !node) return undefined;
    const opener = document.activeElement;
    stack.push(node);

    const onKey = e => {
      if (e.key !== 'Tab' || !isTopDialog(node)) return;
      const items = [...node.querySelectorAll(FOCUSABLE)].filter(el => !el.hidden && el.getAttribute('aria-hidden') !== 'true');
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (!node.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };

    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      stack.splice(stack.indexOf(node), 1);
      if (opener && document.contains(opener)) opener.focus?.();
    };
  }, [ref, active]);
}
