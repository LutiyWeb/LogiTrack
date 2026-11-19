import { describe, expect, it } from 'vitest';
import { createAppStore } from '../store/store';
import { loginAsUser } from '../store/slices/authSlice';
import {
  addLoad,
  advanceLoadBilling,
  bookRateCon,
  issueLoadSupplement,
  recordInvoicePayment,
  reassignRun,
  updateLoadStatus,
} from '../store/slices/runsSlice';
import { addInboxLoad, acceptInboxRevision } from '../store/slices/inboxSlice';
import {
  addDetentionClaim,
  resolveDetention,
  reviewPod,
  submitInspection,
  resolveInspection,
  updateAsset,
  addLoadMessage,
  addDriverAdjustment,
} from '../store/slices/operationsSlice';
import { markDriverPaid } from '../store/slices/driversSlice';
import { buildDriverRows, seedDrivers } from '../drivers/drivers';
import {
  selectBrokerSummaries,
  selectEnrichedRuns,
  selectRealizedKpis,
} from '../store/selectors/runsSelectors';
import { selectMonthResult } from '../store/selectors/financeSelectors';
import { recordPayment } from '../store/payments';
import { invoiceBalance, invoicesFromLoads } from '../billing/billing';
import { backhaulPreset, emptyDraft, SEED_NOW } from '../runs/seed';
import { seedInbox } from '../inbox/inbox';
import { assessAssignment, appointmentTime } from '../operations/dispatch';
import { inspectionChecks } from '../operations/model';
import { reassignment } from '../operations/reassignment';
import { importIntegration } from '../store/integrations';
import { integrationFixtures } from '../integrations/fixtures';
import { csv } from '../integrations/adapters';

function office() {
  const store = createAppStore();
  store.dispatch(loginAsUser('manager'));
  return store;
}
function marcus(store: ReturnType<typeof office>) {
  const state = store.getState();
  return buildDriverRows(
    seedDrivers,
    selectEnrichedRuns(state),
    0.65,
    state.drivers.paidThisWeek,
    state.drivers.paidAmounts,
    state.operations.adjustments,
  ).find((row) => row.driver.name === 'Marcus Hill')!;
}
function crestline() {
  return {
    target: {
      kind: 'new' as const,
      runId: '412',
      truck: 'Тягач 412',
      driver: 'Sam Carter',
      drivingHoursLeft: 11,
    },
    draft: structuredClone(seedInbox[0].draft),
    legMiles: { 'Memphis, TN|Indianapolis, IN': 464 },
    inboxId: 'inbox-crestline',
    author: 'Sarah Jenkins',
    roleTitle: 'Менеджер',
  };
}
function schedule(truck = 'Тягач 107') {
  return {
    target: {
      kind: 'new' as const,
      runId: 'test',
      truck,
      driver: truck === 'Тягач 107' ? 'Luis Ortega' : 'Sam Carter',
      drivingHoursLeft: truck === 'Тягач 107' ? 0 : 11,
    },
    draft: {
      ...emptyDraft,
      customer: 'Test Customer',
      rate: '1000',
      pickupPlace: 'Depot',
      pickupCity: 'Louisville',
      pickupState: 'KY',
      pickupAt: '2026-10-31T07:00',
      deliveryPlace: 'Yard',
      deliveryCity: 'Indianapolis',
      deliveryState: 'IN',
      deliveryAt: '2026-10-31T15:00',
      miles: '115',
      driveHours: '2.5',
    },
    legMiles: {},
    author: 'Sarah Jenkins',
    roleTitle: 'Менеджер',
  };
}

