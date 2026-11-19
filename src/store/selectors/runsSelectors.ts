import {
  invoiceBalance,
  invoiceOverdue,
  invoicePaid,
  invoiceTotal,
} from '../../billing/billing';
import { mileageEntries } from '../../drivers/earnings';
import { createSelector } from '@reduxjs/toolkit';
import {
  dollarsPerMile,
  emptyMilesTotal,
  getBrokerInfo,
  lane,
  paidMiles,
  placeName,
  revenue,
  routeTimeline,
  runLegs,
  SEED_NOW,
  type Leg,
  type RouteStep,
  type Run,
} from '../../runs/seed';
import type { RootState } from '../store';

export type EnrichedRun = {
  run: Run;
  legs: Leg[];
  timeline: RouteStep[];
  paidMiles: number;
  emptyMiles: number | null;
  totalMiles: number | null;
  revenue: number;
  operatingCost: number | null;
  /** Затраты хотя бы на известные мили: в сводных показателях рейс не считается бесплатным. */
  knownCost: number;
  netProfit: number | null;
  dollarsPerMile: number | null;
  deadheadPercent: number | null;
  lane: string;
  yard: string;
  needsBackhaul: boolean;
};

export type FleetKpiSummary = {
  totalRevenue: number;
  totalOperatingCost: number;
  totalNetProfit: number;
  totalPaidMiles: number;
  totalEmptyMiles: number;
  totalMiles: number;
  averageDollarsPerMile: number;
  deadheadPercent: number;
  activeRunsCount: number;
  completedRunsCount: number;
  totalLoadsCount: number;
  runsNeedingBackhaul: EnrichedRun[];
};

export type BrokerSummary = {
  customer: string;
  kind: 'Broker' | 'Shipper';
  mc: string;
  creditScore: string;
  terms: string;
  loadsCount: number;
  totalRevenue: number;
  invoicedRevenue: number;
  pendingRevenue: number;
  plannedRevenue: number;
  outstandingRevenue: number;
  paidRevenue: number;
  overdueRevenue: number;
  readyToInvoiceCount: number;
  primaryRunId: string;
  primaryTruck: string;
};

const selectRunsList = (state: RootState) => state.runs.runs;
const selectManualMiles = (state: RootState) => state.runs.manualMiles;
const selectOpenRunId = (state: RootState) => state.runs.openRunId;
const selectStatusFilter = (state: RootState) => state.ui.statusFilter;
const selectMaxEmptyPercent = (state: RootState) => state.ui.maxEmptyPercent;
const selectFuelCostPerMile = (state: RootState) => state.ui.fuelCostPerMile;
const selectDriverPayPerMile = (state: RootState) => state.ui.driverPayPerMile;
const selectCurrentUser = (state: RootState) => state.auth.currentUser;

export const selectEnrichedRuns = createSelector(
  [
    selectRunsList,
    selectManualMiles,
    selectMaxEmptyPercent,
    selectFuelCostPerMile,
    selectDriverPayPerMile,
  ],
  (
    runs,
    manualMiles,
    maxEmptyPercent,
    fuelCostPerMile,
    driverPayPerMile,
  ): EnrichedRun[] => {
    const costPerMile = fuelCostPerMile + driverPayPerMile;

    return runs.map((run) => {
      const legs = runLegs(run, manualMiles);
      const timeline = routeTimeline(run, manualMiles);
      const paid = paidMiles(run);
      const empty = emptyMilesTotal(legs);
      const total = empty === null ? null : paid + empty;
      const earned = revenue(run);
      const operatingCost =
        total === null ? null : Math.round(total * costPerMile);
      const netProfit = operatingCost === null ? null : earned - operatingCost;
      const perMile = dollarsPerMile(run, legs);
      const deadheadPercent =
        empty !== null && total !== null && total > 0
          ? Math.round((empty / total) * 100)
          : null;
      const needsBackhaul =
        run.status !== 'Completed' &&
        deadheadPercent !== null &&
        deadheadPercent > maxEmptyPercent;

      return {
        run,
        legs,
        timeline,
        paidMiles: paid,
        emptyMiles: empty,
        totalMiles: total,
        revenue: earned,
        operatingCost,
        knownCost: Math.round((paid + (empty ?? 0)) * costPerMile),
        netProfit,
        dollarsPerMile: perMile,
        deadheadPercent,
        lane: lane(run),
        yard: placeName(run.yardCity, run.yardState),
        needsBackhaul,
      };
    });
  },
);

