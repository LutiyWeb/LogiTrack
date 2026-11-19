import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createWorkspaceService } from '../../server/workspace';
import { validateSnapshot } from '../../server/validation';
import { createAppStore } from '../store/store';
import { loginAsUser } from '../store/slices/authSlice';
import { businessSnapshot } from '../store/workspaceState';
import { connectWorkspace } from '../store/workspaceSync';
import { updateCarrierTargets } from '../store/slices/uiSlice';
import { recordPayment } from '../store/payments';
import { invoiceBalance } from '../billing/billing';

const directories: string[] = [];
afterEach(async () => {
  vi.useRealTimers();
  for (const directory of directories.splice(0))
    await rm(directory, { recursive: true, force: true });
});
function manager() {
  const store = createAppStore();
  store.dispatch(loginAsUser('manager'));
  return store;
}
function response(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('shared review workspace — persistence and concurrent writers', () => {
  it('only one of two dispatchers can commit the same base revision, and a restart keeps the winning data', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'logitrack-audit-'));
    directories.push(directory);
    const service = createWorkspaceService(directory);
    const snapshot = businessSnapshot(manager().getState());
    const results = await Promise.all([
      service.update(0, snapshot),
      service.update(0, {
        ...snapshot,
        settings: { ...snapshot.settings, targetRatePerMile: 9 },
      }),
    ]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.filter((result) => !result.ok)[0].value.revision).toBe(1);
    expect(
      (await createWorkspaceService(directory).read()).snapshot?.settings,
    ).toEqual(snapshot.settings);
    const copy = await service.read();
    copy.snapshot!.settings = {};
    expect((await service.read()).snapshot?.settings).toEqual(
      snapshot.settings,
    );
  });
  it('rejects duplicate assignments and overpaid invoices before changing the persisted revision', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'logitrack-audit-'));
    directories.push(directory);
    const service = createWorkspaceService(directory);
    const snapshot = structuredClone(businessSnapshot(manager().getState()));
    await service.update(0, snapshot);
    const duplicate = structuredClone(snapshot);
    duplicate.runs.runs[1].loads.push({
      ...duplicate.runs.runs[0].loads[0],
      id: 'duplicate',
    });
    await expect(service.update(1, duplicate)).rejects.toThrow(/двічі/);
    expect((await service.read()).revision).toBe(1);
    const overpaid = structuredClone(snapshot);
    overpaid.runs.invoices[0].payments.push({
      id: 'bad-payment',
      amountCents: 95001,
      date: '2026-10-28',
      method: 'Bank transfer',
      reference: 'bad',
      recordedBy: 'test',
    });
    expect(() => validateSnapshot(overpaid)).toThrow(/перевищує/);
  });
  it('the sync client uploads once, ignores navigation/toast changes and keeps the local role', async () => {
    vi.useFakeTimers();
    const store = manager();
    let remote = {
      revision: 1,
      snapshot: structuredClone(businessSnapshot(store.getState())),
    };
    let writes = 0;
    const fetcher: typeof fetch = vi.fn(async (_url, init) => {
      if (init?.method === 'PUT') {
        writes++;
        const value = JSON.parse(String(init.body));
        remote = { revision: remote.revision + 1, snapshot: value.snapshot };
      }
      return response(remote);
    });
    const stop = await connectWorkspace(store, fetcher);
    store.dispatch(updateCarrierTargets({ targetRatePerMile: 4 }));
    await vi.advanceTimersByTimeAsync(200);
    await vi.advanceTimersByTimeAsync(2000);
    expect(writes).toBe(1);
    expect(remote.snapshot.settings.targetRatePerMile).toBe(4);
    expect(store.getState().auth.currentUser?.role).toBe('manager');
    stop();
  });
  it('a stale writer receives the current snapshot instead of silently overwriting the other dispatcher', async () => {
    vi.useFakeTimers();
    const store = manager();
    let remote = {
      revision: 1,
      snapshot: structuredClone(businessSnapshot(store.getState())),
    };
    const fetcher: typeof fetch = vi.fn(async (_url, init) => {
      if (init?.method === 'PUT') {
        const value = JSON.parse(String(init.body));
        if (value.revision !== remote.revision) return response(remote, 409);
        remote = { revision: remote.revision + 1, snapshot: value.snapshot };
      }
      return response(remote);
    });
    const stop = await connectWorkspace(store, fetcher);
    remote = {
      revision: 2,
      snapshot: {
        ...remote.snapshot,
        settings: { ...remote.snapshot.settings, targetRatePerMile: 5 },
      },
    };
    store.dispatch(updateCarrierTargets({ targetRatePerMile: 4 }));
    await vi.advanceTimersByTimeAsync(200);
    expect(store.getState().ui.targetRatePerMile).toBe(5);
    expect(remote.snapshot.settings.targetRatePerMile).toBe(5);
    expect(
      store
        .getState()
        .toasts.some((toast) => toast.text.includes('Інший диспетчер')),
    ).toBe(true);
    stop();
  });
  it('a lost successful response is retried without duplicating a $400 payment', async () => {
    vi.useFakeTimers();
    const store = manager();
    let remote = {
      revision: 1,
      snapshot: structuredClone(businessSnapshot(store.getState())),
    };
    let lost = false;
    const fetcher: typeof fetch = vi.fn(async (_url, init) => {
      if (init?.method === 'PUT') {
        const value = JSON.parse(String(init.body));
        if (value.revision !== remote.revision) return response(remote, 409);
        remote = { revision: remote.revision + 1, snapshot: value.snapshot };
        if (!lost) {
          lost = true;
          throw new Error('Connection lost after commit');
        }
      }
      return response(remote);
    });
    const stop = await connectWorkspace(store, fetcher);
    const invoice = store.getState().runs.invoices[0];
    store.dispatch(
      recordPayment(
        invoice.id,
        {
          amount: '400',
          date: '2026-10-28',
          method: 'Bank transfer',
          reference: 'BANK-400',
        },
        'lost-response',
        'Sarah',
      ),
    );
    await vi.advanceTimersByTimeAsync(2200);
    expect(remote.snapshot.runs.invoices[0].payments).toHaveLength(1);
    expect(invoiceBalance(store.getState().runs.invoices[0])).toBe(55000);
    expect(store.getState().ui.workspaceSync).toBe('shared');
    stop();
  });
  it('does not repeatedly submit a rejected snapshot, and retries after a new business edit', async () => {
    vi.useFakeTimers();
    const store = manager();
    const remote = {
      revision: 1,
      snapshot: structuredClone(businessSnapshot(store.getState())),
    };
    let writes = 0;
    const fetcher: typeof fetch = vi.fn(async (_url, init) => {
      if (init?.method === 'PUT') {
        writes++;
        return response({ error: 'Некоректні дані рахунку.' }, 422);
      }
      return response(remote);
    });
    const stop = await connectWorkspace(store, fetcher);
    store.dispatch(updateCarrierTargets({ targetRatePerMile: 4 }));
    await vi.advanceTimersByTimeAsync(5000);
    expect(writes).toBe(1);
    expect(store.getState().ui.workspaceSync).toBe('error');
    expect(
      store
        .getState()
        .toasts.some((toast) => toast.text === 'Некоректні дані рахунку.'),
    ).toBe(true);
    store.dispatch(updateCarrierTargets({ targetRatePerMile: 5 }));
    await vi.advanceTimersByTimeAsync(200);
    expect(writes).toBe(2);
    stop();
  });
});
