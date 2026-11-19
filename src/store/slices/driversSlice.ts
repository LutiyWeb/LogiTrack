import { SEED_NOW } from '../../runs/seed';
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type DriversState = {
  /** Водители, которым выплата за текущую неделю уже сделана. */
  paidThisWeek: string[];
  /** Сумма, выплаченная на момент отметки: пересчёт миль задним числом её не меняет. */
  paidAmounts: Record<string, number>;
  payments: {
    id: string;
    driver: string;
    amount: number;
    at: string;
    author: string;
  }[];
};

export function createInitialDriversState(): DriversState {
  return { paidThisWeek: [], paidAmounts: {}, payments: [] };
}

const driversSlice = createSlice({
  name: 'drivers',
  initialState: createInitialDriversState(),
  reducers: {
    /** Отмечает выплату на текущую сумму; доплата за новые мили отмечается ещё одним нажатием. */
    markDriverPaid(
      state,
      action: PayloadAction<{
        driver: string;
        amount: number;
        author?: string;
      }>,
    ) {
      const { driver, amount } = action.payload;
      if (
        !driver.trim() ||
        !Number.isFinite(amount) ||
        amount < 0 ||
        amount < (state.paidAmounts?.[driver] ?? 0)
      )
        return;
      const paid = state.paidAmounts?.[driver] ?? 0;
      if (amount === paid) return;
      state.payments ??= [];
      state.payments.push({
        id: crypto.randomUUID(),
        driver,
        amount: Math.round((amount - paid) * 100) / 100,
        at: SEED_NOW,
        author: action.payload.author ?? 'Менеджер',
      });
      if (!state.paidThisWeek.includes(driver)) state.paidThisWeek.push(driver);
      state.paidAmounts ??= {};
      state.paidAmounts[driver] = amount;
    },
    resetDriversState() {
      return createInitialDriversState();
    },
  },
});

export const { markDriverPaid, resetDriversState } = driversSlice.actions;

export default driversSlice.reducer;
