import { createSelector } from '@reduxjs/toolkit';
import { monthResult } from '../../finance/finance';
import type { RootState } from '../store';
import { selectFleetKpis } from './runsSelectors';

/** Итоги месяца: прошлые недели из демо + текущая неделя из рейсов. */
export const selectMonthResult = createSelector(
  [
    selectFleetKpis,
    (state: RootState) => state.finance,
    (state: RootState) => state.ui.fuelCostPerMile,
    (state: RootState) => state.ui.driverPayPerMile,
  ],
  (kpis, finance, fuel, driverPay) =>
    monthResult(finance, fuel + driverPay + finance.tollsPerMile + finance.repairsPerMile, {
      revenue: kpis.totalRevenue,
      miles: kpis.totalMiles,
    }),
);
