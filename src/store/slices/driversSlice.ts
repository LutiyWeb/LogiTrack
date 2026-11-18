import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type DriversState = {
  /** Водители, которым выплата за текущую неделю уже сделана. */
  paidThisWeek: string[];
  /** Сумма, выплаченная на момент отметки: пересчёт миль задним числом её не меняет. */
  paidAmounts: Record<string, number>;
};

export function createInitialDriversState(): DriversState {
  return { paidThisWeek: [], paidAmounts: {} };
}

const driversSlice = createSlice({
  name: 'drivers',
  initialState: createInitialDriversState(),
  reducers: {
    /** Отмечает выплату на текущую сумму; доплата за новые мили отмечается ещё одним нажатием. */
    markDriverPaid(state, action: PayloadAction<{ driver: string; amount: number }>) {
      const { driver, amount } = action.payload;
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
