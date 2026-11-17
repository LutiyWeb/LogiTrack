// Синхронизация по сущностям: при каждом изменении стора находим изменённые записи
// (по ссылкам, Immer сохраняет их у нетронутых) и отправляем пачкой на /api/batch.
// localStorage остаётся кэшем: без сервера приложение работает как раньше.
import { descriptors, type Collection, type RemoteData } from './entities';
import type { AppStore } from './store';

export type RemoteSnapshot = { seeded: boolean; data: RemoteData };

const BATCH_DELAY_MS = 300;
const LOAD_TIMEOUT_MS = 4000;
const enabled = import.meta.env.MODE !== 'test';

let remote: RemoteSnapshot | null = null;

export function getRemote(): RemoteSnapshot | null {
  return remote;
}

/** Тянет данные с сервера до создания стора. Нет сервера: остаётся null. */
export async function hydrateFromServer(): Promise<void> {
  if (!enabled) return;
  try {
    const res = await fetch('/api/bootstrap', { signal: AbortSignal.timeout(LOAD_TIMEOUT_MS) });
    if (!res.ok) return;
    remote = (await res.json()) as RemoteSnapshot;
  } catch {
    remote = null;
  }
}

type Op = { collection: Collection; id: string; ord?: number; data: unknown | null };
type Fetch = typeof fetch;

/** Вызывать сразу после создания стора. Вернёт функцию отписки. */
export function attachSync(
  store: AppStore,
  initial: RemoteSnapshot | null,
  fetchFn: Fetch = (...args) => fetch(...args),
): () => void {
  if (!initial) return () => undefined;

  const seen = new Map<Collection, Map<string, unknown>>();
  const ords = new Map<Collection, Map<string, number>>();
  const pending = new Map<string, Op>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let chain: Promise<unknown> = Promise.resolve();

  for (const d of descriptors) {
    seen.set(d.collection, new Map());
    ords.set(
      d.collection,
      new Map(initial.data[d.collection]?.map((doc) => [doc.id, doc.ord]) ?? []),
    );
  }
  // Сервер пуст: «видимое» пусто, поэтому первая диффовка зальёт всё текущее состояние (seed).
  if (initial.seeded) {
    for (const d of descriptors) {
      const m = seen.get(d.collection)!;
      for (const e of d.select(store.getState())) m.set(e.id, e.key ?? e.value);
    }
  }

  const ordFor = (collection: Collection, ids: string[], index: number): number => {
    const known = ords.get(collection)!;
    const prev = index > 0 ? known.get(ids[index - 1]) : undefined;
    const next = index < ids.length - 1 ? known.get(ids[index + 1]) : undefined;
    if (prev !== undefined && next !== undefined) return (prev + next) / 2;
    if (prev !== undefined) return prev + 1;
    if (next !== undefined) return next - 1;
    return index;
  };

  const flush = () => {
    timer = undefined;
    if (pending.size === 0) return;
    const ops = [...pending.values()];
    pending.clear();
    chain = chain.then(async () => {
      try {
        const res = await fetchFn('/api/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ops, markSeeded: true }),
        });
        if (!res.ok) throw new Error(String(res.status));
      } catch {
        // Не дошло: вернём в очередь, свежие правки поверх них не затираются.
        for (const op of ops) {
          const key = `${op.collection}/${op.id}`;
          if (!pending.has(key)) pending.set(key, op);
        }
        timer ??= setTimeout(flush, BATCH_DELAY_MS * 10);
      }
    });
  };

  const diff = () => {
    const state = store.getState();
    for (const d of descriptors) {
      const entries = d.select(state);
      const known = seen.get(d.collection)!;
      const ordMap = ords.get(d.collection)!;
      const ids = entries.map((e) => e.id);
      const live = new Set(ids);
      entries.forEach((e, index) => {
        const fingerprint = e.key ?? e.value;
        if (known.get(e.id) === fingerprint) return;
        const isNew = !known.has(e.id) && !ordMap.has(e.id);
        let ord: number | undefined;
        if (d.ordered && isNew) {
          ord = ordFor(d.collection, ids, index);
          ordMap.set(e.id, ord);
        }
        known.set(e.id, fingerprint);
        pending.set(`${d.collection}/${e.id}`, {
          collection: d.collection,
          id: e.id,
          ...(ord === undefined ? {} : { ord }),
          data: e.value,
        });
      });
      for (const id of [...known.keys()]) {
        if (live.has(id)) continue;
        known.delete(id);
        ordMap.delete(id);
        pending.set(`${d.collection}/${id}`, { collection: d.collection, id, data: null });
      }
    }
    if (pending.size > 0) {
      clearTimeout(timer);
      timer = setTimeout(flush, BATCH_DELAY_MS);
    }
  };

  diff(); // сервер пуст: ставит в очередь первичную заливку
  return store.subscribe(diff);
}

/** «Скинути дані»: очищает сервер; следом приходят правки сброса и заливают seed заново. */
export function resetRemote(fetchFn: Fetch = (...args) => fetch(...args)): Promise<unknown> {
  if (!enabled || !remote) return Promise.resolve();
  return fetchFn('/api/reset', { method: 'DELETE' }).catch(() => undefined);
}