export const selectFilteredRuns = createSelector(
  [selectEnrichedRuns, selectStatusFilter, selectCurrentUser],
  (enrichedRuns, filter, currentUser) => {
    const scopedRuns = currentUser?.assignedRunId
      ? enrichedRuns.filter((item) => item.run.driver === currentUser.name)
      : enrichedRuns;

    if (filter === 'All') return scopedRuns;
    return scopedRuns.filter((item) => item.run.status === filter);
  },
);

export const selectOpenRun = createSelector(
  [selectEnrichedRuns, selectOpenRunId, selectCurrentUser],
  (enrichedRuns, openRunId, user) =>
    enrichedRuns.find(
      (item) =>
        item.run.id === openRunId &&
        (user?.role !== 'driver' || item.run.driver === user.name),
    ) ?? null,
);

export const OVERVIEW_RUNS_LIMIT = 5;

/** 0 — needs action (empty return or too many empty miles), 1 — in transit, 2 — planned. */
function urgencyRank(item: EnrichedRun) {
  if (item.run.status === 'Empty return' || item.needsBackhaul) return 0;
  if (item.run.status === 'In transit') return 1;
  return 2;
}

/** Active runs for the overview, most urgent first; fewer driving hours left goes higher. */
export const selectOverviewRuns = createSelector(
  [selectEnrichedRuns],
  (enrichedRuns) =>
    enrichedRuns
      .filter((item) => item.run.status !== 'Completed')
      .sort(
        (a, b) =>
          urgencyRank(a) - urgencyRank(b) ||
          (a.run.drivingHoursLeft ?? Infinity) -
            (b.run.drivingHoursLeft ?? Infinity),
      )
      .slice(0, OVERVIEW_RUNS_LIMIT),
);

export const selectFleetKpis = createSelector(
  [selectEnrichedRuns],
  (enrichedRuns): FleetKpiSummary => {
    const totalRevenue = enrichedRuns.reduce(
      (sum, item) => sum + item.revenue,
      0,
    );
    const totalOperatingCost = enrichedRuns.reduce(
      (sum, item) => sum + (item.operatingCost ?? item.knownCost),
      0,
    );
    const totalNetProfit = totalRevenue - totalOperatingCost;
    const totalPaidMiles = enrichedRuns.reduce(
      (sum, item) => sum + item.paidMiles,
      0,
    );
    const totalEmptyMiles = enrichedRuns.reduce(
      (sum, item) => sum + (item.emptyMiles ?? 0),
      0,
    );
    const totalMiles = totalPaidMiles + totalEmptyMiles;
    const averageDollarsPerMile =
      totalMiles > 0 ? Math.round((totalRevenue / totalMiles) * 100) / 100 : 0;
    const deadheadPercent =
      totalMiles > 0 ? Math.round((totalEmptyMiles / totalMiles) * 100) : 0;
    const activeRunsCount = enrichedRuns.filter(
      (item) => item.run.status !== 'Completed',
    ).length;
    const completedRunsCount = enrichedRuns.filter(
      (item) => item.run.status === 'Completed',
    ).length;
    const totalLoadsCount = enrichedRuns.reduce(
      (sum, item) => sum + item.run.loads.length,
      0,
    );
    const runsNeedingBackhaul = enrichedRuns.filter(
      (item) => item.needsBackhaul,
    );

    return {
      totalRevenue,
      totalOperatingCost,
      totalNetProfit,
      totalPaidMiles,
      totalEmptyMiles,
      totalMiles,
      averageDollarsPerMile,
      deadheadPercent,
      activeRunsCount,
      completedRunsCount,
      totalLoadsCount,
      runsNeedingBackhaul,
    };
  },
);