describe('Audit P0 — earned mileage and money', () => {
  it('a future backhaul changes the forecast, not today’s accrual or realized revenue', () => {
    const store = office();
    const before = marcus(store);
    const realized = selectRealizedKpis(store.getState());
    const month = selectMonthResult(store.getState());
    store.dispatch(addLoad({ runId: '214', draft: backhaulPreset }));
    const after = marcus(store);
    expect(after.weekMiles).toBe(880);
    expect(after.weekPay).toBe(572);
    expect(after.weekPay).toBe(before.weekPay);
    expect(after.forecastMiles).toBe(1405);
    expect(after.forecastPay).toBe(913.25);
    expect(selectRealizedKpis(store.getState()).revenue).toBe(realized.revenue);
    expect(selectMonthResult(store.getState()).revenue).toBe(month.revenue);
    const future = store.getState().runs.runs.find((run) => run.id === '214')!
      .loads[1];
    store.dispatch(
      updateLoadStatus({
        runId: '214',
        loadId: future.id,
        status: 'Delivered',
      }),
    );
    expect(
      store.getState().runs.runs.find((run) => run.id === '214')!.loads[1]
        .status,
    ).toBe('Assigned');
  });
  it('paid amounts remain snapshots, and new adjustments create only a top-up', () => {
    const store = office();
    store.dispatch(markDriverPaid({ driver: 'Marcus Hill', amount: 913.25 }));
    expect(store.getState().drivers.paidAmounts['Marcus Hill']).toBeUndefined();
    store.dispatch(markDriverPaid({ driver: 'Marcus Hill', amount: 572 }));
    store.dispatch(markDriverPaid({ driver: 'Marcus Hill', amount: 572 }));
    store.dispatch(addLoad({ runId: '214', draft: backhaulPreset }));
    expect(marcus(store).due).toBe(0);
    expect(store.getState().drivers.payments).toHaveLength(1);
    store.dispatch(
      addDriverAdjustment({
        id: 'bonus',
        driver: 'Marcus Hill',
        date: '2026-10-28',
        amountCents: 7500,
        reason: 'Approved stop pay',
        approvedBy: 'Sarah Jenkins',
      }),
    );
    expect(marcus(store).due).toBe(75);
    store.dispatch(markDriverPaid({ driver: 'Marcus Hill', amount: 647 }));
    expect(
      store.getState().drivers.payments.map((payment) => payment.amount),
    ).toEqual([572, 75]);
  });
  it('an invoice for $950 remains owed; a $400 payment leaves $550, and full settlement closes AR', () => {
    const store = office();
    const id = store.getState().runs.invoices[0].id;
    expect(
      selectBrokerSummaries(store.getState()).find(
        (item) => item.customer === 'Bluegrass Retail',
      )?.outstandingRevenue,
    ).toBe(950);
    const payment = {
      amount: '400',
      date: '2026-10-28',
      method: 'Bank transfer' as const,
      reference: 'BANK-400',
    };
    expect(
      store.dispatch(recordPayment(id, payment, 'payment-1', 'Sarah')),
    ).toBe('');
    expect(invoiceBalance(store.getState().runs.invoices[0])).toBe(55000);
    expect(
      store.dispatch(
        recordPayment(
          id,
          { ...payment, amount: '600', reference: 'OVER' },
          'over',
          'Sarah',
        ),
      ),
    ).not.toBe('');
    store.dispatch(
      recordInvoicePayment({
        invoiceId: id,
        payment: store.getState().runs.invoices[0].payments[0],
      }),
    );
    expect(store.getState().runs.invoices[0].payments).toHaveLength(1);
    expect(
      store.dispatch(
        recordPayment(
          id,
          { ...payment, amount: '550', reference: 'BANK-550' },
          'payment-2',
          'Sarah',
        ),
      ),
    ).toBe('');
    expect(
      selectBrokerSummaries(store.getState()).find(
        (item) => item.customer === 'Bluegrass Retail',
      )?.outstandingRevenue,
    ).toBe(0);
    const migrated = invoicesFromLoads(
      store.getState().runs.runs,
      store.getState().runs.invoices,
    );
    expect(migrated[0].payments).toHaveLength(2);
  });
  it('requires a verified POD and snapshots invoices; approved detention becomes a separate supplement', () => {
    const store = office();
    const target = { runId: '214', loadId: 'hart', author: 'Sarah' };
    store.dispatch(advanceLoadBilling(target));
    expect(store.getState().runs.invoices).toHaveLength(1);
    store.dispatch(reviewPod({ ...target, documentId: 'pod-hart' }));
    store.dispatch(advanceLoadBilling(target));
    store.dispatch(advanceLoadBilling(target));
    const invoice = store
      .getState()
      .runs.invoices.find((item) => item.loadId === 'hart')!;
    expect(invoice.documentIds).toEqual(['pod-hart']);
    expect(invoice.lines[0].amountCents).toBe(320000);
    store.dispatch(
      addDetentionClaim({
        id: 'wait-1',
        runId: '214',
        loadId: 'hart',
        arrivalAt: '2026-10-28T10:00',
        departedAt: '2026-10-28T14:00',
        freeMinutes: 120,
        ratePerHour: 75,
        createdBy: 'Marcus',
        status: 'Pending',
        amountCents: 999999,
      }),
    );
    expect(store.getState().operations.detention[0].amountCents).toBe(15000);
    store.dispatch(
      resolveDetention({
        id: 'wait-1',
        approved: true,
        clientReference: '',
        author: 'Sarah',
      }),
    );
    expect(store.getState().operations.detention[0].status).toBe('Pending');
    store.dispatch(
      resolveDetention({
        id: 'wait-1',
        approved: true,
        clientReference: 'BROKER-APPROVED',
        author: 'Sarah',
      }),
    );
    store.dispatch(
      resolveDetention({
        id: 'wait-1',
        approved: true,
        clientReference: 'BROKER-APPROVED',
        author: 'Sarah',
      }),
    );
    expect(store.getState().runs.runs[0].loads[0].rate).toBe(3350);
    expect(
      store.getState().runs.invoices.find((item) => item.id === invoice.id)!
        .lines[0].amountCents,
    ).toBe(320000);
    store.dispatch(issueLoadSupplement(target));
    store.dispatch(issueLoadSupplement(target));
    expect(
      store.getState().runs.invoices.filter((item) => item.loadId === 'hart'),
    ).toHaveLength(2);
    expect(
      selectBrokerSummaries(store.getState()).find(
        (item) => item.customer === 'Hart Freight',
      )?.outstandingRevenue,
    ).toBe(3350);
  });
});

