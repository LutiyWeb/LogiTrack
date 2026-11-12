import { combineReducers, configureStore } from '@reduxjs/toolkit';
import authReducer, { createInitialAuthState } from './slices/authSlice';
import chatsReducer, {
  createInitialChatsState,
  resetChatsState,
} from './slices/chatsSlice';
import driversReducer, {
  createInitialDriversState,
  resetDriversState,
} from './slices/driversSlice';
import financeReducer, {
  createInitialFinanceState,
  resetFinanceState,
} from './slices/financeSlice';
import brokerReducer, {
  createInitialBrokerState,
  resetBrokerState,
} from './slices/brokerSlice';
import plannerReducer, {
  createInitialPlannerState,
  resetPlannerState,
} from './slices/plannerSlice';
import toastsReducer from './slices/toastsSlice';
import inboxReducer, {
  createInitialInboxState,
  resetInboxState,
} from './slices/inboxSlice';
import runsReducer, {
  createInitialRunsState,
  resetRunsState,
} from './slices/runsSlice';
import uiReducer, {
  createInitialUiState,
  resetUiState,
} from './slices/uiSlice';

// Поднимать версию, когда меняется форма сохранённого состояния.
const STORAGE_KEY = 'logitrack_demo_state_v8';

const rootReducer = combineReducers({
  auth: authReducer,
  runs: runsReducer,
  ui: uiReducer,
  inbox: inboxReducer,
  drivers: driversReducer,
  finance: financeReducer,
  chats: chatsReducer,
  toasts: toastsReducer,
  broker: brokerReducer,
  planner: plannerReducer,
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
      auth: {
        ...createInitialAuthState(),
        ...(parsed.auth ?? {}),
      },
      runs: {
        ...createInitialRunsState(),
        ...(parsed.runs ?? {}),
      },
      ui: {
        ...createInitialUiState(),
        ...(parsed.ui ?? {}),
      },
      inbox: {
        ...createInitialInboxState(),
        ...(parsed.inbox ?? {}),
      },
      drivers: {
        ...createInitialDriversState(),
        ...(parsed.drivers ?? {}),
      },
      finance: {
        ...createInitialFinanceState(),
        ...(parsed.finance ?? {}),
      },
      chats: {
        ...createInitialChatsState(),
        ...(parsed.chats ?? {}),
      },
      broker: {
        ...createInitialBrokerState(),
        ...(parsed.broker ?? {}),
      },
      planner: {
        ...createInitialPlannerState(),
        ...(parsed.planner ?? {}),
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
  dispatch(resetInboxState());
  dispatch(resetDriversState());
  dispatch(resetFinanceState());
  dispatch(resetChatsState());
  dispatch(resetBrokerState());
  dispatch(resetPlannerState());
}
