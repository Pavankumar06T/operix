import { useState, useRef, useEffect, type KeyboardEvent, type ChangeEvent } from 'react';
import { Bot, Plus, MessageSquare, ArrowUp, AlertTriangle, Target, TrendingUp, Users, FileText, BarChart2 } from 'lucide-react';
import { formatRelativeTime } from '../../lib/utils';
import axios from 'axios';

interface ChatMsg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface Conversation {
  id: string;
  preview: string;
  timestamp: string;
}

// Inline markdown rendering to avoid react-markdown ESM issues
function renderContent(content: string) {
  // Split into paragraphs and handle basic markdown
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      elements.push(<br key={key++} />);
      continue;
    }

    // Headings
    if (trimmed.startsWith('## ')) {
      elements.push(
        <h2 key={key++} className="text-base font-semibold text-[#F8F8FF] mt-3 mb-2">
          {trimmed.slice(3)}
        </h2>
      );
      continue;
    }
    if (trimmed.startsWith('### ')) {
      elements.push(
        <h3 key={key++} className="text-sm font-semibold text-[#F8F8FF] mt-2 mb-1">
          {trimmed.slice(4)}
        </h3>
      );
      continue;
    }

    // Bullet points
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      elements.push(
        <div key={key++} className="flex gap-2 ml-4 my-0.5">
          <span className="text-purple-400 text-xs mt-1 flex-shrink-0">▸</span>
          <span className="text-sm text-[#9898B0] leading-relaxed">{formatInline(trimmed.slice(2))}</span>
        </div>
      );
      continue;
    }

    // Numbered lists
    const numberedMatch = trimmed.match(/^(\d+)\.\s(.+)/);
    if (numberedMatch) {
      elements.push(
        <div key={key++} className="flex gap-2 ml-4 my-0.5">
          <span className="text-purple-400 text-xs mt-1 flex-shrink-0 font-mono">{numberedMatch[1]}.</span>
          <span className="text-sm text-[#9898B0] leading-relaxed">{formatInline(numberedMatch[2])}</span>
        </div>
      );
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={key++} className="text-sm text-[#9898B0] leading-relaxed mb-2 last:mb-0">
        {formatInline(trimmed)}
      </p>
    );
  }

  return <>{elements}</>;
}

// Handle **bold** and `code` inline
function formatInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let idx = 0;

  while (remaining.length > 0) {
    // Bold
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    // Code
    const codeMatch = remaining.match(/`(.+?)`/);

    const boldIndex = boldMatch ? remaining.indexOf(boldMatch[0]) : -1;
    const codeIndex = codeMatch ? remaining.indexOf(codeMatch[0]) : -1;

    if (boldIndex === -1 && codeIndex === -1) {
      parts.push(<span key={idx++}>{remaining}</span>);
      break;
    }

    const useCode = codeIndex !== -1 && (boldIndex === -1 || codeIndex < boldIndex);

    if (useCode && codeMatch) {
      if (codeIndex > 0) {
        parts.push(<span key={idx++}>{remaining.slice(0, codeIndex)}</span>);
      }
      parts.push(
        <code key={idx++} className="bg-[#0A0A0F] px-1.5 py-0.5 rounded font-mono text-xs text-cyan-400">
          {codeMatch[1]}
        </code>
      );
      remaining = remaining.slice(codeIndex + codeMatch[0].length);
    } else if (boldMatch && boldIndex !== -1) {
      if (boldIndex > 0) {
        parts.push(<span key={idx++}>{remaining.slice(0, boldIndex)}</span>);
      }
      parts.push(
        <strong key={idx++} className="text-[#F8F8FF] font-semibold">{boldMatch[1]}</strong>
      );
      remaining = remaining.slice(boldIndex + boldMatch[0].length);
    }
  }

  return <>{parts}</>;
}

interface SuggestionItem {
  text: string;
  icon: typeof Bot;
  color: string;
}

const SUGGESTIONS: SuggestionItem[] = [
  { text: 'Which projects are at risk this week?', icon: AlertTriangle, color: '#F59E0B' },
  { text: 'Who has the most overdue tasks?', icon: Target, color: '#EF4444' },
  { text: 'Show me team efficiency this month', icon: TrendingUp, color: '#22C55E' },
  { text: 'Which employee needs support right now?', icon: Users, color: '#A855F7' },
  { text: 'Generate a project summary', icon: FileText, color: '#4F6EF7' },
  { text: 'What should I focus on today?', icon: BarChart2, color: '#06B6D4' },
];

