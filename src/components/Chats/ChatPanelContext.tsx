import { createContext, useContext } from 'react';

type ChatPanelApi = {
  /** Открывает боковую панель чатов; с именем водителя — сразу на его переписке. */
  /** `opener` — кнопка, открывшая панель: после закрытия фокус возвращается на неё. */
  openChat: (driver?: string, opener?: HTMLElement | null) => void;
};

export const ChatPanelContext = createContext<ChatPanelApi>({ openChat: () => {} });

export function useChatPanel() {
  return useContext(ChatPanelContext);
}
