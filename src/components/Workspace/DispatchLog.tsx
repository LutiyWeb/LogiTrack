import { useState } from 'react';
import { t } from '../../i18n';
import type { Run } from '../../runs/demo';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectCurrentUser } from '../../store/slices/authSlice';
import { addRunNote } from '../../store/slices/runsSlice';
import { MessageBubble } from '../Chats/Chats';
import '../Chats/Chats.scss';

function DispatchLog({ run }: { run: Run }) {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const [text, setText] = useState('');
  const notes = run.notes ?? [];
  const chat = useAppSelector((state) =>
    state.chats.chats.find((item) => item.driver === run.driver),
  );
  // Лента рейса: записи журнала и сообщения водителя по этому рейсу, по времени.
  const feed = [
    ...notes.map((note) => ({ kind: 'note' as const, key: note.iso ?? '', note })),
    ...(chat?.messages ?? [])
      .filter((message) => message.runId === run.id)
      .map((message) => ({ kind: 'message' as const, key: message.at, message })),
  ].sort((a, b) => a.key.localeCompare(b.key));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    dispatch(
      addRunNote({
        runId: run.id,
        author: currentUser?.name ?? t.common.dispatcherFallback,
        roleTitle: currentUser?.roleTitle ?? t.common.dispatchFallbackRole,
        text,
      }),
    );
    setText('');
  }

  return (
    <section className="runs__block" aria-label={t.dispatchLog.aria}>
      <h2 className="runs__subtitle">{t.dispatchLog.title}</h2>
      {feed.length > 0 && (
        <ul className="runs__loads">
          {feed.map((item) =>
            item.kind === 'message' ? (
              <MessageBubble
                key={item.message.id}
                message={item.message}
                channel={chat ? t.chats.channel[chat.channel] : undefined}
              />
            ) : (
              <li key={item.note.id} className="runs__load">
                <div className="runs__load-head">
                  <span className="runs__truck">{item.note.author}</span>
                  <span className="runs__meta">
                    {item.note.roleTitle} · {item.note.at}
                  </span>
                </div>
                <p className="runs__meta">{item.note.text}</p>
              </li>
            ),
          )}
        </ul>
      )}
      <form className="runs__load-actions" onSubmit={handleSubmit}>
        <input
          className="runs__input"
          placeholder={t.dispatchLog.placeholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button
          type="submit"
          className="runs__button runs__button--secondary runs__button--small"
          disabled={!text.trim()}
        >
          {t.dispatchLog.post}
        </button>
      </form>
    </section>
  );
}

export default DispatchLog;
