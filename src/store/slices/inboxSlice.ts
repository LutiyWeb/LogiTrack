import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { seedInbox, type InboxLoad, type InboxStatus } from '../../inbox/inbox';
import type { LoadDraft } from '../../runs/demo';
import { bookRateCon } from './runsSlice';

export type InboxState = { items: InboxLoad[] };

export function createInitialInboxState(): InboxState {
  return { items: structuredClone(seedInbox) };
}

const inboxSlice = createSlice({
  name: 'inbox',
  initialState: createInitialInboxState(),
  reducers: {
    addInboxLoad(state, action: PayloadAction<InboxLoad>) {
      state.items.unshift(action.payload);
    },
    /** Сохранить проверенный груз: он становится «Готовий». */
    saveInboxLoad(state, action: PayloadAction<{ id: string; draft: LoadDraft }>) {
      const item = state.items.find((entry) => entry.id === action.payload.id);
      if (!item) return;
      item.draft = action.payload.draft;
      item.status = 'Ready';
    },
    setInboxStatus(state, action: PayloadAction<{ id: string; status: InboxStatus }>) {
      const item = state.items.find((entry) => entry.id === action.payload.id);
      if (item) item.status = action.payload.status;
    },
    resetInboxState() {
      return createInitialInboxState();
    },
  },
  extraReducers: (builder) => {
    // Груз из очереди назначен на рейс.
    builder.addCase(bookRateCon, (state, action) => {
      const { inboxId, target, draft } = action.payload;
      const item = state.items.find((entry) => entry.id === inboxId);
      if (!item) return;
      item.draft = draft;
      item.status = 'Assigned';
      item.runId = target.runId;
    });
  },
});

export const { addInboxLoad, saveInboxLoad, setInboxStatus, resetInboxState } =
  inboxSlice.actions;

export const selectNewInboxCount = (state: { inbox: InboxState }) =>
  state.inbox.items.filter((item) => item.status === 'New').length;

export const selectWaitingInboxCount = (state: { inbox: InboxState }) =>
  state.inbox.items.filter((item) => item.status === 'New' || item.status === 'Ready').length;

export default inboxSlice.reducer;
