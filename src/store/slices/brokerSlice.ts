import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { seedBrokerThreads, type BrokerMessage } from '../../broker/broker';

export type BrokerState = {
  /** Переписка по грузу: ключ — id груза. */
  threads: Record<string, BrokerMessage[]>;
  /** Грузы, где есть непрочитанный ответ брокера. */
  unread: string[];
};

export function createInitialBrokerState(): BrokerState {
  return { threads: structuredClone(seedBrokerThreads), unread: [] };
}

const brokerSlice = createSlice({
  name: 'broker',
  initialState: createInitialBrokerState(),
  reducers: {
    addBrokerMessage(
      state,
      action: PayloadAction<{ loadId: string; message: Omit<BrokerMessage, 'id' | 'at'> }>,
    ) {
      const { loadId, message } = action.payload;
      state.threads[loadId] = [
        ...(state.threads[loadId] ?? []),
        { ...message, id: crypto.randomUUID(), at: new Date().toISOString() },
      ];
      if (message.kind === 'broker' && !state.unread.includes(loadId)) {
        state.unread.push(loadId);
      }
    },
    markBrokerRead(state, action: PayloadAction<string>) {
      state.unread = state.unread.filter((id) => id !== action.payload);
    },
    resetBrokerState() {
      return createInitialBrokerState();
    },
  },
});

export const { addBrokerMessage, markBrokerRead, resetBrokerState } = brokerSlice.actions;

export default brokerSlice.reducer;
