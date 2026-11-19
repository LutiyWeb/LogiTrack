import { assessAssignment } from '../operations/dispatch';
import { sameLoad } from '../inbox/identity';
import { findDuplicate } from '../inbox/inbox';
import { bookRateCon, type BookRateConPayload } from './slices/runsSlice';
import type { AppDispatch, RootState } from './store';

export function bookingConflict(
  state: Pick<RootState, 'runs' | 'inbox' | 'operations'>,
  payload: BookRateConPayload,
): string | null {
  const { target, draft, inboxId } = payload;
  if (
    'auth' in state &&
    (state as RootState).auth.currentUser?.role === 'driver'
  )
    return 'Призначення вантажів доступне лише диспетчеру або менеджеру.';
  const item = state.inbox.items.find((entry) => entry.id === inboxId);
  if (inboxId && (!item || !['New', 'Ready'].includes(item.status)))
    return 'Вантаж уже призначено або він більше не доступний у черзі.';
  const existing = state.runs.runs.find((run) =>
    run.loads.some((load) => sameLoad(load, draft)),
  );
  if (existing)
    return `Цей вантаж брокера вже є в рейсі ${existing.truck}. Повторне призначення заблоковано.`;
  if (
    findDuplicate(
      state.inbox.items,
      {
        ...(item ?? {
          id: '',
          source: 'manual',
          status: 'New',
          receivedAt: '',
          found: [],
          warnings: [],
          unrecognized: false,
        }),
        draft,
      },
      inboxId,
    )
  )
    return 'Такий вантаж уже є в черзі. Відкрийте початковий запис або збережіть нову версію RateCon.';
  if (target.kind === 'existing') {
    const run = state.runs.runs.find((entry) => entry.id === target.runId);
    if (!run || run.status === 'Completed')
      return 'Обраний рейс уже завершено або видалено.';
  } else if (
    state.runs.runs.some(
      (run) =>
        run.id === target.runId ||
        (run.truck === target.truck && run.status !== 'Completed'),
    )
  )
    return 'Тягач уже зайнятий. Оновіть призначення.';
  const assessment = assessAssignment(
    state.runs.runs,
    state.operations.assets,
    state.runs.manualMiles,
    payload,
    state.operations.eld,
  );
  return assessment.errors[0] ?? null;
}

/** Check the current store again at submission, not the form's earlier render. */
export const assignRateCon =
  (payload: BookRateConPayload) =>
  (dispatch: AppDispatch, getState: () => RootState) => {
    const error = bookingConflict(getState(), payload);
    if (error) return { ok: false as const, error };
    dispatch(bookRateCon(payload));
    return { ok: true as const };
  };
