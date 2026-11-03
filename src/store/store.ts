import { combineReducers, configureStore } from '@reduxjs/toolkit';
import runsReducer, {
  createInitialRunsState,
  resetRunsState,
} from './slices/runsSlice';
import uiReducer, {
  createInitialUiState,
  resetUiState,
} from './slices/uiSlice';

const STORAGE_KEY = 'logitrack_demo_state_v1';

const rootReducer = combineReducers({
  runs: runsReducer,
  ui: uiReducer,
});

export type RootState = ReturnType<typeof rootReducer>;

function loadPersistedState(): Partial<RootState> | undefined {
  if (typeof window === 'undefined' || !window.localStorage) return undefined;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Partial<RootState>;
    if (!parsed || typeof parsed !== 'object') return undefined;
    return {
      runs: {
        ...createInitialRunsState(),
        ...(parsed.runs ?? {}),
      },
      ui: {
        ...createInitialUiState(),
        ...(parsed.ui ?? {}),
      },
    };
  } catch {
    return undefined;
  }
}

function savePersistedState(state: RootState) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors in demo mode
  }
}

export function clearPersistedState() {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}

export function createAppStore(
  preloadedState?: Partial<RootState>,
  persist = false,
) {
  const configuredStore = configureStore({
    reducer: rootReducer,
    preloadedState: preloadedState as RootState | undefined,
  });

  if (persist) {
    configuredStore.subscribe(() => {
      savePersistedState(configuredStore.getState());
    });
  }

  return configuredStore;
}

export const store = createAppStore(loadPersistedState(), true);

export type AppStore = ReturnType<typeof createAppStore>;
export type AppDispatch = AppStore['dispatch'];

export function resetAllDemoData(dispatch: AppDispatch) {
  clearPersistedState();
  dispatch(resetRunsState());
  dispatch(resetUiState());
}
