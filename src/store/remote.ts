// Синхронизация снимка состояния с сервером (/api/state). localStorage остаётся кэшем:
// если сервер недоступен, приложение работает как раньше.
// Поднимать версию, когда меняется форма сохранённого состояния.
export const STORAGE_KEY = 'logitrack_state_v10';

const URL = '/api/state';
const SAVE_DELAY_MS = 400;
const LOAD_TIMEOUT_MS = 4000;

const enabled = import.meta.env.MODE !== 'test';

let timer: ReturnType<typeof setTimeout> | undefined;

/** Тянет состояние с сервера в localStorage до создания стора. Пусто на сервере — заливает локальное. */
export async function hydrateFromServer(): Promise<void> {
  if (!enabled) return;
  try {
    const res = await fetch(URL, { signal: AbortSignal.timeout(LOAD_TIMEOUT_MS) });
    if (!res.ok) return;
    const { state } = (await res.json()) as { state: unknown | null };
    if (state) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return;
    }
    const local = window.localStorage.getItem(STORAGE_KEY);
    if (local) await put(JSON.parse(local));
  } catch {
    // Сервера нет — работаем из localStorage.
  }
}

function put(state: unknown) {
  return fetch(URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state }),
  });
}

export function scheduleRemoteSave(state: unknown) {
  if (!enabled) return;
  clearTimeout(timer);
  timer = setTimeout(() => {
    put(state).catch(() => undefined);
  }, SAVE_DELAY_MS);
}

export function clearRemoteState() {
  if (!enabled) return;
  clearTimeout(timer);
  fetch(URL, { method: 'DELETE' }).catch(() => undefined);
}
