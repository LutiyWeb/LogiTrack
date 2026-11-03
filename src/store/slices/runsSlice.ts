import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import {
  backhaulPreset,
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
};

export function createInitialRunsState(): RunsState {
  return {
    runs: structuredClone(seedRuns),
    openRunId: null,
    manualMiles: {},
    draft: { ...emptyDraft },
  };
}

const initialState: RunsState = createInitialRunsState();

const runsSlice = createSlice({
  name: 'runs',
  initialState,
  reducers: {
    openRun(state, action: PayloadAction<string | null>) {
      state.openRunId = action.payload;
    },
    setDraft(state, action: PayloadAction<LoadDraft>) {
      state.draft = action.payload;
    },
    patchDraft(state, action: PayloadAction<Partial<LoadDraft>>) {
      state.draft = { ...state.draft, ...action.payload };
    },
    applyPresetToDraft(state, action: PayloadAction<LoadDraft | undefined>) {
      const preset = action.payload ?? backhaulPreset;
      state.draft = { ...emptyDraft, ...preset };
    },
    addLoadFromDraft(state, action: PayloadAction<string>) {
      const run = state.runs.find((item) => item.id === action.payload);
      if (!run) return;

      const load = draftToLoad(state.draft, crypto.randomUUID());
      run.loads.push(load);
      state.draft = { ...emptyDraft };
    },
    addLoadDirect(
      state,
      action: PayloadAction<{ runId: string; draft: LoadDraft }>,
    ) {
      const run = state.runs.find((item) => item.id === action.payload.runId);
      if (!run) return;

      const load = draftToLoad(action.payload.draft, crypto.randomUUID());
      run.loads.push(load);
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
      if (load) {
        load.status = action.payload.status;
      }
    },
    removeLoad(
      state,
      action: PayloadAction<{ runId: string; loadId: string }>,
    ) {
      const run = state.runs.find((item) => item.id === action.payload.runId);
      if (!run || run.loads.length <= 1) return;
      run.loads = run.loads.filter((item) => item.id !== action.payload.loadId);
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
  setDraft,
  patchDraft,
  applyPresetToDraft,
  addLoadFromDraft,
  addLoadDirect,
  updateLoadStatus,
  removeLoad,
  updateRunStatus,
  setManualMiles,
  resetRunsState,
} = runsSlice.actions;

export default runsSlice.reducer;
