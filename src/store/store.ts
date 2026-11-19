import {
  combineReducers,
  configureStore,
  type UnknownAction,
} from '@reduxjs/toolkit';
import operationsReducer, {
  createInitialOperationsState,
  resetOperationsState,
} from './slices/operationsState';
import {
  validateOperationalAction,
  applyOperationalEffects,
} from '../operations/transactions';
import { invoicesFromLoads } from '../billing/billing';
import { dedupeInboxItems } from '../inbox/inbox';
import { hydrateBusiness } from './workspaceState';
import { planIntegration } from '../integrations/adapters';
import { importOperationalData } from './slices/operationsSlice';
import { reassignment } from '../operations/reassignment';
import { assessAssignment } from '../operations/dispatch';
import { bookingConflict } from './booking';
import { addLoad, bookRateCon, reassignRun } from './slices/runsSlice';
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
const STORAGE_KEY = 'logitrack_state_v10';

const combinedReducer = combineReducers({
  auth: authReducer,
  operations: operationsReducer,
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

export type RootState = ReturnType<typeof combinedReducer>;

function rootReducer(
  state: RootState | undefined,
  action: UnknownAction,
): RootState {
  if (state && hydrateBusiness.match(action)) {
    const value = action.payload;
    return {
      ...state,
      inbox: value.inbox,
      operations: { ...createInitialOperationsState(), ...value.operations },
      drivers: value.drivers,
      finance: value.finance,
      planner: value.planner,
      broker: value.broker,
      chats: value.chats,
      runs: { ...state.runs, ...value.runs },
      ui: { ...state.ui, ...value.settings },
    };
  }
  // Reject the entire assignment transaction, including the inbox extraReducer.
  if (state && reassignRun.match(action)) {
    const user = state.auth.currentUser;
    if (!user || user.role === 'driver') return state;
    const target = reassignment(
      state,
      action.payload.runId,
      action.payload.truck,
      action.payload.trailerId,
      action.payload.reason,
    );
    if (target.error) return state;
    action = {
      ...action,
      payload: { ...action.payload, ...target, author: user.name },
    };
  }
  if (state && addLoad.match(action)) {
    const runId =
      typeof action.payload === 'string'
        ? action.payload
        : action.payload.runId;
    const draft =
      typeof action.payload === 'string'
        ? state.runs.draft
        : (action.payload.draft ?? state.runs.draft);
    const payload = {
      target: { kind: 'existing' as const, runId },
      draft,
      legMiles: {},
      author: state.auth.currentUser?.name ?? '',
      roleTitle: state.auth.currentUser?.roleTitle ?? '',
    };
    if (bookingConflict(state, payload)) return state;
    const assessment = assessAssignment(
      state.runs.runs,
      state.operations.assets,
      state.runs.manualMiles,
      payload,
      state.operations.eld,
    );
    action = {
      ...action,
      payload: { runId, draft, trailerId: assessment.trailer?.id },
    };
  }
  if (state && bookRateCon.match(action)) {
    if (bookingConflict(state, action.payload)) return state;
    const assessment = assessAssignment(
      state.runs.runs,
      state.operations.assets,
      state.runs.manualMiles,
      action.payload,
      state.operations.eld,
    );
    action = {
      ...action,
      payload: { ...action.payload, trailerId: assessment.trailer?.id },
    };
  }
  if (state && importOperationalData.match(action)) {
    if (state.auth.currentUser?.role !== 'manager') return state;
    try {
      action = {
        ...action,
        payload: {
          ...planIntegration(
            action.payload.raw,
            state,
            state.auth.currentUser.name,
          ),
          raw: action.payload.raw,
        },
      };
    } catch {
      return state;
    }
  }
  if (state && !validateOperationalAction(state, action)) return state;
  return applyOperationalEffects(state, combinedReducer(state, action), action);
}

function loadPersistedState(): Partial<RootState> | undefined {
  if (typeof window === 'undefined' || !window.localStorage) return undefined;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Partial<RootState>;
    if (!parsed || typeof parsed !== 'object') return undefined;
    const runs = { ...createInitialRunsState(), ...(parsed.runs ?? {}) };
    runs.invoices = invoicesFromLoads(runs.runs, parsed.runs?.invoices ?? []);
    return {
      operations: {
        ...createInitialOperationsState(),
        ...(parsed.operations ?? {}),
      },
      auth: {
        ...createInitialAuthState(),
        ...(parsed.auth ?? {}),
      },
      runs,
      ui: {
        ...createInitialUiState(),
        ...(parsed.ui ?? {}),
      },
      inbox: {
        ...createInitialInboxState(),
        ...(parsed.inbox ?? {}),
        items: dedupeInboxItems(
          parsed.inbox?.items ?? createInitialInboxState().items,
        ),
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
    // Ignore storage quota errors
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
    preloadedState: preloadedState
      ? combinedReducer(preloadedState as RootState, {
          type: '@@workspace/initialize',
        })
      : undefined,
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

export function resetAllData(dispatch: AppDispatch) {
  clearPersistedState();
  dispatch(resetRunsState());
  dispatch(resetUiState());
  dispatch(resetInboxState());
  dispatch(resetDriversState());
  dispatch(resetFinanceState());
  dispatch(resetChatsState());
  dispatch(resetBrokerState());
  dispatch(resetPlannerState());
  dispatch(resetOperationsState());
}
