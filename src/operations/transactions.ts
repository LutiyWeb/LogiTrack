import type { UnknownAction } from '@reduxjs/toolkit';
import type { RootState } from '../store/store';
import runsReducer, {
  addLoadDetention,
  recordInvoicePayment,
  recordInvoiceFactoring,
  advanceLoadBilling,
  invoiceCustomerLoads,
  issueLoadSupplement,
  updateLoadStatus,
  updateRunStatus,
} from '../store/slices/runsSlice';
import { buildDriverRows, seedDrivers } from '../drivers/drivers';
import { selectEnrichedRuns } from '../store/selectors/runsSelectors';
import { facilitiesFromRuns } from './facilities';
import { SEED_NOW } from '../runs/seed';
import { markDriverPaid } from '../store/slices/driversSlice';
import {
  addLoadDocument,
  reviewPod,
  addLoadMessage,
  addDetentionClaim,
  resolveDetention,
  updateAsset,
  updateFacility,
  submitInspection,
  resolveInspection,
  importOperationalData,
  logIntegrationError,
  addDriverAdjustment,
} from '../store/slices/operationsSlice';

export function validateOperationalAction(
  state: RootState,
  action: UnknownAction,
) {
  const user = state.auth.currentUser;
  const manager = user?.role === 'manager';
  const office = manager || user?.role === 'dispatcher';
  const ownRun = (runId: string) =>
    state.runs.runs.find(
      (run) => run.id === runId && (office || run.driver === user?.name),
    );
  if (updateFacility.match(action)) return !!office;
  if (markDriverPaid.match(action)) {
    if (!manager) return false;
    const row = buildDriverRows(
      seedDrivers,
      selectEnrichedRuns(state),
      state.ui.driverPayPerMile,
      state.drivers.paidThisWeek,
      state.drivers.paidAmounts,
      state.operations.adjustments,
    ).find((row) => row.driver.name === action.payload.driver);
    return (
      !!row &&
      !row.unknownMileageCount &&
      row.due > 0 &&
      action.payload.amount === row.weekPay
    );
  }
  if (advanceLoadBilling.match(action) || issueLoadSupplement.match(action))
    return (
      !!office &&
      state.operations.documents.some(
        (document) =>
          document.runId === action.payload.runId &&
          document.loadId === action.payload.loadId &&
          document.kind === 'POD' &&
          document.reviewedAt,
      )
    );
  if (invoiceCustomerLoads.match(action)) {
    const customer =
      typeof action.payload === 'string'
        ? action.payload
        : action.payload.customer;
    return (
      !!office &&
      state.runs.runs.every((run) =>
        run.loads
          .filter(
            (load) =>
              load.customer.trim() === customer.trim() &&
              load.billingStatus === 'POD received',
          )
          .every((load) =>
            state.operations.documents.some(
              (document) =>
                document.runId === run.id &&
                document.loadId === load.id &&
                document.kind === 'POD' &&
                document.reviewedAt,
            ),
          ),
      )
    );
  }
  if (updateLoadStatus.match(action)) {
    const run = ownRun(action.payload.runId);
    const load = run?.loads.find((load) => load.id === action.payload.loadId);
    if (!load) return false;
    if (
      action.payload.status === 'Delivered' &&
      load.delivery.at.slice(0, 10) > SEED_NOW.slice(0, 10)
    )
      return false;
    return true;
  }
  if (updateRunStatus.match(action)) {
    const run = state.runs.runs.find((run) => run.id === action.payload.runId);
    if (!office || !run) return false;
    if (
      action.payload.status === 'Completed' &&
      run.loads.some(
        (load) =>
          load.status !== 'Delivered' ||
          load.delivery.at.slice(0, 10) > SEED_NOW.slice(0, 10),
      )
    )
      return false;
  }
  if (
    updateAsset.match(action) &&
    action.payload.status === 'Available' &&
    state.operations.inspections.some(
      (inspection) =>
        inspection.assetId === action.payload.id &&
        Object.values(inspection.checks).some((ok) => !ok) &&
        !inspection.resolvedBy,
    )
  )
    return false;
  if (
    recordInvoiceFactoring.match(action) ||
    recordInvoicePayment.match(action) ||
    markDriverPaid.match(action) ||
    resolveDetention.match(action) ||
    updateAsset.match(action) ||
    resolveInspection.match(action) ||
    importOperationalData.match(action) ||
    logIntegrationError.match(action) ||
    addDriverAdjustment.match(action)
  )
    return manager;
  if (
    addLoadDocument.match(action) ||
    addLoadMessage.match(action) ||
    addDetentionClaim.match(action)
  )
    return !!ownRun(action.payload.runId)?.loads.some(
      (load) => load.id === action.payload.loadId,
    );
  if (submitInspection.match(action)) {
    const asset = state.operations.assets.find(
      (asset) => asset.id === action.payload.assetId,
    );
    if (!asset) return false;
    return (
      office ||
      state.runs.runs.some(
        (run) =>
          run.driver === user?.name &&
          (run.truck === asset.number || run.trailerId === asset.id),
      )
    );
  }
  if (reviewPod.match(action)) {
    const document = state.operations.documents.find(
      (doc) =>
        doc.id === action.payload.documentId &&
        doc.runId === action.payload.runId &&
        doc.loadId === action.payload.loadId &&
        doc.kind === 'POD',
    );
    return (
      !!office &&
      !!document &&
      !!ownRun(action.payload.runId)?.loads.some(
        (load) =>
          load.id === action.payload.loadId && load.status === 'Delivered',
      )
    );
  }
  return true;
}

