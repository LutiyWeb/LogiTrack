import { createAction } from '@reduxjs/toolkit';
import type { RootState } from './store';
export type BusinessSnapshot = {
  runs: Pick<RootState['runs'], 'runs' | 'manualMiles' | 'invoices'>;
  inbox: RootState['inbox'];
  operations: RootState['operations'];
  drivers: RootState['drivers'];
  finance: RootState['finance'];
  planner: RootState['planner'];
  broker: RootState['broker'];
  chats: RootState['chats'];
  settings: Pick<
    RootState['ui'],
    | 'dispatcherName'
    | 'targetRatePerMile'
    | 'maxEmptyPercent'
    | 'fuelCostPerMile'
    | 'driverPayPerMile'
    | 'idleDaysAlert'
  >;
};
export const hydrateBusiness =
  createAction<BusinessSnapshot>('workspace/hydrate');
export function businessSnapshot(state: RootState): BusinessSnapshot {
  const {
    runs,
    inbox,
    operations,
    drivers,
    finance,
    planner,
    broker,
    chats,
    ui,
  } = state;
  return {
    runs: {
      runs: runs.runs,
      manualMiles: runs.manualMiles,
      invoices: runs.invoices,
    },
    inbox,
    operations,
    drivers,
    finance,
    planner,
    broker,
    chats,
    settings: {
      dispatcherName: ui.dispatcherName,
      targetRatePerMile: ui.targetRatePerMile,
      maxEmptyPercent: ui.maxEmptyPercent,
      fuelCostPerMile: ui.fuelCostPerMile,
      driverPayPerMile: ui.driverPayPerMile,
      idleDaysAlert: ui.idleDaysAlert,
    },
  };
}
