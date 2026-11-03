import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import {
  backhaulPreset,
  deriveRunStatus,
  draftToLoad,
  emptyDraft,
  runs as seedRuns,
  type LoadDraft,
  type LoadStatus,
  type Run,
  type RunStatus,
} from '../../runs/demo';

export type RunsState = {
  runs: Run[];
  openRunId: string | null;
  manualMiles: Record<string, number>;
  draft: LoadDraft;
  isLoadModalOpen: boolean;
  modalRunId: string;
  scrollToOffers: boolean;
};

export function createInitialRunsState(): RunsState {
  return {
    runs: structuredClone(seedRuns),
    openRunId: null,
    manualMiles: {},
    draft: { ...emptyDraft },
    isLoadModalOpen: false,
    modalRunId: '214',
    scrollToOffers: false,
  };
}

const runsSlice = createSlice({
  name: 'runs',
  initialState: createInitialRunsState(),
  reducers: {
    openRun(
      state,
      action: PayloadAction<
        string | null | { runId: string | null; scrollToOffers?: boolean }
      >,
    ) {
      if (typeof action.payload === 'object' && action.payload !== null) {
        state.openRunId = action.payload.runId;
        state.scrollToOffers = Boolean(action.payload.scrollToOffers);
      } else {
        state.openRunId = action.payload;
        state.scrollToOffers = false;
      }
      if (state.openRunId) {
        state.modalRunId = state.openRunId;
      }
      state.isLoadModalOpen = false;
      state.draft = { ...emptyDraft };
    },
    clearScrollToOffers(state) {
      state.scrollToOffers = false;
    },
    openLoadModal(state, action: PayloadAction<string | undefined>) {
      state.isLoadModalOpen = true;
      if (action.payload) {
        state.modalRunId = action.payload;
      } else if (state.openRunId) {
        state.modalRunId = state.openRunId;
      }
    },
    closeLoadModal(state) {
      state.isLoadModalOpen = false;
    },
    setModalRunId(state, action: PayloadAction<string>) {
      state.modalRunId = action.payload;
    },
    createRun(
      state,
      action: PayloadAction<{
        truck: string;
        driver: string;
        yardCity: string;
        yardState: string;
        drivingHoursLeft: number;
      }>,
    ) {
      const newRun: Run = {
        id: crypto.randomUUID(),
        truck: action.payload.truck.trim(),
        driver: action.payload.driver.trim(),
        yardCity: action.payload.yardCity.trim(),
        yardState: action.payload.yardState.trim().toUpperCase(),
        status: 'Planned',
        drivingHoursLeft: action.payload.drivingHoursLeft,
        loads: [],
        notes: [],
      };
      state.runs.unshift(newRun);
      state.openRunId = newRun.id;
      state.modalRunId = newRun.id;
      state.draft = { ...emptyDraft };
    },
    patchDraft(state, action: PayloadAction<Partial<LoadDraft>>) {
      state.draft = { ...state.draft, ...action.payload };
    },
    applyPresetToDraft(state, action: PayloadAction<LoadDraft | undefined>) {
      state.draft = { ...emptyDraft, ...(action.payload ?? backhaulPreset) };
      state.isLoadModalOpen = true;
    },
    addLoad(
      state,
      action: PayloadAction<string | { runId: string; draft?: LoadDraft }>,
    ) {
      const runId =
        typeof action.payload === 'string'
          ? action.payload
          : action.payload.runId;
      const sourceDraft =
        typeof action.payload === 'string'
          ? state.draft
          : (action.payload.draft ?? state.draft);

      let run = state.runs.find((item) => item.id === runId);
      if (!run && runId === '__new__') {
        run = {
          id: crypto.randomUUID(),
          truck: 'Truck 412',
          driver: 'Sam Carter',
          yardCity: 'Indianapolis',
          yardState: 'IN',
          status: 'Planned',
          drivingHoursLeft: 11,
          loads: [],
          notes: [],
        };
        state.runs.unshift(run);
        state.openRunId = run.id;
      }
      if (!run) return;

      const load = draftToLoad(sourceDraft, crypto.randomUUID());
      if (load.status === 'Delivered') {
        load.billingStatus = 'POD required';
      }
      run.loads.push(load);
      run.status = deriveRunStatus(run);
      state.isLoadModalOpen = false;
      state.draft = { ...emptyDraft };
    },
    updateLoadStatus(
      state,
      action: PayloadAction<{
        runId: string;
        loadId: string;
        status: LoadStatus;
      }>,
    ) {
      const run = state.runs.find((item) => item.id === action.payload.runId);
      const load = run?.loads.find((item) => item.id === action.payload.loadId);
      if (run && load) {
        load.status = action.payload.status;
        if (action.payload.status === 'Delivered' && !load.billingStatus) {
          load.billingStatus = 'POD required';
        }
        run.status = deriveRunStatus(run);
      }
    },
    advanceLoadBilling(
      state,
      action: PayloadAction<{ runId: string; loadId: string }>,
    ) {
      const run = state.runs.find((item) => item.id === action.payload.runId);
      const load = run?.loads.find((item) => item.id === action.payload.loadId);
      if (!load) return;
      if (!load.billingStatus || load.billingStatus === 'POD required') {
        load.billingStatus = 'POD received';
      } else if (load.billingStatus === 'POD received') {
        load.billingStatus = 'Invoiced';
      }
    },
    invoiceCustomerLoads(state, action: PayloadAction<string>) {
      const target = action.payload.trim();
      state.runs.forEach((run) => {
        run.loads.forEach((load) => {
          if (
            load.customer.trim() === target &&
            load.billingStatus === 'POD received'
          ) {
            load.billingStatus = 'Invoiced';
          }
        });
      });
    },
    addLoadDetention(
      state,
      action: PayloadAction<{
        runId: string;
        loadId: string;
        amount: number;
        author: string;
        roleTitle: string;
      }>,
    ) {
      const run = state.runs.find((item) => item.id === action.payload.runId);
      const load = run?.loads.find((item) => item.id === action.payload.loadId);
      if (!run || !load || load.detentionFee) return;
      load.rate += action.payload.amount;
      load.detentionFee = action.payload.amount;
      run.notes = [
        ...(run.notes ?? []),
        {
          id: crypto.randomUUID(),
          author: action.payload.author,
          roleTitle: action.payload.roleTitle,
          at: 'Just now',
          text: `Added $${action.payload.amount} detention fee to ${load.customer || 'load'} (rate updated to $${load.rate}).`,
        },
      ];
    },
    addRunNote(
      state,
      action: PayloadAction<{
        runId: string;
        author: string;
        roleTitle: string;
        text: string;
      }>,
    ) {
      const run = state.runs.find((item) => item.id === action.payload.runId);
      const text = action.payload.text.trim();
      if (!run || !text) return;
      run.notes = [
        ...(run.notes ?? []),
        {
          id: crypto.randomUUID(),
          author: action.payload.author,
          roleTitle: action.payload.roleTitle,
          at: 'Just now',
          text,
        },
      ];
    },
    removeLoad(
      state,
      action: PayloadAction<{ runId: string; loadId: string }>,
    ) {
      const run = state.runs.find((item) => item.id === action.payload.runId);
      if (!run || run.loads.length <= 1) return;
      run.loads = run.loads.filter((item) => item.id !== action.payload.loadId);
      run.status = deriveRunStatus(run);
    },
    updateRunStatus(
      state,
      action: PayloadAction<{ runId: string; status: RunStatus }>,
    ) {
      const run = state.runs.find((item) => item.id === action.payload.runId);
      if (run) {
        run.status = action.payload.status;
      }
    },
    setManualMiles(
      state,
      action: PayloadAction<{ key: string; miles: number | null }>,
    ) {
      const { key, miles } = action.payload;
      if (miles === null) {
        delete state.manualMiles[key];
      } else {
        state.manualMiles[key] = miles;
      }
    },
    resetRunsState() {
      return createInitialRunsState();
    },
  },
});

export const {
  openRun,
  clearScrollToOffers,
  openLoadModal,
  closeLoadModal,
  setModalRunId,
  createRun,
  patchDraft,
  applyPresetToDraft,
  addLoad,
  updateLoadStatus,
  advanceLoadBilling,
  invoiceCustomerLoads,
  addLoadDetention,
  addRunNote,
  removeLoad,
  updateRunStatus,
  setManualMiles,
  resetRunsState,
} = runsSlice.actions;

export const addLoadFromDraft = addLoad;

export default runsSlice.reducer;