export const selectBrokerSummaries = createSelector(
  [selectRunsList, (state: RootState) => state.runs.invoices],
  (runs, invoices): BrokerSummary[] => {
    const map = new Map<string, BrokerSummary>();

    runs.forEach((run) => {
      run.loads.forEach((load) => {
        const customer = load.customer.trim();
        if (!customer) return;

        const info = getBrokerInfo(customer);
        const existing = map.get(customer) ?? {
          customer,
          kind: info.kind,
          mc: info.mc,
          creditScore: info.creditScore,
          terms: info.terms,
          loadsCount: 0,
          totalRevenue: 0,
          invoicedRevenue: 0,
          pendingRevenue: 0,
          plannedRevenue: 0,
          outstandingRevenue: 0,
          paidRevenue: 0,
          overdueRevenue: 0,
          readyToInvoiceCount: 0,
          primaryRunId: run.id,
          primaryTruck: run.truck,
        };

        const ownInvoices = invoices.filter(
          (invoice) => invoice.runId === run.id && invoice.loadId === load.id,
        );
        const billed =
          ownInvoices.reduce((sum, invoice) => sum + invoiceTotal(invoice), 0) /
          100;
        const delivered =
          load.status === 'Delivered' &&
          !!load.delivery.at &&
          Date.parse(load.deliveredAt ?? load.delivery.at) <=
            Date.parse(SEED_NOW);
        existing.loadsCount += 1;
        existing.totalRevenue += load.rate;
        existing.invoicedRevenue += billed;
        existing.outstandingRevenue +=
          ownInvoices.reduce(
            (sum, invoice) => sum + invoiceBalance(invoice),
            0,
          ) / 100;
        existing.paidRevenue +=
          ownInvoices.reduce((sum, invoice) => sum + invoicePaid(invoice), 0) /
          100;
        existing.overdueRevenue +=
          ownInvoices
            .filter((invoice) => invoiceOverdue(invoice))
            .reduce((sum, invoice) => sum + invoiceBalance(invoice), 0) / 100;
        if (delivered)
          existing.pendingRevenue += Math.max(
            0,
            Math.round((load.rate - billed) * 100) / 100,
          );
        else existing.plannedRevenue += load.rate;
        if (
          delivered &&
          (load.billingStatus === 'POD received' ||
            (billed > 0 && load.rate > billed))
        )
          existing.readyToInvoiceCount += 1;

        map.set(customer, existing);
      });
    });

    return Array.from(map.values());
  },
);

export const selectRealizedKpis = createSelector(
  [selectEnrichedRuns, selectFuelCostPerMile, selectDriverPayPerMile],
  (runs, fuel, driverPay) => {
    const entries = runs
      .flatMap((item) => mileageEntries(item))
      .filter((entry) => entry.confirmed);
    const miles = entries.reduce((sum, entry) => sum + (entry.miles ?? 0), 0);
    const revenue = runs
      .flatMap((item) => item.run.loads)
      .filter(
        (load) =>
          load.status === 'Delivered' &&
          Date.parse(load.deliveredAt ?? load.delivery.at) <=
            Date.parse(SEED_NOW),
      )
      .reduce((sum, load) => sum + load.rate, 0);
    const cost = Math.round(miles * (fuel + driverPay) * 100) / 100;
    return {
      revenue,
      miles,
      cost,
      margin: revenue - cost,
      unknownMileageCount: entries.filter((entry) => entry.miles === null)
        .length,
    };
  },
);

export const selectRunIds = createSelector([selectRunsList], (runs) =>
  runs.map((run) => run.id),
);
