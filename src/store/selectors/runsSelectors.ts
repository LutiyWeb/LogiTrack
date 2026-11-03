import { createSelector } from '@reduxjs/toolkit';
import {
  dollarsPerMile,
  emptyMilesTotal,
  lane,
  paidMiles,
  placeName,
  revenue,
  routeTimeline,
  runLegs,
  type Leg,
  type RouteStep,
  type Run,
} from '../../runs/demo';
import type { RootState } from '../store';

export type EnrichedRun = {
  run: Run;
  legs: Leg[];
  timeline: RouteStep[];
  paidMiles: number;
  emptyMiles: number | null;
  totalMiles: number | null;
  revenue: number;
  dollarsPerMile: number | null;
  deadheadPercent: number | null;
  lane: string;
  yard: string;
  needsBackhaul: boolean;
};

export type FleetKpiSummary = {
  totalRevenue: number;
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

const selectRunsList = (state: RootState) => state.runs.runs;
const selectManualMiles = (state: RootState) => state.runs.manualMiles;
const selectOpenRunId = (state: RootState) => state.runs.openRunId;
const selectStatusFilter = (state: RootState) => state.ui.statusFilter;
const selectMaxEmptyPercent = (state: RootState) => state.ui.maxEmptyPercent;
const selectTargetRatePerMile = (state: RootState) =>
  state.ui.targetRatePerMile;

export const selectEnrichedRuns = createSelector(
  [
    selectRunsList,
    selectManualMiles,
    selectMaxEmptyPercent,
    selectTargetRatePerMile,
  ],
  (
    runs,
    manualMiles,
    maxEmptyPercent,
    targetRatePerMile,
  ): EnrichedRun[] =>
    runs.map((run) => {
      const legs = runLegs(run, manualMiles);
      const timeline = routeTimeline(run, manualMiles);
      const paid = paidMiles(run);
      const empty = emptyMilesTotal(legs);
      const total = empty === null ? null : paid + empty;
      const earned = revenue(run);
      const perMile = dollarsPerMile(run, legs);
      const deadheadPercent =
        empty !== null && total !== null && total > 0
          ? Math.round((empty / total) * 100)
          : null;
      const needsBackhaul =
        run.status !== 'Completed' &&
        deadheadPercent !== null &&
        deadheadPercent > maxEmptyPercent &&
        perMile !== null &&
        perMile < targetRatePerMile;

      return {
        run,
        legs,
        timeline,
        paidMiles: paid,
        emptyMiles: empty,
        totalMiles: total,
        revenue: earned,
        dollarsPerMile: perMile,
        deadheadPercent,
        lane: lane(run),
        yard: placeName(run.yardCity, run.yardState),
        needsBackhaul,
      };
    }),
);

export const selectFilteredRuns = createSelector(
  [selectEnrichedRuns, selectStatusFilter],
  (enrichedRuns, filter) => {
    if (filter === 'All') return enrichedRuns;
    return enrichedRuns.filter((item) => item.run.status === filter);
  },
);

export const selectOpenRun = createSelector(
  [selectEnrichedRuns, selectOpenRunId],
  (enrichedRuns, openRunId) =>
    enrichedRuns.find((item) => item.run.id === openRunId) ?? null,
);

export const selectFleetKpis = createSelector(
  [selectEnrichedRuns],
  (enrichedRuns): FleetKpiSummary => {
    const totalRevenue = enrichedRuns.reduce(
      (sum, item) => sum + item.revenue,
      0,
    );
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
      (item) =>
        item.run.status === 'In transit' || item.run.status === 'Planned',
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
