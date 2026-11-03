import { describe, expect, it } from 'vitest';
import { backhaulPreset } from '../runs/demo';
import {
  selectEnrichedRuns,
  selectFleetKpis,
  selectOpenRun,
} from './selectors/runsSelectors';
import {
  addLoad,
  applyPresetToDraft,
  openRun,
  removeLoad,
  setManualMiles,
  updateLoadStatus,
  updateRunStatus,
} from './slices/runsSlice';
import { setActiveSection, setStatusFilter } from './slices/uiSlice';
import { createAppStore, resetAllDemoData } from './store';

describe('Redux store (runsSlice, uiSlice, and selectors)', () => {
  it('initializes with 4 seeded runs and computes initial fleet KPIs', () => {
    const store = createAppStore();
    const state = store.getState();

    expect(state.runs.runs).toHaveLength(4);
    const kpis = selectFleetKpis(state);
    expect(kpis.totalRevenue).toBe(3200 + 1450 + 950 + 3050);
    expect(kpis.activeRunsCount).toBe(3);
    expect(kpis.completedRunsCount).toBe(1);
    expect(kpis.runsNeedingBackhaul.map((item) => item.run.id)).toContain(
      '214',
    );
  });

  it('opens a run, applies preset, adds load, and updates fleet KPIs', () => {
    const store = createAppStore();

    store.dispatch(openRun('214'));
    expect(selectOpenRun(store.getState())?.run.truck).toBe('Truck 214');

    store.dispatch(applyPresetToDraft(backhaulPreset));
    expect(store.getState().runs.draft.customer).toBe('Blue Ridge Logistics');

    store.dispatch(addLoad('214'));
    const updatedRun = selectOpenRun(store.getState())!;
    expect(updatedRun.run.loads).toHaveLength(2);
    expect(store.getState().runs.draft.customer).toBe('');

    const enriched214 = selectEnrichedRuns(store.getState()).find(
      (item) => item.run.id === '214',
    )!;
    expect(enriched214.emptyMiles).toBe(215);
    expect(enriched214.dollarsPerMile).toBe(3.77);
    expect(enriched214.needsBackhaul).toBe(false);
  });

  it('updates run status, load status, manual miles, and removes a load', () => {
    const store = createAppStore();
    store.dispatch(addLoad({ runId: '214', draft: backhaulPreset }));

    const run214 = store.getState().runs.runs.find((r) => r.id === '214')!;
    const addedLoadId = run214.loads[1].id;

    store.dispatch(
      updateLoadStatus({
        runId: '214',
        loadId: addedLoadId,
        status: 'In transit',
      }),
    );
    expect(
      store.getState().runs.runs.find((r) => r.id === '214')?.loads[1].status,
    ).toBe('In transit');

    store.dispatch(updateRunStatus({ runId: '214', status: 'Completed' }));
    expect(
      store.getState().runs.runs.find((r) => r.id === '214')?.status,
    ).toBe('Completed');

    store.dispatch(
      setManualMiles({ key: 'Atlanta, GA|Savannah, GA', miles: 245 }),
    );
    expect(store.getState().runs.manualMiles['Atlanta, GA|Savannah, GA']).toBe(
      245,
    );

    store.dispatch(removeLoad({ runId: '214', loadId: addedLoadId }));
    expect(
      store.getState().runs.runs.find((r) => r.id === '214')?.loads,
    ).toHaveLength(1);
  });

  it('switches UI tabs, clears draft on run change, and resets all demo state cleanly', () => {
    const store = createAppStore();
    store.dispatch(setActiveSection('overview'));
    store.dispatch(setStatusFilter('Completed'));
    store.dispatch(applyPresetToDraft(backhaulPreset));
    store.dispatch(openRun('214'));
    expect(store.getState().runs.draft.customer).toBe('');

    resetAllDemoData(store.dispatch);

    const state = store.getState();
    expect(state.ui.activeSectionId).toBe('board');
    expect(state.ui.statusFilter).toBe('All');
    expect(state.runs.openRunId).toBeNull();
  });
});
