import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { defaultFinanceSettings, type FinanceSettings, type FixedCosts } from '../../finance/finance';

export function createInitialFinanceState(): FinanceSettings {
  return structuredClone(defaultFinanceSettings);
}

const financeSlice = createSlice({
  name: 'finance',
  initialState: createInitialFinanceState(),
  reducers: {
    setFixedCost(state, action: PayloadAction<{ key: keyof FixedCosts; value: number }>) {
      state.fixed[action.payload.key] = action.payload.value;
    },
    updateFinance(
      state,
      action: PayloadAction<Partial<Omit<FinanceSettings, 'fixed'>>>,
    ) {
      Object.assign(state, action.payload);
    },
    resetFinanceState() {
      return createInitialFinanceState();
    },
  },
});

export const { setFixedCost, updateFinance, resetFinanceState } = financeSlice.actions;

export default financeSlice.reducer;
