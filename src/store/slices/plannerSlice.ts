import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { seedReminders, type Reminder } from '../../planning/planning';

export type PlannerState = { reminders: Reminder[] };

export function createInitialPlannerState(): PlannerState {
  return { reminders: structuredClone(seedReminders) };
}

const plannerSlice = createSlice({
  name: 'planner',
  initialState: createInitialPlannerState(),
  reducers: {
    addReminder(state, action: PayloadAction<Omit<Reminder, 'id' | 'done'>>) {
      state.reminders.push({ ...action.payload, id: crypto.randomUUID(), done: false });
    },
    toggleReminder(state, action: PayloadAction<string>) {
      const reminder = state.reminders.find((item) => item.id === action.payload);
      if (reminder) reminder.done = !reminder.done;
    },
    resetPlannerState() {
      return createInitialPlannerState();
    },
  },
});

export const { addReminder, toggleReminder, resetPlannerState } = plannerSlice.actions;

export default plannerSlice.reducer;
