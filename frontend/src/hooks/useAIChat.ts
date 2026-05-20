import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/axios';
import { useChatStore } from '../stores/chatStore';
import type { ChatMessage } from '../types';

export function useSendMessage() {
  const { addMessage, setLoading } = useChatStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (question: string) => {
      setLoading(true);

      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: question,
        created_at: new Date().toISOString(),
      };
      addMessage(userMsg);

      try {
        const { data } = await api.post<{ answer: string; timestamp: string }>('/api/ai/chat', { question });
        return data;
      } catch {
        // Mock response when API is unavailable
        return {
          answer: `I apologize, but I'm currently unable to connect to the live data system. Here's what I can tell you based on general context:\n\n**Your question:** "${question}"\n\nTo get accurate, data-driven answers, please ensure the backend AI service is running. I'll be able to provide specific insights about:\n- Project risk assessments\n- Team performance metrics\n- Task completion analytics\n- Employee workload analysis`,
          timestamp: new Date().toISOString(),
        };
      }
    },
    onSuccess: (data) => {
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.answer,
        created_at: data.timestamp,
      };
      addMessage(aiMsg);
      setLoading(false);
      queryClient.invalidateQueries({ queryKey: ['chat-history'] });
    },
    onError: () => {
      setLoading(false);
    },
  });
}

export function useChatHistory() {
  const { setMessages } = useChatStore();

  return useQuery<ChatMessage[]>({
    queryKey: ['chat-history'],
    queryFn: async () => {
      try {
        const { data } = await api.get<{ messages: ChatMessage[] }>('/api/ai/chat-history');
        setMessages(data.messages);
        return data.messages;
      } catch {
        return [];
      }
    },
  });
}

export function useClearChat() {
  const { clearMessages } = useChatStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      try {
        await api.delete('/api/ai/chat-history');
      } catch {
        // Clear locally even if API fails
      }
    },
    onSuccess: () => {
      clearMessages();
      queryClient.invalidateQueries({ queryKey: ['chat-history'] });
    },
  });
}

export function useSuggestedQuestions() {
  return useQuery<string[]>({
    queryKey: ['suggested-questions'],
    queryFn: async () => {
      try {
        const { data } = await api.get<{ questions: string[] }>('/api/ai/suggested-questions');
        return data.questions;
      } catch {
        return [
          'Which projects are at risk this week?',
          'Who has the most overdue tasks?',
          'Show me team efficiency this month',
          'Which employee needs support right now?',
          'Generate a project summary',
          'What should I focus on today?',
        ];
      }
    },
  });
}