describe('Audit — import identity and assignment', () => {
  it('deduplicates repeated imports, keeps revisions with differences and scopes load numbers by broker', () => {
    const store = office();
    const original = structuredClone(seedInbox[0]);
    store.dispatch(addInboxLoad({ ...original, id: 'same-doc' }));
    expect(store.getState().inbox.items).toHaveLength(seedInbox.length);
    store.dispatch(
      addInboxLoad({
        ...original,
        id: 'revision-1',
        draft: { ...original.draft, rate: '2000' },
      }),
    );
    const canonical = store
      .getState()
      .inbox.items.find((item) => item.id === original.id)!;
    expect(canonical.draft.rate).toBe('1850');
    expect(canonical.revisions).toHaveLength(1);
    store.dispatch(
      acceptInboxRevision({ id: original.id, revisionId: 'revision-1' }),
    );
    expect(
      store.getState().inbox.items.find((item) => item.id === original.id)
        ?.draft.rate,
    ).toBe('2000');
    store.dispatch(
      addInboxLoad({
        ...original,
        id: 'another-broker',
        draft: {
          ...original.draft,
          customer: 'Other broker',
          brokerMc: '999999',
        },
      }),
    );
    expect(store.getState().inbox.items).toHaveLength(seedInbox.length + 1);
  });
  it('the booking guard blocks a second assignment and does not rewrite the canonical inbox run', () => {
    const store = office();
    const first = crestline();
    store.dispatch(bookRateCon(first));
    expect(
      store.getState().inbox.items.find((item) => item.id === first.inboxId)
        ?.runId,
    ).toBe('412');
    store.dispatch(
      bookRateCon({
        ...first,
        target: {
          kind: 'new',
          runId: '226',
          truck: 'Тягач 226',
          driver: 'Priya Nair',
          drivingHoursLeft: 11,
        },
      }),
    );
    expect(
      store
        .getState()
        .runs.runs.flatMap((run) => run.loads)
        .filter((load) => load.loadNumber === 'CFB-240917'),
    ).toHaveLength(1);
    expect(
      store.getState().inbox.items.find((item) => item.id === first.inboxId)
        ?.runId,
    ).toBe('412');
  });
  it('does not mark the inbox as assigned when a stale target run was removed', () => {
    const store = office();
    store.dispatch(
      bookRateCon({
        ...crestline(),
        target: { kind: 'existing', runId: 'missing' },
      }),
    );
    expect(
      store.getState().inbox.items.find((item) => item.id === 'inbox-crestline')
        ?.status,
    ).toBe('New');
  });
  it('allows a future pickup after rest, explains lateness at a fixed appointment and checks trailer equipment', () => {
    const store = office();
    const state = store.getState();
    const request = schedule();
    expect(
      assessAssignment(state.runs.runs, state.operations.assets, {}, request)
        .errors,
    ).toEqual([]);
    const late = assessAssignment(
      state.runs.runs,
      state.operations.assets,
      {},
      {
        ...request,
        draft: {
          ...request.draft,
          pickupAt: '2026-10-28T16:00',
          deliveryAt: '2026-10-29T12:00',
        },
      },
    );
    expect(late.lateMinutes).toBeGreaterThan(0);
    expect(late.errors.join(' ')).toMatch(/Запізнення/);
    const flatbed = {
      ...request,
      draft: { ...request.draft, equipment: "Flatbed 48'", weight: '40000' },
    };
    expect(
      assessAssignment(state.runs.runs, state.operations.assets, {}, flatbed)
        .trailer?.equipment,
    ).toBe('Flatbed');
    expect(
      assessAssignment(
        state.runs.runs,
        state.operations.assets,
        {},
        { ...flatbed, trailerId: 'trailer-dv1' },
      ).errors.length,
    ).toBeGreaterThan(0);
  });
  it('uses explicit time zones and rejects ambiguous/nonexistent DST appointments', () => {
    expect(
      appointmentTime('2026-10-31T07:00', 'America/Chicago')! -
        appointmentTime('2026-10-31T07:00', 'America/New_York')!,
    ).toBe(3600000);
    expect(appointmentTime('2026-11-01T01:30', 'America/New_York')).toBeNull();
    expect(appointmentTime('2026-03-08T02:30', 'America/New_York')).toBeNull();
    expect(appointmentTime('2026-02-30T12:00', 'America/New_York')).toBeNull();
  });
  it('logs a planned reassignment and rejects occupied equipment or an executed run', () => {
    const store = office();
    const target = reassignment(
      store.getState(),
      '118',
      'Тягач 412',
      undefined,
      'Driver availability',
    );
    expect(target.error).toBe('');
    store.dispatch(
      reassignRun({
        runId: '118',
        truck: 'Тягач 412',
        driver: target.driver!,
        drivingHoursLeft: target.drivingHoursLeft!,
        trailerId: target.trailerId,
        author: 'Sarah',
        reason: 'Driver availability',
      }),
    );
    const run = store.getState().runs.runs.find((run) => run.id === '118')!;
    expect(run.driver).toBe('Sam Carter');
    expect(run.notes?.at(-1)?.text).toContain('Driver availability');
    expect(
      reassignment(store.getState(), '305', 'Тягач 226', undefined, 'Test')
        .error,
    ).not.toBe('');
    expect(
      reassignment(store.getState(), '118', 'Тягач 214', undefined, 'Test')
        .error,
    ).not.toBe('');
  });
});

