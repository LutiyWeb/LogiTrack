import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { MenuItem } from '../../navigation';
import type { RunStatus } from '../../runs/demo';

export type StatusFilter = 'All' | RunStatus;

export type UiState = {
  activeSectionId: MenuItem['id'];
  isSidebarOpen: boolean;
  statusFilter: StatusFilter;
  dispatcherName: string;
  dispatcherRole: string;
  carrierName: string;
  mcNumber: string;
  dotNumber: string;
  homeYard: string;
  targetRatePerMile: number;
  maxEmptyPercent: number;
};

export function createInitialUiState(): UiState {
  return {
    activeSectionId: 'board',
    isSidebarOpen: true,
    statusFilter: 'All',
    dispatcherName: 'Alex Mercer',
    dispatcherRole: 'Senior Fleet Dispatcher',
    carrierName: 'LogiTrack Freight LLC',
    mcNumber: 'MC-849201',
    dotNumber: 'USDOT 3194820',
    homeYard: 'Indianapolis, IN',
    targetRatePerMile: 3.0,
    maxEmptyPercent: 20,
  };
}

const initialState: UiState = createInitialUiState();

const uiSlice = createSlice({
  name: 'ui',
  initialState,
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
      }>,
    ) {
      if (action.payload.targetRatePerMile !== undefined) {
        state.targetRatePerMile = action.payload.targetRatePerMile;
      }
      if (action.payload.maxEmptyPercent !== undefined) {
        state.maxEmptyPercent = action.payload.maxEmptyPercent;
      }
      if (action.payload.dispatcherName !== undefined) {
        state.dispatcherName = action.payload.dispatcherName;
      }
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
