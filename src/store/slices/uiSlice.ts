import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { MenuItem } from '../../navigation';
import type { RunStatus } from '../../runs/demo';

export type StatusFilter = 'All' | RunStatus;

export const carrierProfile = {
  dispatcherRole: 'Senior Fleet Dispatcher',
  carrierName: 'LogiTrack Freight LLC',
  mcNumber: 'MC-849201',
  dotNumber: 'USDOT 3194820',
  homeYard: 'Indianapolis, IN',
} as const;

export type UiState = {
  activeSectionId: MenuItem['id'];
  isSidebarOpen: boolean;
  statusFilter: StatusFilter;
  dispatcherName: string;
  targetRatePerMile: number;
  maxEmptyPercent: number;
  fuelCostPerMile: number;
  driverPayPerMile: number;
};

export function createInitialUiState(): UiState {
  return {
    activeSectionId: 'board',
    isSidebarOpen: true,
    statusFilter: 'All',
    dispatcherName: 'Alex Mercer',
    targetRatePerMile: 3.0,
    maxEmptyPercent: 20,
    fuelCostPerMile: 0.62,
    driverPayPerMile: 0.65,
  };
}

const uiSlice = createSlice({
  name: 'ui',
  initialState: createInitialUiState(),
  reducers: {
    setActiveSection(state, action: PayloadAction<MenuItem['id']>) {
      state.activeSectionId = action.payload;
    },
    toggleSidebar(state) {
      state.isSidebarOpen = !state.isSidebarOpen;
    },
    setStatusFilter(state, action: PayloadAction<StatusFilter>) {
      state.statusFilter = action.payload;
    },
    updateCarrierTargets(
      state,
      action: PayloadAction<{
        targetRatePerMile?: number;
        maxEmptyPercent?: number;
        dispatcherName?: string;
        fuelCostPerMile?: number;
        driverPayPerMile?: number;
      }>,
    ) {
      Object.assign(state, action.payload);
    },
    resetUiState() {
      return createInitialUiState();
    },
  },
});

export const {
  setActiveSection,
  toggleSidebar,
  setStatusFilter,
  updateCarrierTargets,
  resetUiState,
} = uiSlice.actions;

export default uiSlice.reducer;
