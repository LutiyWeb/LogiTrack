import { afterEach, describe, expect, it, vi } from 'vitest';
import { addInboxLoad } from './slices/inboxSlice';
import { addReminder } from './slices/plannerSlice';
import { updateCarrierTargets } from './slices/uiSlice';
import { applyRemote, descriptors, type RemoteData } from './entities';
import { createAppStore } from './store';
import { attachSync, type RemoteSnapshot } from './sync';

const empty = (): RemoteData => ({
  runs: [],
  inbox: [],
  chats: [],
  reminders: [],
  brokerThreads: [],
  settings: [],
});

function setup(snapshot: RemoteSnapshot) {
  vi.useFakeTimers();
  const store = createAppStore();
  const fetchFn = vi.fn(async (_url: string, _init?: RequestInit) => new Response('{"ok":true}', { status: 200 }));
  attachSync(store, snapshot, fetchFn as unknown as typeof fetch);
  const sent = () =>
    fetchFn.mock.calls.flatMap(
      ([, init]) => JSON.parse(init!.body as string).ops as Array<Record<string, unknown>>,
    );
  return { store, fetchFn, sent };
}

describe('синхронизация по сущностям', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('на пустом сервере заливает всё состояние как отдельные записи', async () => {
    const { store, fetchFn, sent } = setup({ seeded: false, data: empty() });
    await vi.advanceTimersByTimeAsync(400);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn.mock.calls[0][0]).toBe('/api/batch');
    const ops = sent();
    const runs = store.getState().runs.runs;
    expect(ops.filter((op) => op.collection === 'runs')).toHaveLength(runs.length);
    expect(ops.some((op) => op.collection === 'settings' && op.id === 'finance')).toBe(true);
    // Сервер принимает только объекты, не массивы и не примитивы.
    for (const op of ops) {
      expect(op.data !== null && typeof op.data === 'object' && !Array.isArray(op.data)).toBe(true);
    }
    expect(ops.some((op) => op.collection === 'brokerThreads')).toBe(true);
  });

  it('на засеянном сервере шлёт только изменённую запись', async () => {
    const { store, fetchFn, sent } = setup({ seeded: true, data: empty() });
    await vi.advanceTimersByTimeAsync(400);
    expect(fetchFn).not.toHaveBeenCalled();

    store.dispatch(addReminder({ date: '2026-11-20', text: 'Позвонить брокеру' }));
    await vi.advanceTimersByTimeAsync(400);
    const ops = sent();
    expect(ops).toHaveLength(1);
    expect(ops[0]).toMatchObject({ collection: 'reminders', data: { text: 'Позвонить брокеру' } });

    fetchFn.mockClear();
    store.dispatch(updateCarrierTargets({ targetRatePerMile: 3.5 }));
    await vi.advanceTimersByTimeAsync(400);
    expect(sent()).toEqual([
      expect.objectContaining({ collection: 'settings', id: 'ui', data: expect.objectContaining({ targetRatePerMile: 3.5 }) }),
    ]);
  });

  it('новая запись сверху получает ord меньше первой', async () => {
    const { store, sent } = setup({ seeded: true, data: empty() });
    const first = store.getState().inbox.items[0];
    // Известные ord приходят с сервера; здесь проверяем только вычисление для новой записи.
    const snapshot = empty();
    snapshot.inbox = store.getState().inbox.items.map((item, i) => ({ id: item.id, ord: i, data: item }));
    const store2 = createAppStore();
    vi.useFakeTimers();
    const calls: unknown[] = [];
    attachSync(store2, { seeded: true, data: snapshot }, (async (_url: string, init: RequestInit) => {
      calls.push(JSON.parse(init.body as string));
      return new Response('{"ok":true}');
    }) as unknown as typeof fetch);
    store2.dispatch(addInboxLoad({ ...first, id: 'new-1' }));
    await vi.advanceTimersByTimeAsync(400);
    const op = (calls[0] as { ops: Array<{ id: string; ord: number }> }).ops.find((o) => o.id === 'new-1')!;
    expect(op.id).toBe('new-1');
    expect(op.ord).toBe(-1);
    expect(sent()).toEqual([]);
  });

  it('применяет данные сервера поверх локального состояния', () => {
    const store = createAppStore();
    const base = store.getState();
    const remote = empty();
    remote.reminders = [{ id: 'r1', ord: 0, data: { id: 'r1', date: '2026-11-18', text: 'С сервера', done: false } }];
    remote.settings = [{ id: 'ui', ord: 0, data: { targetRatePerMile: 4.2 } }];
    const next = applyRemote(base, remote);
    expect(next.planner.reminders).toEqual([{ id: 'r1', date: '2026-11-18', text: 'С сервера', done: false }]);
    expect(next.ui.targetRatePerMile).toBe(4.2);
    expect(next.ui.activeSectionId).toBe(base.ui.activeSectionId);
    expect(next.runs.runs).toBe(base.runs.runs);
    remote.brokerThreads = [{ id: '214', ord: 0, data: { messages: [] } }];
    expect(applyRemote(base, remote).broker.threads).toEqual({ '214': [] });
    expect(descriptors.map((d) => d.collection)).toContain('brokerThreads');
  });
});
