import { createSelector } from '@reduxjs/toolkit';
import { mileageEntries } from '../../drivers/earnings';
import { SEED_NOW } from '../../runs/seed';
import { monthResult } from '../../finance/finance';
import type { RootState } from '../store';
import { selectEnrichedRuns } from './runsSelectors';

/** Итоги месяца: прошлые недели из стартовых данных + текущая неделя из рейсов. */
export const selectMonthResult = createSelector(
  [
    selectEnrichedRuns,
    (state: RootState) => state.finance,
    (state: RootState) => state.ui.fuelCostPerMile,
    (state: RootState) => state.ui.driverPayPerMile,
  ],
  (runs, finance, fuel, driverPay) =>
    monthResult(
      finance,
      fuel + driverPay + finance.tollsPerMile + finance.repairsPerMile,
      {
        revenue: runs
          .flatMap((item) => item.run.loads)
          .filter(
            (load) =>
              load.status === 'Delivered' &&
              (load.deliveredAt ?? load.delivery.at) >= '2026-10-27' &&
              Date.parse(load.deliveredAt ?? load.delivery.at) <=
                Date.parse(SEED_NOW),
          )
          .reduce((sum, load) => sum + load.rate, 0),
        miles: runs
          .flatMap((item) => mileageEntries(item))
          .filter((entry) => entry.confirmed && entry.at >= '2026-10-27')
          .reduce((sum, entry) => sum + (entry.miles ?? 0), 0),
      },
    ),
);
