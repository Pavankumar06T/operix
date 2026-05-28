import { useState, useRef, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Bot, User, Send, Sparkles, Loader2, RefreshCw, Flame } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface ChatSession {
  id: string
  title: string
  messages: Message[]
  updated_at: number
}

export function AiAssistant() {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const storageKey = `operix-chats-${user?.id}`
  const initialWelcome: Message = {
    id: 'welcome',
    role: 'assistant',
    content: `Hello ${user?.name?.split(' ')[0]}! I am Operix AI. I have full context of your active projects, tasks, and team workload. How can I help you today?`
  }

  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      try { return JSON.parse(saved) } catch (e) {}
    }
    return []
  })
  
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  
  const activeSession = sessions.find(s => s.id === activeSessionId)
  const messages = activeSession ? activeSession.messages : [initialWelcome]

  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
    localStorage.setItem(storageKey, JSON.stringify(sessions))
  }, [messages, sessions, storageKey])

  const chatMutation = useMutation({
    mutationFn: async ({ question, sessionId, history }: { question: string, sessionId: string, history: any[] }) => {
      const res = await api.post('/ai/ask', { query: question, history })
      return { answer: res.data.data.answer, sessionId }
    },
    onSuccess: ({ answer, sessionId }) => {
      setSessions(prev => prev.map(s => {
        if (s.id === sessionId) {
          return {
            ...s,
            messages: [...s.messages, { id: Date.now().toString(), role: 'assistant', content: answer }],
            updated_at: Date.now()
          }
        }
        return s
      }))
    },
    onError: (_, variables) => {
      setSessions(prev => prev.map(s => {
        if (s.id === variables.sessionId) {
          return {
            ...s,
            messages: [...s.messages, { id: Date.now().toString(), role: 'assistant', content: 'Sorry, I encountered an error while processing your request.' }]
          }
        }
        return s
      }))
    }
  })

  const triggerRiskEngine = useMutation({
    mutationFn: async () => {
      const res = await api.post('/ai/run-risk')
      return res.data.data
    },
    onSuccess: (data) => {
      toast({
        title: 'Risk Engine Complete',
        description: `Analyzed ${data.tasks_analyzed} tasks. Found ${data.risks_detected} risks and sent ${data.emails_sent} emails.`,
      })
    }
  })

  const triggerBurnoutEngine = useMutation({
    mutationFn: async () => {
      const res = await api.post('/ai/run-burnout')
      return res.data.data
    },
    onSuccess: (data) => {
      toast({
        title: 'Burnout Engine Complete',
        description: `Analyzed ${data.employees_analyzed} employees. Flagged ${data.flagged} for high risk.`,
      })
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || chatMutation.isPending) return

    const question = input.trim()
    setInput('')
    
    let targetSessionId = activeSessionId
    let currentHistory = messages

    if (!targetSessionId) {
      targetSessionId = Date.now().toString()
      const newSession: ChatSession = {
        id: targetSessionId,
        title: question.substring(0, 35) + (question.length > 35 ? '...' : ''),
        messages: [initialWelcome, { id: Date.now().toString(), role: 'user', content: question }],
        updated_at: Date.now()
      }
      setSessions(prev => [newSession, ...prev])
      setActiveSessionId(targetSessionId)
      currentHistory = [initialWelcome]
    } else {
      setSessions(prev => prev.map(s => {
        if (s.id === targetSessionId) {
          return {
            ...s,
            messages: [...s.messages, { id: Date.now().toString(), role: 'user', content: question }],
            updated_at: Date.now()
          }
        }
        return s
      }))
    }

    const payloadHistory = currentHistory
      .filter(m => m.id !== 'welcome')
      .map(m => ({ role: m.role, content: m.content }))

    chatMutation.mutate({ question, sessionId: targetSessionId, history: payloadHistory })
  }

  const suggestions = [
    "Which tasks are at the highest risk of missing their deadlines?",
    "Summarize the performance of my team this week.",
    "Are there any employees showing signs of burnout?"
  ]

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Bot className="w-8 h-8 text-primary" />
            Operix AI
          </h1>
          <p className="text-muted-foreground mt-1">Your intelligent operations co-pilot.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => triggerRiskEngine.mutate()} disabled={triggerRiskEngine.isPending} className="gap-2">
            {triggerRiskEngine.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 text-blue-500" />}
            Run Risk Scan
          </Button>
          <Button variant="outline" size="sm" onClick={() => triggerBurnoutEngine.mutate()} disabled={triggerBurnoutEngine.isPending} className="gap-2">
            {triggerBurnoutEngine.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flame className="w-4 h-4 text-orange-500" />}
            Check Burnout
          </Button>
        </div>
      </div>

      <div className="flex-1 flex gap-6 min-h-0">
        <Card className="w-64 flex flex-col border-border shadow-sm overflow-hidden bg-card shrink-0 hidden md:flex">
          <div className="p-4 border-b border-border">
            <Button onClick={() => setActiveSessionId(null)} className="w-full gap-2" variant="default">
              <Sparkles className="w-4 h-4" />
              New Chat
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {sessions.map(session => (
                <button
                  key={session.id}
                  onClick={() => setActiveSessionId(session.id)}
                  className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors truncate ${
                    activeSessionId === session.id 
                      ? 'bg-primary text-primary-foreground font-medium' 
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  }`}
                >
                  {session.title}
                </button>
              ))}
              {sessions.length === 0 && (
                <div className="text-xs text-muted-foreground text-center p-4">
                  No previous chats
                </div>
              )}
            </div>
          </ScrollArea>
        </Card>

        <Card className="flex-1 flex flex-col border-border shadow-sm overflow-hidden bg-card">
          <ScrollArea className="flex-1 p-6" ref={scrollRef}>
            <div className="space-y-6 pb-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0 mt-1">
                      <Bot className="w-5 h-5 text-primary" />
                    </div>
                  )}
                  <div className={`max-w-[80%] rounded-2xl px-5 py-4 ${
                    msg.role === 'user' 
                      ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                      : 'bg-muted/50 border border-border rounded-tl-sm'
                  }`}>
                    {msg.role === 'user' ? (
                      <p className="text-sm">{msg.content}</p>
                    ) : (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center shrink-0 mt-1">
                      <User className="w-5 h-5 text-secondary-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {chatMutation.isPending && (
                <div className="flex gap-4 justify-start">
                  <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                    <Bot className="w-5 h-5 text-primary" />
                  </div>
                  <div className="bg-muted/50 border border-border rounded-2xl rounded-tl-sm px-5 py-4 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary/50 animate-bounce" />
                    <div className="w-2 h-2 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: '0.2s' }} />
                    <div className="w-2 h-2 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: '0.4s' }} />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-4 bg-muted/20 border-t border-border">
            <div className="flex flex-wrap gap-2 mb-4">
              {suggestions.map((sug, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setInput(sug)
                  }}
                  className="text-xs px-3 py-1.5 rounded-full bg-background border border-border text-muted-foreground hover:text-primary hover:border-primary transition-colors flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  {sug}
                </button>
              ))}
            </div>
            <form onSubmit={handleSubmit} className="flex gap-2 relative">
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask Operix anything about your projects..."
                className="flex-1 bg-background pr-12 h-12 rounded-full border-border focus-visible:ring-primary/50 shadow-sm"
              />
              <Button 
                type="submit" 
                size="icon" 
                disabled={!input.trim() || chatMutation.isPending}
                className="absolute right-1 top-1 h-10 w-10 rounded-full"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  )
}
