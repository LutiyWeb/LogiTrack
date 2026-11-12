import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type ToastTone = 'success' | 'warning' | 'error' | 'info';

export type Toast = { id: string; tone: ToastTone; text: string };

/** Уведомления живут только в памяти: в localStorage их не сохраняем. */
const toastsSlice = createSlice({
  name: 'toasts',
  initialState: [] as Toast[],
  reducers: {
    showToast: {
      reducer(state, action: PayloadAction<Toast>) {
        state.push(action.payload);
      },
      prepare(tone: ToastTone, text: string) {
        return { payload: { id: crypto.randomUUID(), tone, text } };
      },
    },
    hideToast(state, action: PayloadAction<string>) {
      return state.filter((toast) => toast.id !== action.payload);
    },
  },
});

export const { showToast, hideToast } = toastsSlice.actions;

export default toastsSlice.reducer;
