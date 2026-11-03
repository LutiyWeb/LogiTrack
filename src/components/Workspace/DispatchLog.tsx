import { useState } from 'react';
import type { Run } from '../../runs/demo';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectCurrentUser } from '../../store/slices/authSlice';
import { addRunNote } from '../../store/slices/runsSlice';

function DispatchLog({ run }: { run: Run }) {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const [text, setText] = useState('');
  const notes = run.notes ?? [];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    dispatch(
      addRunNote({
        runId: run.id,
        author: currentUser?.name ?? 'Dispatcher',
        roleTitle: currentUser?.roleTitle ?? 'Dispatch',
        text,
      }),
    );
    setText('');
  }

  return (
    <section className="runs__block" aria-label="Dispatch log">
      <h2 className="runs__subtitle">Check-calls & dispatch log</h2>
      {notes.length > 0 && (
        <ul className="runs__loads">
          {notes.map((note) => (
            <li key={note.id} className="runs__load">
              <div className="runs__load-head">
                <span className="runs__truck">{note.author}</span>
                <span className="runs__meta">
                  {note.roleTitle} · {note.at}
                </span>
              </div>
              <p className="runs__meta">{note.text}</p>
            </li>
          ))}
        </ul>
      )}
      <form className="runs__load-actions" onSubmit={handleSubmit}>
        <input
          className="runs__input"
          placeholder="Log check-call, dock # or broker note..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button
          type="submit"
          className="runs__button runs__button--small"
          disabled={!text.trim()}
        >
          Post note
        </button>
      </form>
    </section>
  );
}

export default DispatchLog;