export default function AIAssistant() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const startNewConversation = () => {
    setMessages([]);
    setActiveConversation(null);
  };

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Auto-resize textarea
  const adjustHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  };

  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    adjustHeight();
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Add user message immediately
    const userMsg: ChatMsg = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmed,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    // Add to conversations list
    const convId = activeConversationId || Date.now().toString();
    if (!activeConversationId) {
      setActiveConversation(convId);
      setConversations(prev => [
        { id: convId, preview: trimmed.slice(0, 50), timestamp: new Date().toISOString() },
        ...prev,
      ]);
    }

    // Call API or use mock
    let answer: string;
    try {
      const { data } = await axios.post<{ answer: string }>('/api/ai/chat', { question: trimmed });
      answer = data.answer;
    } catch {
      answer = `I received your question: **"${trimmed}"**\n\nI'm currently unable to connect to the live data system. This happens when:\n\n- The backend server isn't running on port 3001\n- The Supabase or Gemini API keys aren't configured yet\n- The database tables haven't been created\n\nOnce your backend is fully configured, I'll provide real-time insights about your projects, team performance, and risk analytics.\n\n### To fix this:\n1. Make sure the backend is running: \`npm run dev\` in the backend folder\n2. Check your \`.env\` file has valid API keys\n3. Verify Supabase tables are created`;
    }

    // Add AI response
    const aiMsg: ChatMsg = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: answer,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, aiMsg]);
    setIsLoading(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionSelect = async (question: string) => {
    // Simulate typing the question and sending
    setInput('');
    const userMsg: ChatMsg = {
      id: Date.now().toString(),
      role: 'user',
      content: question,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    const convId = Date.now().toString();
    setActiveConversation(convId);
    setConversations(prev => [
      { id: convId, preview: question.slice(0, 50), timestamp: new Date().toISOString() },
      ...prev,
    ]);

    let answer: string;
    try {
      const { data } = await axios.post<{ answer: string }>('/api/ai/chat', { question });
      answer = data.answer;
    } catch {
      answer = `Great question! **"${question}"**\n\nI'm currently unable to connect to the live data system. Once your backend is fully configured with valid API keys, I'll provide real-time insights about your projects, team performance, and risk analytics.\n\n### Quick setup:\n1. Run \`npm run dev\` in the backend folder\n2. Add valid keys to your \`.env\` file\n3. Verify Supabase tables are created`;
    }

    const aiMsg: ChatMsg = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: answer,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, aiMsg]);
    setIsLoading(false);
  };

  const hasMessages = messages.length > 0;
  const canSend = input.trim().length > 0 && !isLoading;

  return (
    <div className="flex h-[calc(100vh-56px)] bg-[#0A0A0F]">
      {/* ══════════════════════════════════════ */}
      {/* LEFT COLUMN — Conversations Sidebar   */}
      {/* ══════════════════════════════════════ */}
      <div className="w-[280px] border-r border-[#2A2A3A] bg-[#111118] flex flex-col flex-shrink-0">
        {/* Header */}
        <div className="p-4 border-b border-[#2A2A3A]">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-7 h-7 rounded-lg bg-purple-600 flex items-center justify-center">
              <Bot size={15} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#F8F8FF]">Operix AI</p>
              <p className="text-[10px] text-purple-400">Powered by Gemini</p>
            </div>
          </div>

          <button
            onClick={startNewConversation}
            className="w-full flex items-center justify-center gap-2 border border-[#2A2A3A] bg-[#16161F] hover:bg-[#1C1C28] hover:border-[#3A3A4A] rounded-lg py-2.5 text-sm text-[#9898B0] hover:text-[#F8F8FF] transition-all duration-150"
          >
            <Plus size={15} />
            New conversation
          </button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto p-2">
          <p className="text-[10px] font-medium text-[#5A5A72] uppercase tracking-wider px-2 py-2">
            Recent
          </p>

          {conversations.length === 0 ? (
            <div className="py-8 text-center">
              <MessageSquare size={24} className="text-[#5A5A72] mx-auto mb-2" />
              <p className="text-xs text-[#5A5A72]">No conversations yet</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setActiveConversation(conv.id)}
                className={`w-full text-left flex items-start gap-2.5 px-2 py-2.5 rounded-lg hover:bg-[#16161F] transition-colors duration-150 ${
                  activeConversationId === conv.id
                    ? 'bg-[#1C1C28] border-l-2 border-purple-500 pl-1.5'
                    : ''
                }`}
              >
                <MessageSquare size={14} className="text-[#5A5A72] mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-[#9898B0] truncate">{conv.preview}</p>
                  <p className="text-[10px] text-[#5A5A72] mt-0.5">
                    {formatRelativeTime(conv.timestamp)}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════ */}
      {/* RIGHT COLUMN — Chat Area              */}
      {/* ══════════════════════════════════════ */}
      <div className="flex-1 flex flex-col relative min-w-0">
        {!hasMessages ? (
          /* ═══ EMPTY STATE ═══ */
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
            {/* AI Icon with glow */}
            <div
              className="w-16 h-16 rounded-2xl mb-6 flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #7C3AED, #A855F7)',
                boxShadow: '0 0 40px rgba(168, 85, 247, 0.25)',
              }}
            >
              <Bot size={32} className="text-white" />
            </div>

            <h2 className="text-2xl font-bold text-[#F8F8FF] mb-2 text-center">
              Operix AI Assistant
            </h2>
            <p className="text-[#9898B0] text-sm text-center max-w-xs mb-8">
              Ask me anything about your team, projects, or performance
            </p>

            {/* Suggested Questions */}
            <div className="grid grid-cols-2 gap-2 w-full max-w-lg">
              {SUGGESTIONS.map((s) => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.text}
                    onClick={() => handleSuggestionSelect(s.text)}
                    className="flex items-start gap-2.5 p-3.5 cursor-pointer rounded-xl border border-[#2A2A3A] bg-[#16161F] hover:border-purple-500/50 hover:bg-[#1C1C28] transition-all duration-200 text-left group"
                  >
                    <Icon size={15} style={{ color: s.color }} className="flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-[#9898B0] group-hover:text-[#F8F8FF] transition-colors">
                      {s.text}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* ═══ MESSAGES AREA ═══ */
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              if (isUser) {
                return (
                  <div key={msg.id} className="flex justify-end">
                    <div className="max-w-[75%]">
                      <div className="px-4 py-3 bg-[#4F6EF7] text-white rounded-2xl rounded-tr-sm text-sm leading-relaxed">
                        {msg.content}
                      </div>
                    </div>
                  </div>
                );
              }
              return (
                <div key={msg.id} className="flex flex-col items-start gap-1 max-w-[82%]">
                  <div className="flex items-center gap-1.5 mb-1 ml-1">
                    <Bot size={12} className="text-purple-400" />
                    <span className="text-[10px] font-medium text-purple-400">Operix AI</span>
                  </div>
                  <div className="w-full px-5 py-4 bg-[#16161F] border border-[#2A2A3A] rounded-2xl rounded-tl-sm">
                    {renderContent(msg.content)}
                  </div>
                </div>
              );
            })}
            {isLoading && (
              <div className="flex flex-col items-start gap-1 max-w-[82%]">
                <div className="flex items-center gap-1.5 mb-1 ml-1">
                  <Bot size={12} className="text-purple-400" />
                  <span className="text-[10px] font-medium text-purple-400">Operix AI</span>
                </div>
                <div className="px-5 py-4 bg-[#16161F] border border-[#2A2A3A] rounded-2xl rounded-tl-sm">
                  <div className="flex items-center gap-1.5 py-1">
                    <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" />
                    <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* ═══ BOTTOM INPUT AREA ═══ */}
        <div className="sticky bottom-0 bg-[#0A0A0F] border-t border-[#2A2A3A] p-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-3 bg-[#16161F] border border-[#2A2A3A] rounded-2xl p-3 px-4 focus-within:border-purple-500/50 focus-within:ring-1 focus-within:ring-purple-500/30 transition-all duration-200">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask me about your team or projects..."
                rows={1}
                className="flex-1 bg-transparent border-none outline-none text-[#F8F8FF] text-sm leading-relaxed placeholder:text-[#5A5A72] resize-none"
                style={{ minHeight: '20px', maxHeight: '200px' }}
              />

              <button
                onClick={handleSend}
                disabled={!canSend}
                className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-150 ${
                  canSend
                    ? 'bg-purple-600 hover:bg-purple-500 text-white cursor-pointer'
                    : 'bg-[#2A2A3A] text-[#5A5A72] cursor-not-allowed'
                }`}
              >
                <ArrowUp size={16} />
              </button>
            </div>

            <p className="text-[10px] text-[#5A5A72] text-center mt-2">
              Operix AI uses your live company data. Responses are based on actual project metrics.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
