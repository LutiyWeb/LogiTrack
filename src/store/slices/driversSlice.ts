import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type DriversState = {
  /** Водители, которым выплата за текущую неделю уже сделана. */
  paidThisWeek: string[];
};

export function createInitialDriversState(): DriversState {
  return { paidThisWeek: [] };
}

const driversSlice = createSlice({
  name: 'drivers',
  initialState: createInitialDriversState(),
  reducers: {
    markDriverPaid(state, action: PayloadAction<string>) {
      if (!state.paidThisWeek.includes(action.payload)) {
        state.paidThisWeek.push(action.payload);
      }
    },
    resetDriversState() {
      return createInitialDriversState();
    },
  },
});

export const { markDriverPaid, resetDriversState } = driversSlice.actions;

export default driversSlice.reducer;
