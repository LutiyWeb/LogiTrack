import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { t } from '../../i18n';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectCurrentUser } from '../../store/slices/authSlice';
import { showToast } from '../../store/slices/toastsSlice';
import '../RateCon/RateCon.scss';
import '../Workspace/Workspace.scss';

type Kind = 'bug' | 'question' | 'idea';

/** Окно «Повідомити про проблему». В демо обращение никуда не уходит. */
function SupportDialog({ sectionLabel, onClose }: { sectionLabel: string; onClose: () => void }) {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectCurrentUser);
  const [kind, setKind] = useState<Kind>('bug');
  const [urgent, setUrgent] = useState(false);
  const [text, setText] = useState('');
  // Время открытия окна — фиксируем один раз.
  const [openedAt] = useState(() => new Date().toLocaleString('uk-UA'));

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const context = [
    t.support.context.section(sectionLabel),
    t.support.context.user(user ? `${user.name} · ${user.roleTitle}` : '—'),
    t.support.context.time(openedAt),
    t.support.context.browser(navigator.userAgent.split(') ')[0] + ')'),
  ];

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    const ticket = `LT-${1000 + Math.floor(Math.random() * 9000)}`;
    dispatch(showToast(urgent ? 'warning' : 'success', t.support.sent(ticket, urgent)));
    onClose();
  }

  return createPortal(
    <div
      className="runs__modal-backdrop ratecon"
      role="dialog"
      aria-modal="true"
      aria-label={t.support.title}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form className="ratecon__dialog" onSubmit={submit}>
        <header className="ratecon__head">
          <div>
            <h2 className="runs__subtitle">{t.support.title}</h2>
            <p className="ratecon__sub">{t.support.subtitle}</p>
          </div>
          <button type="button" className="ratecon__close" aria-label={t.common.close} onClick={onClose}>
            ×
          </button>
        </header>

        <div className="ratecon__pick">
          <div className="runs__filters runs__filters--inline" role="group" aria-label={t.support.kindAria}>
            {(['bug', 'question', 'idea'] as const).map((option) => (
              <button
                key={option}
                type="button"
                className={kind === option ? 'runs__filter is-active' : 'runs__filter'}
                onClick={() => setKind(option)}
              >
                {t.support.kinds[option]}
              </button>
            ))}
          </div>

          <label className="runs__field">
            <span className="runs__label">{t.support.describe}</span>
            <textarea
              className="runs__input runs__textarea"
              rows={4}
              placeholder={t.support.placeholder[kind]}
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
          </label>

          <label className="runs__check">
            <input type="checkbox" checked={urgent} onChange={(event) => setUrgent(event.target.checked)} />
            {t.support.urgent}
          </label>

          <div>
            <p className="runs__label">{t.support.contextTitle}</p>
            <ul className="runs__driver-runs">
              {context.map((line) => (
                <li key={line} className="runs__meta">
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <footer className="ratecon__footer">
          <button type="button" className="runs__button runs__button--tertiary" onClick={onClose}>
            {t.common.cancel}
          </button>
          <button type="submit" className="runs__button" disabled={!text.trim()}>
            {t.support.send}
          </button>
        </footer>
      </form>
    </div>,
    document.body,
  );
}

export default SupportDialog;
