import { create } from 'zustand';
import type { ChatMessage } from '../types';

interface Conversation {
  id: string;
  preview: string;
  timestamp: string;
}

interface ChatState {
  messages: ChatMessage[];
  conversations: Conversation[];
  activeConversationId: string | null;
  isLoading: boolean;
  addMessage: (message: ChatMessage) => void;
  setMessages: (messages: ChatMessage[]) => void;
  clearMessages: () => void;
  setLoading: (loading: boolean) => void;
  addConversation: (conv: Conversation) => void;
  setActiveConversation: (id: string | null) => void;
  startNewConversation: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  conversations: [],
  activeConversationId: null,
  isLoading: false,

  addMessage: (message: ChatMessage) =>
    set((state) => ({ messages: [...state.messages, message] })),

  setMessages: (messages: ChatMessage[]) => set({ messages }),

  clearMessages: () => set({ messages: [], activeConversationId: null }),

  setLoading: (isLoading: boolean) => set({ isLoading }),

  addConversation: (conv: Conversation) =>
    set((state) => ({
      conversations: [conv, ...state.conversations.filter((c) => c.id !== conv.id)],
    })),

  setActiveConversation: (id: string | null) => set({ activeConversationId: id }),

  startNewConversation: () =>
    set({ messages: [], activeConversationId: null }),
}));
