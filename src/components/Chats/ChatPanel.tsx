import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useModalDialog } from '../../hooks/useModalDialog';
import { t } from '../../i18n';
import ChatsView from './ChatsView';
import './ChatPanel.scss';

type ChatPanelProps = {
  selected: string | null;
  onSelect: (driver: string | null) => void;
  onClose: () => void;
};

/**
 * Боковая панель чатов справа: на десктопе поверх страницы, на мобильном и до 768 px — на весь экран.
 * Esc и клик по фону закрывают, фокус уходит внутрь и возвращается, прокрутка страницы заблокирована.
 */
function ChatPanel({ selected, onSelect, onClose }: ChatPanelProps) {
  const panelRef = useModalDialog<HTMLDivElement>();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div className="chat-panel" role="dialog" aria-modal="true" aria-label={t.chats.panelAria}>
      <button type="button" className="chat-panel__backdrop" aria-label={t.common.close} onClick={onClose} />
      <div ref={panelRef} tabIndex={-1} className="chat-panel__sheet">
        <header className="chat-panel__head">
          <h2 className="runs__subtitle">{t.chats.title}</h2>
          <button type="button" className="ratecon__close" aria-label={t.common.close} onClick={onClose}>
            ×
          </button>
        </header>
        <ChatsView selected={selected} onSelect={onSelect} onNavigate={onClose} variant="panel" />
      </div>
    </div>,
    document.body,
  );
}

export default ChatPanel;
