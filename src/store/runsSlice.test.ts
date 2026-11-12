import { describe, expect, it } from 'vitest';
import { backhaulPreset, emptyDraft } from '../runs/demo';
import {
  selectBrokerSummaries,
  selectEnrichedRuns,
  selectFilteredRuns,
  selectFleetKpis,
  selectOpenRun,
} from './selectors/runsSelectors';
import {
  loginAsDemoUser,
  loginWithCredentials,
  logout,
  selectCurrentUser,
  selectPermissions,
} from './slices/authSlice';
import {
  addLoad,
  addLoadDetention,
  addRunNote,
  advanceLoadBilling,
  applyPresetToDraft,
  bookRateCon,
  invoiceCustomerLoads,
  openRun,
  removeLoad,
  setManualMiles,
  updateLoadStatus,
  updateRunStatus,
} from './slices/runsSlice';
import { setActiveSection, setStatusFilter } from './slices/uiSlice';
import { createAppStore, resetAllDemoData } from './store';

describe('Redux store (runsSlice, uiSlice, authSlice, and selectors)', () => {
  it('initializes with 4 seeded runs and computes initial fleet KPIs and Net Profit', () => {
    const store = createAppStore();
    const state = store.getState();

    expect(state.runs.runs).toHaveLength(4);
    const kpis = selectFleetKpis(state);
    expect(kpis.totalRevenue).toBe(3200 + 1450 + 950 + 3050);
    expect(kpis.totalNetProfit).toBe(
      kpis.totalRevenue - kpis.totalOperatingCost,
    );
    expect(kpis.activeRunsCount).toBe(3);
    expect(kpis.completedRunsCount).toBe(1);
    expect(kpis.runsNeedingBackhaul.map((item) => item.run.id)).toEqual([
      '214',
      '118',
      '305',
    ]);
  });

  it('calculates operatingCost ($1,791 -> $1,784) and netProfit ($1,409 -> $3,516) when backhaul is added to Truck 214', () => {
    const store = createAppStore();

    store.dispatch(openRun('214'));
    const before = selectOpenRun(store.getState())!;
    expect(before.run.truck).toBe('Тягач 214');
    expect(before.run.status).toBe('Empty return');
    expect(before.operatingCost).toBe(1791);
    expect(before.netProfit).toBe(1409);

    store.dispatch(applyPresetToDraft(backhaulPreset));
    expect(store.getState().runs.draft.customer).toBe('Blue Ridge Logistics');

    store.dispatch(addLoad('214'));
    const after = selectOpenRun(store.getState())!;
    expect(after.run.loads).toHaveLength(2);
    expect(after.run.status).toBe('In transit');
    expect(store.getState().runs.draft.customer).toBe('');

    const enriched214 = selectEnrichedRuns(store.getState()).find(
      (item) => item.run.id === '214',
    )!;
    expect(enriched214.emptyMiles).toBe(215);
    expect(enriched214.dollarsPerMile).toBe(3.77);
    expect(enriched214.operatingCost).toBe(1784);
    expect(enriched214.netProfit).toBe(3516);
    expect(enriched214.needsBackhaul).toBe(false);
  });

  it('updates run status, load status, POD/invoice billing workflow, dispatch notes, and removes a load', () => {
    const store = createAppStore();
    store.dispatch(addLoad({ runId: '214', draft: backhaulPreset }));

    const run214 = store.getState().runs.runs.find((r) => r.id === '214')!;
    const addedLoadId = run214.loads[1].id;

    store.dispatch(
      updateLoadStatus({
        runId: '214',
        loadId: addedLoadId,
        status: 'Delivered',
      }),
    );
    expect(
      store.getState().runs.runs.find((r) => r.id === '214')?.loads[1]
        .billingStatus,
    ).toBe('POD required');

    store.dispatch(advanceLoadBilling({ runId: '214', loadId: 'hart' }));
    expect(
      store.getState().runs.runs.find((r) => r.id === '214')?.loads[0]
        .billingStatus,
    ).toBe('POD received');

    store.dispatch(advanceLoadBilling({ runId: '214', loadId: 'hart' }));
    expect(
      store.getState().runs.runs.find((r) => r.id === '214')?.loads[0]
        .billingStatus,
    ).toBe('Invoiced');

    store.dispatch(
      addRunNote({
        runId: '214',
        author: 'Marcus Hill',
        roleTitle: 'Driver · Truck 214',
        text: 'POD signed at dock 14',
      }),
    );
    expect(
      store.getState().runs.runs.find((r) => r.id === '214')?.notes,
    ).toHaveLength(3);

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

  it('adds $150 detention fee with log note, and aggregates broker summaries', () => {
    const store = createAppStore();

    const initialHart = selectBrokerSummaries(store.getState()).find(
      (b) => b.customer === 'Hart Freight',
    )!;
    expect(initialHart.totalRevenue).toBe(3200);
    expect(initialHart.invoicedRevenue).toBe(0);
    expect(initialHart.pendingRevenue).toBe(3200);

    store.dispatch(
      addLoadDetention({
        runId: '214',
        loadId: 'hart',
        amount: 150,
        author: 'Alex Mercer',
        roleTitle: 'Senior Fleet Dispatcher',
      }),
    );

    const run214 = store.getState().runs.runs.find((r) => r.id === '214')!;
    expect(run214.loads[0].rate).toBe(3350);
    expect(run214.loads[0].detentionFee).toBe(150);
    expect(run214.notes?.at(-1)?.text).toContain('Додано $150 за простій');

    store.dispatch(advanceLoadBilling({ runId: '214', loadId: 'hart' }));
    store.dispatch(invoiceCustomerLoads('Hart Freight'));

    const billedHart = selectBrokerSummaries(store.getState()).find(
      (b) => b.customer === 'Hart Freight',
    )!;
    expect(billedHart.kind).toBe('Broker');
    expect(billedHart.totalRevenue).toBe(3350);
    expect(billedHart.invoicedRevenue).toBe(3350);
    expect(billedHart.pendingRevenue).toBe(0);
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

  it('authenticates users, filters runs for assigned driver, and maps role permissions', () => {
    const store = createAppStore();
    expect(selectCurrentUser(store.getState())).toBeNull();

    store.dispatch(
      loginWithCredentials({ email: 'alex@logitrack.demo', password: 'wrong' }),
    );
    expect(store.getState().auth.loginError).toBe('Невірний email або пароль');

    store.dispatch(
      loginWithCredentials({
        email: '  ALEX@logitrack.demo ',
        password: 'demo123',
      }),
    );
    expect(selectCurrentUser(store.getState())?.role).toBe('dispatcher');
    expect(selectFilteredRuns(store.getState())).toHaveLength(4);
    expect(selectPermissions(store.getState())).toEqual({
      canViewOverview: true,
      canManageLoads: true,
      canUpdateRunStatus: true,
      canUpdateLoadStatus: true,
      canEditTargets: false,
      canViewFinance: false,
    });

    store.dispatch(loginAsDemoUser('manager'));
    expect(selectPermissions(store.getState()).canEditTargets).toBe(true);

    store.dispatch(loginAsDemoUser('driver'));
    expect(selectPermissions(store.getState()).canViewOverview).toBe(false);
    expect(selectPermissions(store.getState()).canManageLoads).toBe(false);
    expect(
      selectFilteredRuns(store.getState()).map((item) => item.run.id),
    ).toEqual(['214']);

    store.dispatch(logout());
    expect(selectCurrentUser(store.getState())).toBeNull();
  });

  it('books a rate con as a new run with routed empty miles and a log note', () => {
    const store = createAppStore();
    store.dispatch(
      bookRateCon({
        target: { kind: 'new', runId: 'run-new', truck: 'Тягач 412', driver: 'Sam Carter', drivingHoursLeft: 11 },
        draft: {
          ...emptyDraft,
          customer: 'Crestline Freight Brokerage',
          rate: '1850',
          pickupCity: 'Louisville',
          pickupState: 'KY',
          deliveryCity: 'Memphis',
          deliveryState: 'TN',
          miles: '385',
          driveHours: '7',
          loadNumber: 'CFB-240917',
          weight: '38500',
        },
        legMiles: { 'Memphis, TN|Indianapolis, IN': 464 },
        fileName: 'ratecon-crestline.pdf',
        author: 'Alex Mercer',
        roleTitle: 'Senior Fleet Dispatcher',
      }),
    );

    const opened = selectOpenRun(store.getState())!;
    expect(opened.run.truck).toBe('Тягач 412');
    expect(opened.run.status).toBe('Planned');
    expect(opened.run.loads[0]).toMatchObject({
      loadNumber: 'CFB-240917',
      weightLbs: 38500,
      rateConFile: 'ratecon-crestline.pdf',
    });
    // Indianapolis → Louisville comes from the demo table (115), the return leg from routing.
    expect(opened.emptyMiles).toBe(115 + 464);
    expect(opened.run.notes?.at(-1)?.text).toContain('Створено вантаж CFB-240917');
    expect(opened.run.notes?.at(-1)?.text).toContain('$1,850');
  });

  it('adds a rate con load to an existing run', () => {
    const store = createAppStore();
    store.dispatch(
      bookRateCon({
        target: { kind: 'existing', runId: '118' },
        draft: { ...emptyDraft, customer: 'Northbound', rate: '2450', pickupCity: 'Dayton', pickupState: 'OH', deliveryCity: 'Charlotte', deliveryState: 'NC', miles: '456' },
        legMiles: { 'Columbus, OH|Dayton, OH': 71, 'Charlotte, NC|Indianapolis, IN': 568 },
        fileName: 'ratecon-northbound.pdf',
        author: 'Alex Mercer',
        roleTitle: 'Senior Fleet Dispatcher',
      }),
    );
    const opened = selectOpenRun(store.getState())!;
    expect(opened.run.id).toBe('118');
    expect(opened.run.loads).toHaveLength(2);
    expect(opened.emptyMiles).toBe(125 + 71 + 568);
  });
});