export function applyOperationalEffects(
  before: RootState | undefined,
  after: RootState,
  action: UnknownAction,
): RootState {
  const facilities = [...(after.operations.facilities ?? [])];
  for (const facility of facilitiesFromRuns(after.runs.runs))
    if (!facilities.some((item) => item.id === facility.id))
      facilities.push(facility);
  if (facilities.length !== after.operations.facilities?.length)
    after = { ...after, operations: { ...after.operations, facilities } };
  if (!before)
    after = {
      ...after,
      runs: {
        ...after.runs,
        invoices: after.runs.invoices.map((invoice) => ({
          ...invoice,
          documentIds: after.operations.documents
            .filter(
              (doc) =>
                doc.runId === invoice.runId &&
                doc.loadId === invoice.loadId &&
                doc.kind === 'POD' &&
                doc.reviewedAt,
            )
            .map((doc) => doc.id),
        })),
      },
    };
  if (
    before &&
    (advanceLoadBilling.match(action) ||
      invoiceCustomerLoads.match(action) ||
      issueLoadSupplement.match(action))
  ) {
    const previous = new Set(before.runs.invoices.map((invoice) => invoice.id));
    after = {
      ...after,
      runs: {
        ...after.runs,
        invoices: after.runs.invoices.map((invoice) =>
          previous.has(invoice.id)
            ? invoice
            : {
                ...invoice,
                documentIds: after.operations.documents
                  .filter(
                    (doc) =>
                      doc.runId === invoice.runId &&
                      doc.loadId === invoice.loadId &&
                      doc.kind === 'POD' &&
                      doc.reviewedAt,
                  )
                  .map((doc) => doc.id),
              },
        ),
      },
    };
  }
  if (before && resolveDetention.match(action) && action.payload.approved) {
    const claim = before.operations.detention.find(
      (item) => item.id === action.payload.id,
    );
    const updated = after.operations.detention.find(
      (item) => item.id === action.payload.id,
    );
    if (claim?.status === 'Pending' && updated?.status === 'Approved')
      return {
        ...after,
        runs: runsReducer(
          after.runs,
          addLoadDetention({
            runId: claim.runId,
            loadId: claim.loadId,
            amount: claim.amountCents / 100,
            claimId: claim.id,
            author: action.payload.author,
            roleTitle: 'Менеджер автопарку',
          }),
        ),
      };
  }
  if (
    before &&
    importOperationalData.match(action) &&
    !before.operations.integrations.some(
      (event) =>
        event.id === action.payload.event.id && event.status === 'Applied',
    )
  ) {
    let runs = after.runs;
    for (const payment of action.payload.payments ?? [])
      runs = runsReducer(runs, recordInvoicePayment(payment));
    if (action.payload.telemetry?.length) {
      const telemetry = action.payload.telemetry;
      runs = {
        ...runs,
        runs: runs.runs.map((run) => {
          const fix = telemetry
            .filter((record) => record.truck === run.truck)
            .sort(
              (a, b) => Date.parse(b.fix.at) - Date.parse(a.fix.at),
            )[0]?.fix;
          return fix &&
            (!run.location || Date.parse(fix.at) > Date.parse(run.location.at))
            ? { ...run, location: fix }
            : run;
        }),
      };
    }
    return { ...after, runs };
  }
  return after;
}