describe('Audit — driver, defects and integrations', () => {
  it('drivers cannot approve POD, record money or post to someone else’s load', () => {
    const store = office();
    store.dispatch(loginAsUser('driver'));
    store.dispatch(
      reviewPod({
        documentId: 'pod-hart',
        runId: '214',
        loadId: 'hart',
        author: 'Marcus',
      }),
    );
    expect(store.getState().operations.documents[0].reviewedAt).toBeUndefined();
    store.dispatch(
      addLoadMessage({
        id: 'alien',
        runId: '107',
        loadId: '107-load',
        at: SEED_NOW,
        author: 'Marcus',
        text: 'Alien',
      }),
    );
    store.dispatch(
      addLoadMessage({
        id: 'own',
        runId: '214',
        loadId: 'hart',
        at: SEED_NOW,
        author: 'Marcus',
        text: 'My POD is ready',
      }),
    );
    expect(
      store.getState().operations.messages.map((message) => message.id),
    ).toEqual(['own']);
    expect(
      store.dispatch(importIntegration(integrationFixtures.payments)).ok,
    ).toBe(false);
  });
  it('an inspection defect blocks dispatch until the repair has been recorded and the asset released', () => {
    const store = office();
    const checks = Object.fromEntries(
      inspectionChecks.map((name) => [name, true]),
    );
    checks['Гальма'] = false;
    store.dispatch(
      submitInspection({
        id: 'inspection-1',
        assetId: 'truck-412',
        at: SEED_NOW,
        driver: 'Sarah',
        checks,
        defects: 'Brake leak',
        photoIds: [],
      }),
    );
    expect(
      store
        .getState()
        .operations.assets.find((asset) => asset.id === 'truck-412')?.status,
    ).toBe('Maintenance');
    store.dispatch(
      updateAsset({
        id: 'truck-412',
        status: 'Available',
        inspectionDue: '2027-01-01',
        serviceNote: 'Ignored defect',
      }),
    );
    expect(
      store
        .getState()
        .operations.assets.find((asset) => asset.id === 'truck-412')?.status,
    ).toBe('Maintenance');
    store.dispatch(
      resolveInspection({
        id: 'inspection-1',
        author: 'Sarah',
        resolution: 'Brake line replaced, tested',
      }),
    );
    store.dispatch(
      updateAsset({
        id: 'truck-412',
        status: 'Available',
        inspectionDue: '2027-01-01',
        serviceNote: 'Brake line replaced',
      }),
    );
    expect(
      assessAssignment(
        store.getState().runs.runs,
        store.getState().operations.assets,
        {},
        schedule('Тягач 412'),
      ).errors,
    ).toEqual([]);
  });
  it('accounting imports are idempotent and reject a whole batch if one payment is invalid', () => {
    const store = office();
    expect(
      store.dispatch(importIntegration(integrationFixtures.payments)).ok,
    ).toBe(true);
    store.dispatch(importIntegration(integrationFixtures.payments));
    expect(store.getState().runs.invoices[0].payments).toHaveLength(1);
    const batch = {
      ...integrationFixtures.payments,
      id: 'mixed',
      records: [
        {
          ...integrationFixtures.payments.records[0],
          id: 'new-1',
          reference: 'GOOD',
          amountCents: 10000,
        },
        {
          ...integrationFixtures.payments.records[0],
          id: 'new-2',
          reference: 'OVER',
          amountCents: 999999,
        },
      ],
    };
    expect(store.dispatch(importIntegration(batch)).ok).toBe(false);
    expect(store.getState().runs.invoices[0].payments).toHaveLength(1);
    expect(invoiceBalance(store.getState().runs.invoices[0])).toBe(55000);
  });
  it('imports GPS freshness, ELD and fuel/state mileage once without changing planned deliveries', () => {
    const store = office();
    const before = store.getState().runs.runs[0].loads[0].status;
    for (const key of ['telemetry', 'eld', 'fuel', 'mileage'] as const) {
      expect(
        store.dispatch(importIntegration(integrationFixtures[key])).ok,
      ).toBe(true);
      store.dispatch(importIntegration(integrationFixtures[key]));
    }
    expect(store.getState().runs.runs[0].location?.at).toBe('2026-10-28T14:58');
    expect(store.getState().runs.runs[0].location?.source).toBe(
      'Demo GPS adapter',
    );
    expect(store.getState().operations.eld[0].drivingHoursLeft).toBe(0);
    expect(store.getState().operations.fuel).toHaveLength(1);
    expect(store.getState().operations.stateMileage).toHaveLength(1);
    expect(store.getState().runs.runs[0].loads[0].status).toBe(before);
    expect(csv([['=HYPERLINK("bad")', 'x,y', 12.5]])).toContain("'=HYPERLINK");
  });
});
