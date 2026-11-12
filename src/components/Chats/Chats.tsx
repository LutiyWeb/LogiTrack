import { useState } from 'react';
import { messageTime, type ChatMessage } from '../../chats/chats';
import { t } from '../../i18n';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectCurrentUser } from '../../store/slices/authSlice';
import { markChatRead, sendChatMessage } from '../../store/slices/chatsSlice';
import { openRun } from '../../store/slices/runsSlice';
import { setActiveSection } from '../../store/slices/uiSlice';
import '../Workspace/Workspace.scss';
import './Chats.scss';

function Chats() {
  const dispatch = useAppDispatch();
  const chats = useAppSelector((state) => state.chats.chats);
  const runs = useAppSelector((state) => state.runs.runs);
  const user = useAppSelector(selectCurrentUser);
  const [selected, setSelected] = useState(chats[0]?.driver ?? '');
  const [text, setText] = useState('');

  const chat = chats.find((item) => item.driver === selected);
  const activeRun = runs.find((run) => run.driver === selected && run.status !== 'Completed');

  function open(driver: string) {
    setSelected(driver);
    setText('');
    dispatch(markChatRead(driver));
  }

  function send(event: React.FormEvent) {
    event.preventDefault();
    if (!chat || !text.trim()) return;
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
    <div className="runs">
      <header className="runs__heading">
        <div>
          <h1 className="workspace__title">{t.chats.title}</h1>
          <p className="runs__meta">{t.chats.subtitle}</p>
        </div>
      </header>

      <div className="chats">
        <ul className="chats__list" aria-label={t.chats.listAria}>
          {chats.map((item) => {
            const last = item.messages.at(-1);
            return (
              <li key={item.driver}>
                <button
                  type="button"
                  className={item.driver === selected ? 'chats__item is-active' : 'chats__item'}
                  onClick={() => open(item.driver)}
                >
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

        <section className="chats__thread" aria-label={chat?.driver ?? t.chats.pick}>
          {!chat ? (
            <p className="runs__meta">{t.chats.pick}</p>
          ) : (
            <>
              <div className="chats__thread-head">
                <span className="runs__truck">{chat.driver}</span>
                {activeRun ? (
                  <button
                    type="button"
                    className="runs__button runs__button--tertiary runs__button--small"
                    onClick={() => {
                      dispatch(openRun(activeRun.id));
                      dispatch(setActiveSection('board'));
                    }}
                  >
                    {t.chats.runLink(activeRun.truck)}
                  </button>
                ) : (
                  <span className="runs__meta">{t.chats.noRun}</span>
                )}
              </div>
              <ol className="chats__messages">
                {chat.messages.map((message) => (
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
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export function MessageBubble({ message, channel }: { message: ChatMessage; channel?: string }) {
  return (
    <li className={`chats__bubble chats__bubble--${message.from}`}>
      <span className="chats__bubble-meta">
        {message.author} · {messageTime(message.at)}
        {channel ? ` · ${channel}` : ''}
      </span>
      {message.text}
    </li>
  );
}

export default Chats;
