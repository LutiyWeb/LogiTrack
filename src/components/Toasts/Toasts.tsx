import { useEffect } from 'react';
import { t } from '../../i18n';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { hideToast, type Toast } from '../../store/slices/toastsSlice';
import './Toasts.scss';

const LIFETIME_MS = 5000;

function Toasts() {
  const toasts = useAppSelector((state) => state.toasts);

  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

function ToastItem({ toast }: { toast: Toast }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const timer = setTimeout(() => dispatch(hideToast(toast.id)), LIFETIME_MS);
    return () => clearTimeout(timer);
  }, [dispatch, toast.id]);

  return (
    <div className={`toasts__item toasts__item--${toast.tone}`}>
      <span className="toasts__icon" aria-hidden="true">
        {toast.tone === 'success' ? '✓' : toast.tone === 'info' ? 'i' : '!'}
      </span>
      <span className="toasts__text">
        <span className="toasts__label">{t.toasts[toast.tone]}</span>
        {toast.text}
      </span>
      <button
        type="button"
        className="toasts__close"
        aria-label={t.common.close}
        onClick={() => dispatch(hideToast(toast.id))}
      >
        ×
      </button>
    </div>
  );
}

export default Toasts;
