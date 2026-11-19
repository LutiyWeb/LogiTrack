import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import {
  findDuplicate,
  seedInbox,
  type InboxLoad,
  type InboxStatus,
} from '../../inbox/inbox';
import type { LoadDraft } from '../../runs/seed';
import { bookRateCon } from './runsSlice';
import { draftChanges } from '../../inbox/identity';

export type InboxState = { items: InboxLoad[] };

export function createInitialInboxState(): InboxState {
  return { items: structuredClone(seedInbox) };
}

const inboxSlice = createSlice({
  name: 'inbox',
  initialState: createInitialInboxState(),
  reducers: {
    addInboxLoad(state, action: PayloadAction<InboxLoad>) {
      const candidate = action.payload;
      if (state.items.some((item) => item.id === candidate.id)) return;
      const existing = findDuplicate(state.items, candidate);
      if (!existing) {
        state.items.unshift(candidate);
        return;
      }
      if (!draftChanges(existing.draft, candidate.draft).length) return;
      if (
        existing.revisions?.some(
          (revision) => !draftChanges(revision.draft, candidate.draft).length,
        )
      )
        return;
      existing.revisions ??= [];
      existing.revisions.push({
        ...candidate,
        revisions: undefined,
      } as InboxLoad);
    },
    /** Сохранить проверенный груз: он становится «Готовий». */
    saveInboxLoad(
      state,
      action: PayloadAction<{ id: string; draft: LoadDraft }>,
    ) {
      const item = state.items.find((entry) => entry.id === action.payload.id);
      if (!item || item.status === 'Assigned') return;
      item.draft = action.payload.draft;
      item.status = 'Ready';
    },
    setInboxStatus(
      state,
      action: PayloadAction<{ id: string; status: InboxStatus }>,
    ) {
      const item = state.items.find((entry) => entry.id === action.payload.id);
      if (
        item &&
        item.status !== 'Assigned' &&
        action.payload.status !== 'Assigned'
      )
        item.status = action.payload.status;
    },
    acceptInboxRevision(
      state,
      action: PayloadAction<{ id: string; revisionId: string }>,
    ) {
      const item = state.items.find((entry) => entry.id === action.payload.id);
      if (!item || item.status === 'Assigned') return;
      const revision = item.revisions?.find(
        (entry) => entry.id === action.payload.revisionId,
      );
      if (!revision) return;
      const id = item.id;
      const revisions = item.revisions?.filter(
        (entry) => entry.id !== revision.id,
      );
      Object.assign(item, revision, {
        id,
        status: 'Ready',
        documentId: revision.id,
        revisions,
      });
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

export const {
  addInboxLoad,
  saveInboxLoad,
  setInboxStatus,
  acceptInboxRevision,
  resetInboxState,
} = inboxSlice.actions;

export const selectWaitingInboxCount = (state: { inbox: InboxState }) =>
  state.inbox.items.filter(
    (item) => item.status === 'New' || item.status === 'Ready',
  ).length;

export default inboxSlice.reducer;
