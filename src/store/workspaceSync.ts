import {
  businessSnapshot,
  hydrateBusiness,
  type BusinessSnapshot,
} from './workspaceState';
import type { AppStore } from './store';
import { setWorkspaceSync } from './slices/uiSlice';
import { showToast } from './slices/toastsSlice';

type Remote = { revision: number; snapshot: BusinessSnapshot | null };
export async function connectWorkspace(
  store: AppStore,
  fetcher: typeof fetch = fetch,
) {
  let revision = 0;
  let applying = false;
  let busy = false;
  let stopped = false;
  let last = JSON.stringify(businessSnapshot(store.getState()));
  let pending: BusinessSnapshot | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const apply = (remote: Remote) => {
    revision = remote.revision;
    if (remote.snapshot) {
      applying = true;
      store.dispatch(hydrateBusiness(remote.snapshot));
      applying = false;
      last = JSON.stringify(businessSnapshot(store.getState()));
    }
  };
  try {
    const response = await fetcher('/api/workspace', {
      signal: AbortSignal.timeout(3000),
      cache: 'no-store',
    });
    if (
      !response.ok ||
      !response.headers.get('content-type')?.includes('application/json')
    ) {
      store.dispatch(setWorkspaceSync('local'));
      return () => undefined;
    }
    const remote = (await response.json()) as Remote;
    if (!Number.isSafeInteger(remote.revision))
      throw new Error('Invalid workspace revision');
    apply(remote);
    if (!remote.snapshot) pending = businessSnapshot(store.getState());
    store.dispatch(setWorkspaceSync('shared'));
  } catch {
    store.dispatch(setWorkspaceSync('local'));
    return () => undefined;
  }

  const flush = async () => {
    timer = undefined;
    if (busy || !pending || stopped) return;
    busy = true;
    const snapshot = pending;
    pending = null;
    try {
      const response = await fetcher('/api/workspace', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revision, snapshot }),
        signal: AbortSignal.timeout(5000),
      });
      if (response.status === 409) {
        const remote = (await response.json()) as Remote;
        if (JSON.stringify(remote.snapshot) === JSON.stringify(snapshot)) {
          revision = remote.revision;
          last = JSON.stringify(snapshot);
        } else {
          pending = null;
          apply(remote);
          store.dispatch(
            showToast(
              'warning',
              'Інший диспетчер уже змінив ці дані. Завантажено актуальну версію; перевірте призначення та повторіть свою дію.',
            ),
          );
        }
      } else if (response.ok) {
        const remote = (await response.json()) as Remote;
        revision = remote.revision;
        last = JSON.stringify(snapshot);
      } else if (response.status === 422) {
        const error = (await response.json()) as { error?: string };
        // Retain the local edit for correction, but never retry a rejected
        // snapshot in a loop. A subsequent business edit can be submitted again.
        last = JSON.stringify(snapshot);
        store.dispatch(setWorkspaceSync('error'));
        store.dispatch(
          showToast(
            'error',
            error.error ||
              'Дані не пройшли перевірку. Виправте зміни та повторіть дію.',
          ),
        );
        return;
      } else {
        const error = (await response.json()) as { error?: string };
        throw new Error(error.error || 'Не вдалося зберегти зміни.');
      }
      store.dispatch(setWorkspaceSync('shared'));
    } catch {
      pending ??= snapshot;
      store.dispatch(setWorkspaceSync('error'));
    } finally {
      busy = false;
      if (pending && !stopped) timer = setTimeout(() => void flush(), 1500);
    }
  };
  const unsubscribe = store.subscribe(() => {
    if (applying) return;
    const snapshot = businessSnapshot(store.getState());
    if (JSON.stringify(snapshot) === last && !pending) return;
    // UI/toast actions do not change the business snapshot.
    if (pending && JSON.stringify(pending) === JSON.stringify(snapshot)) return;
    pending = snapshot;
    if (!busy) {
      clearTimeout(timer);
      timer = setTimeout(() => void flush(), 150);
    }
  });
  if (pending) timer = setTimeout(() => void flush(), 0);
  const polling = setInterval(async () => {
    if (busy || pending || stopped) return;
    try {
      const response = await fetcher('/api/workspace', {
        cache: 'no-store',
        signal: AbortSignal.timeout(3000),
      });
      if (!response.ok) return;
      const remote = (await response.json()) as Remote;
      if (remote.revision > revision && !busy && !pending) apply(remote);
    } catch {
      /* Local changes remain persisted and the next poll can reconnect. */
    }
  }, 1500);
  return () => {
    stopped = true;
    clearTimeout(timer);
    clearInterval(polling);
    unsubscribe();
  };
}
