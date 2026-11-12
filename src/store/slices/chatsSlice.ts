import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { seedChats, type Chat } from '../../chats/chats';

export type ChatsState = { chats: Chat[] };

export function createInitialChatsState(): ChatsState {
  return { chats: structuredClone(seedChats) };
}

const chatsSlice = createSlice({
  name: 'chats',
  initialState: createInitialChatsState(),
  reducers: {
    sendChatMessage(
      state,
      action: PayloadAction<{ driver: string; author: string; text: string; runId?: string }>,
    ) {
      const chat = state.chats.find((item) => item.driver === action.payload.driver);
      const text = action.payload.text.trim();
      if (!chat || !text) return;
      chat.messages.push({
        id: crypto.randomUUID(),
        from: 'dispatcher',
        author: action.payload.author,
        at: new Date().toISOString(),
        text,
        runId: action.payload.runId,
      });
    },
    markChatRead(state, action: PayloadAction<string>) {
      const chat = state.chats.find((item) => item.driver === action.payload);
      if (chat) chat.unread = 0;
    },
    resetChatsState() {
      return createInitialChatsState();
    },
  },
});

export const { sendChatMessage, markChatRead, resetChatsState } = chatsSlice.actions;

export const selectUnreadChats = (state: { chats: ChatsState }) =>
  state.chats.chats.reduce((sum, chat) => sum + chat.unread, 0);

export default chatsSlice.reducer;
