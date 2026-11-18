import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { messageTime, type Chat, type ChatMessage } from '../../chats/chats';
import { t } from '../../i18n';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectCurrentUser } from '../../store/slices/authSlice';
import { markChatRead, sendChatMessage } from '../../store/slices/chatsSlice';
import { openRun } from '../../store/slices/runsSlice';
import { setActiveSection } from '../../store/slices/uiSlice';
import '../Workspace/Workspace.scss';
import './Chats.scss';

/** Сколько последних сообщений показывается сразу и сколько добавляется при прокрутке вверх. */
const PAGE = 20;

type ChatsViewProps = {
  /** Открытый чат (водитель) или null — список. */
  selected: string | null;
  onSelect: (driver: string | null) => void;
  /** Вызывается после перехода к рейсу (например, чтобы закрыть панель). */
  onNavigate?: () => void;
  /** Где показан: на странице «Чати» или в боковой панели (от этого зависит высота). */
  variant?: 'page' | 'panel';
};

/**
 * Чаты с водителями: список (поиск, «непрочитані», сортировка по последнему сообщению)
 * и переписка. Один компонент для боковой панели и для страницы «Чати».
 */
function ChatsView({ selected, onSelect, onNavigate, variant = 'page' }: ChatsViewProps) {
  const chats = useAppSelector((state) => state.chats.chats);
  const chat = chats.find((item) => item.driver === selected);

  return (
    <div className={`chatview chatview--${variant}`}>
      {chat ? (
        <Thread key={chat.driver} chat={chat} onBack={() => onSelect(null)} onNavigate={onNavigate} />
      ) : (
        <List chats={chats} onSelect={onSelect} />
      )}
    </div>
  );
}

function lastAt(chat: Chat) {
  return chat.messages.at(-1)?.at ?? '';
}

function List({ chats, onSelect }: { chats: Chat[]; onSelect: (driver: string) => void }) {
  const [query, setQuery] = useState('');
  const [onlyUnread, setOnlyUnread] = useState(false);
  const unreadTotal = chats.reduce((sum, chat) => sum + chat.unread, 0);

  const needle = query.trim().toLowerCase();
  const visible = chats
    .filter((chat) => !onlyUnread || chat.unread > 0)
    .filter(
      (chat) =>
        !needle ||
        chat.driver.toLowerCase().includes(needle) ||
        chat.messages.some((message) => message.text.toLowerCase().includes(needle)),
    )
    .toSorted((a, b) => lastAt(b).localeCompare(lastAt(a)));

  return (
    <>
      <div className="chatview__tools">
        <input
          className="runs__input"
          type="search"
          placeholder={t.chats.search}
          aria-label={t.chats.search}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button
          type="button"
          className={`runs__button runs__button--secondary runs__button--small${onlyUnread ? ' is-active' : ''}`}
          aria-pressed={onlyUnread}
          onClick={() => setOnlyUnread((value) => !value)}
        >
          {t.chats.onlyUnread(unreadTotal)}
        </button>
      </div>
      {visible.length === 0 ? (
        <p className="runs__note">{t.chats.listEmpty}</p>
      ) : (
        <ul className="chatview__list" aria-label={t.chats.listAria}>
          {visible.map((item) => {
            const last = item.messages.at(-1);
            return (
              <li key={item.driver}>
                <button type="button" className="chats__item" onClick={() => onSelect(item.driver)}>
                  <span className="chats__item-head">
                    <span className="runs__truck">{item.driver}</span>
                    <span className={`chats__channel chats__channel--${item.channel}`}>
                      {t.chats.channel[item.channel]}
                    </span>
                    {item.unread > 0 && (
                      <span className="chats__unread" aria-label={t.chats.unread(item.unread)}>
                        {item.unread}
                      </span>
                    )}
                  </span>
                  {last && (
                    <span className="chats__preview">
                      {messageTime(last.at)} · {last.text}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function Thread({ chat, onBack, onNavigate }: { chat: Chat; onBack: () => void; onNavigate?: () => void }) {
  const dispatch = useAppDispatch();
  const runs = useAppSelector((state) => state.runs.runs);
  const user = useAppSelector(selectCurrentUser);
  const [text, setText] = useState('');
  const [shown, setShown] = useState(PAGE);
  const scrollRef = useRef<HTMLOListElement>(null);
  // Высота ленты до подгрузки старых сообщений: по ней возвращаем положение прокрутки.
  const heightBefore = useRef<number | null>(null);
  const activeRun = runs.find((run) => run.driver === chat.driver && run.status !== 'Completed');

  // Открытый чат прочитан (в том числе когда пришло новое сообщение).
  useEffect(() => {
    if (chat.unread > 0) dispatch(markChatRead(chat.driver));
  }, [chat.driver, chat.unread, dispatch]);

  const messages = chat.messages.slice(-shown);
  const hidden = chat.messages.length - messages.length;

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (heightBefore.current !== null) {
      el.scrollTop = el.scrollHeight - heightBefore.current;
      heightBefore.current = null;
    } else {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length, chat.messages.length]);

  function loadOlder() {
    const el = scrollRef.current;
    if (!el || hidden <= 0) return;
    heightBefore.current = el.scrollHeight;
    setShown((value) => value + PAGE);
  }

  function send(event: React.FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    dispatch(
      sendChatMessage({
        driver: chat.driver,
        author: user?.name ?? t.common.dispatcherFallback,
        text,
        runId: activeRun?.id,
      }),
    );
    setText('');
  }

  return (
    <section className="chatview__thread" aria-label={chat.driver}>
      <div className="chats__thread-head">
        <button type="button" className="runs__button runs__button--tertiary runs__button--small" onClick={onBack}>
          {t.chats.back}
        </button>
        <span className="runs__truck">{chat.driver}</span>
      </div>
      <div className="chatview__run">
        {activeRun ? (
          <button
            type="button"
            className="runs__button runs__button--tertiary runs__button--small"
            onClick={() => {
              dispatch(openRun(activeRun.id));
              dispatch(setActiveSection('board'));
              onNavigate?.();
            }}
          >
            {t.chats.runLink(activeRun.truck)}
          </button>
        ) : (
          <span className="runs__meta">{t.chats.noRun}</span>
        )}
      </div>
      <ol
        ref={scrollRef}
        className="chatview__messages"
        onScroll={(event) => {
          if (event.currentTarget.scrollTop <= 24) loadOlder();
        }}
      >
        {chat.messages.length === 0 && <li className="runs__meta">{t.chats.threadEmpty}</li>}
        {hidden > 0 && (
          <li className="runs__meta chatview__older">
            <button type="button" className="runs__button runs__button--tertiary runs__button--small" onClick={loadOlder}>
              {t.chats.older(hidden)}
            </button>
          </li>
        )}
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </ol>
      <form className="chats__reply" onSubmit={send}>
        <input
          className="runs__input"
          placeholder={t.chats.placeholder(t.chats.channel[chat.channel])}
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        <button type="submit" className="runs__button" disabled={!text.trim()}>
          {t.chats.send}
        </button>
      </form>
    </section>
  );
}

export function MessageBubble({
  message,
  channel,
  timeLabel,
}: {
  message: ChatMessage;
  channel?: string;
  /** Overrides the formatted time, for entries that have no ISO timestamp. */
  timeLabel?: string;
}) {
  return (
    <li className={`chats__bubble chats__bubble--${message.from}`}>
      <span className="chats__bubble-meta">
        {message.author} · {timeLabel ?? messageTime(message.at)}
        {channel ? ` · ${channel}` : ''}
      </span>
      {message.text}
    </li>
  );
}

export default ChatsView;
