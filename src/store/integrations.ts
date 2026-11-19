import { planIntegration } from '../integrations/adapters';
import { SEED_NOW } from '../runs/seed';
import {
  importOperationalData,
  logIntegrationError,
} from './slices/operationsSlice';
import type { AppDispatch, RootState } from './store';
export const importIntegration =
  (raw: unknown) => (dispatch: AppDispatch, getState: () => RootState) => {
    const state = getState();
    if (state.auth.currentUser?.role !== 'manager')
      return { ok: false, message: 'Імпорт доступний лише менеджеру.' };
    try {
      const plan = planIntegration(raw, state, state.auth.currentUser.name);
      dispatch(importOperationalData({ ...plan, raw }));
      return { ok: true, message: plan.event.detail };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Некоректний пакет даних.';
      dispatch(
        logIntegrationError({
          id: crypto.randomUUID(),
          source: 'Імпорт',
          kind: 'validation',
          status: 'Rejected',
          at: SEED_NOW,
          count: 0,
          detail: message,
        }),
      );
      return { ok: false, message };
    }
  };
