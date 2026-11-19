import { describe, expect, it } from 'vitest';
import { newRunId } from '../runs/seed';
import { selectBrokerSummaries } from './selectors/runsSelectors';
import {
  addLoad,
  addLoadDetention,
  advanceLoadBilling,
  updateLoadStatus,
  updateRunStatus,
} from './slices/runsSlice';
import { backhaulPreset } from '../runs/seed';
import { loginAsUser } from './slices/authSlice';
import { reviewPod } from './slices/operationsSlice';
import { createAppStore } from './store';

function invoicedStore() {
  const store = createAppStore();
  store.dispatch(loginAsUser('manager'));
  store.dispatch(
    reviewPod({
      documentId: 'pod-hart',
      runId: '214',
      loadId: 'hart',
      author: 'Sarah',
    }),
  );
  store.dispatch(advanceLoadBilling({ runId: '214', loadId: 'hart' }));
  return store;
}

describe('runs: invoicing, completed runs and run ids', () => {
  it('does not roll a load status back after the invoice is issued', () => {
    const store = invoicedStore();
    store.dispatch(
      updateLoadStatus({ runId: '214', loadId: 'hart', status: 'Assigned' }),
    );
    const load = store.getState().runs.runs.find((run) => run.id === '214')!
      .loads[0];
    expect(load.status).toBe('Delivered');
    expect(load.billingStatus).toBe('Invoiced');
  });

  it('keeps the invoiced amount when detention is added later', () => {
    const store = invoicedStore();
    store.dispatch(
      addLoadDetention({
        runId: '214',
        loadId: 'hart',
        amount: 150,
        author: 'A',
        roleTitle: 'B',
      }),
    );
    const hart = selectBrokerSummaries(store.getState()).find((item) =>
      item.customer.includes('Hart'),
    )!;
    expect(hart.invoicedRevenue).toBe(3200);
    expect(hart.pendingRevenue).toBe(150);
  });

  it('does not add a load to a completed run', () => {
    const store = createAppStore();
    store.dispatch(updateRunStatus({ runId: '107', status: 'Completed' }));
    const before = store.getState().runs.runs.find((run) => run.id === '107')!
      .loads.length;
    store.dispatch(addLoad({ runId: '107', draft: backhaulPreset }));
    expect(
      store.getState().runs.runs.find((run) => run.id === '107')!.loads,
    ).toHaveLength(before);
  });

  it('names a new run after its truck number unless that run already exists', () => {
    expect(newRunId('Тягач 412', [{ id: '214' }])).toBe('412');
    expect(newRunId('Тягач 214', [{ id: '214' }])).not.toBe('214');
  });
});
