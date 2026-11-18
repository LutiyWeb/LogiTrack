import { useEffect, useRef } from 'react';

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Shared behaviour of a modal window: moves keyboard focus into the window when it opens,
 * keeps Tab inside it, stops the page underneath from scrolling, and gives focus back on close.
 * If the element that opened the window is gone (a closed menu), focus goes to the element
 * marked `data-modal-return`.
 * Attach the returned ref to the window element (it gets tabIndex={-1}).
 */
export function useModalDialog<T extends HTMLElement>(open = true) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    // The window itself takes focus, not the first field, so a phone keyboard does not pop up.
    ref.current?.focus({ preventScroll: true });

    const onKeyDown = (event: KeyboardEvent) => {
      const root = ref.current;
      if (event.key !== 'Tab' || !root) return;
      const items = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (!root.contains(active) || active === root) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
      const target = previous?.isConnected
        ? previous
        : document.querySelector<HTMLElement>('[data-modal-return]');
      target?.focus({ preventScroll: true });
    };
  }, [open]);

  return ref;
}
