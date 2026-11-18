import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useModalDialog } from '../../hooks/useModalDialog';
import { t } from '../../i18n';
import './ActionFab.scss';

export type FabAction = {
  id: string;
  label: string;
  disabled?: boolean;
  onSelect: () => void;
};

type ActionFabProps = {
  /** Accessible name of the floating button and the sheet title. */
  label: string;
  actions: FabAction[];
};

/** Mobile floating "+" button that opens a bottom sheet with the page actions. */
function ActionFab({ label, actions }: ActionFabProps) {
  const [open, setOpen] = useState(false);
  // Фокус уходит в шторку, Tab не выходит из неё, после закрытия фокус возвращается на «+».
  const panelRef = useModalDialog<HTMLDivElement>(open);

  // Lets toasts sit above the button while it is on screen.
  useEffect(() => {
    document.body.classList.add('has-fab');
    return () => document.body.classList.remove('has-fab');
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  // Portal: the page container animates with a transform, which would pin `fixed` to it.
  return createPortal(
    <>
      <button
        type="button"
        className="action-fab"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="action-sheet" role="dialog" aria-modal="true" aria-label={label}>
          <button
            type="button"
            className="action-sheet__backdrop"
            aria-label={t.common.cancel}
            onClick={() => setOpen(false)}
          />
          <div ref={panelRef} tabIndex={-1} className="action-sheet__panel">
            <p className="action-sheet__title">{label}</p>
            {actions.map((action) => (
              <button
                key={action.id}
                type="button"
                className="action-sheet__item"
                disabled={action.disabled}
                onClick={() => {
                  setOpen(false);
                  action.onSelect();
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </>,
    document.body,
  );
}

export default ActionFab;
