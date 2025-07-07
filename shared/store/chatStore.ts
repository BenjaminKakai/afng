// Shared Chat Store
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  timestamp: number;
}

interface ChatState {
  messages: ChatMessage[];
  addMessage: (message: ChatMessage) => void;
  removeMessage: (id: string) => void;
  clearMessages: () => void;
}

const useChatStore = create<ChatState>()(
  devtools(
    (set) => ({
      messages: [],
      addMessage: (message) =>
        set((state) => ({ messages: [...state.messages, message] })),
      removeMessage: (id) =>
        set((state) => ({
          messages: state.messages.filter((msg) => msg.id !== id),
        })),
      clearMessages: () => set({ messages: [] }),
    }),
    { name: 'chat-store' }
  )
);

export default useChatStore;
