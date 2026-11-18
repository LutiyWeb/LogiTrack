import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useModalDialog } from '../../hooks/useModalDialog';
import { t } from '../../i18n';
import './ConfirmDialog.scss';

type ConfirmDialogProps = {
  title: string;
  text: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Asks for confirmation before a destructive action. Esc and a tap outside cancel. */
function ConfirmDialog({ title, text, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  const panelRef = useModalDialog<HTMLDivElement>();
  const cancelRef = useRef<HTMLButtonElement>(null);
  // Фокус — на безопасной кнопке: случайный Enter не удалит данные.
  useEffect(() => {
    cancelRef.current?.focus({ preventScroll: true });
  }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return createPortal(
    <div className="confirm" role="alertdialog" aria-modal="true" aria-label={title}>
      <button type="button" className="confirm__backdrop" aria-label={t.common.cancel} onClick={onCancel} />
      <div ref={panelRef} tabIndex={-1} className="confirm__panel">
        <h2 className="confirm__title">{title}</h2>
        <p className="confirm__text">{text}</p>
        <div className="confirm__actions">
          <button ref={cancelRef} type="button" className="runs__button runs__button--tertiary" onClick={onCancel}>
            {t.common.cancel}
          </button>
          <button type="button" className="runs__button runs__button--danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default ConfirmDialog;
