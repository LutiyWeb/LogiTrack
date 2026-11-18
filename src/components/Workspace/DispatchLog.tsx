import { useState } from 'react';
import { t } from '../../i18n';
import type { Run } from '../../runs/seed';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectCurrentUser } from '../../store/slices/authSlice';
import { addRunNote } from '../../store/slices/runsSlice';
import { MessageBubble } from '../Chats/Chats';
import '../Chats/Chats.scss';

function DispatchLog({ run }: { run: Run }) {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const [text, setText] = useState('');
  // Журнал — только записи диспетчера и события рейса. Переписка с водителем живёт в панели чатов.
  const feed = [...(run.notes ?? [])].sort((a, b) => (a.iso ?? '').localeCompare(b.iso ?? ''));

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
          {feed.map((note) => (
            <MessageBubble
              key={note.id}
              message={{
                id: note.id,
                from: note.author === run.driver ? 'driver' : 'dispatcher',
                author: note.author,
                at: note.iso ?? '',
                text: note.text,
              }}
              timeLabel={note.iso ? undefined : note.at}
            />
          ))}
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
