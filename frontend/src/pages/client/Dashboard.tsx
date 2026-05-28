import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FolderKanban, LogOut, CheckCircle2, MessageSquare, Star, Send, Ticket, AlertCircle } from 'lucide-react'
import { useState } from 'react'

import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'

const fetchClientPortal = async () => {
  const res = await api.get('/clients/me/portal')
  return res.data.data
}

export function ClientDashboard() {
  const { user, logout } = useAuthStore()
  const { toast } = useToast()
  const [selectedProject, setSelectedProject] = useState<any | null>(null)
  
  // Feedback form
  const [rating, setRating] = useState(5)
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Token form
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false)
  const [tokenProject, setTokenProject] = useState<any | null>(null)
  const [tokenTitle, setTokenTitle] = useState('')
  const [tokenMessage, setTokenMessage] = useState('')
  const [tokenSeverity, setTokenSeverity] = useState('medium')
  const [isSubmittingToken, setIsSubmittingToken] = useState(false)
  const queryClient = useQueryClient()

  const { data: portalData, isLoading } = useQuery({
    queryKey: ['clientPortal', user?.id],
    queryFn: fetchClientPortal,
  })

  const { data: tokens = [] } = useQuery({
    queryKey: ['clientTokens', user?.id],
    queryFn: async () => {
      const res = await api.get('/clients/tokens')
      return res.data.data
    }
  })

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProject) return
    setIsSubmitting(true)
    try {
      const res = await api.post('/clients/feedback', {
        project_id: selectedProject.id,
        rating,
        message
      })
      if (res.data.success) {
        toast({ title: 'Feedback Sent', description: 'Thank you for your feedback!' })
        setSelectedProject(null)
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.response?.data?.message || 'Failed to submit' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tokenProject) return
    setIsSubmittingToken(true)
    try {
      const res = await api.post('/clients/tokens', {
        project_id: tokenProject.id,
        title: tokenTitle,
        message: tokenMessage,
        severity: tokenSeverity
      })
      if (res.data.success) {
        toast({ title: 'Token Raised', description: 'Your support token has been submitted and the manager has been notified.' })
        setIsTokenModalOpen(false)
        queryClient.invalidateQueries({ queryKey: ['clientTokens'] })
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.response?.data?.message || 'Failed to submit token' })
    } finally {
      setIsSubmittingToken(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-foreground flex flex-col relative overflow-hidden">
      {/* Background Gradients for Premium Feel */}
      <div className="absolute top-0 left-0 w-full h-96 bg-primary/20 blur-[150px] pointer-events-none rounded-full transform -translate-y-1/2 opacity-50" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/10 blur-[150px] pointer-events-none rounded-full" />

      {/* Header */}
      <header className="h-16 border-b border-white/5 bg-black/40 backdrop-blur-xl flex items-center justify-between px-6 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]">
            C
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white/90">Client Portal</h2>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-sm font-medium text-white/80">{user?.name}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={logout} className="text-muted-foreground hover:text-red-400 hover:bg-white/5">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 lg:p-8 z-10">
        <div className="max-w-5xl mx-auto space-y-10 animate-in slide-in-from-bottom-4 fade-in duration-700">
          
          <div className="space-y-2">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-white/90 to-white/50">
              Welcome back, {user?.name?.split(' ')[0]}
            </h1>
            <p className="text-lg text-white/50 font-medium">Real-time insights into your active projects and team progress.</p>
          </div>

          {isLoading || !portalData ? (
            <div className="grid gap-6">
              {[1].map(i => <div key={i} className="h-80 bg-white/5 animate-pulse rounded-2xl border border-white/10 backdrop-blur-md" />)}
            </div>
          ) : portalData.projects?.length === 0 ? (
            <div className="text-center py-24 border border-white/10 rounded-2xl bg-white/5 backdrop-blur-lg">
              <FolderKanban className="h-16 w-16 mx-auto text-white/20 mb-6" />
              <h3 className="text-2xl font-semibold text-white/90">No active projects</h3>
              <p className="text-white/50 mt-2 text-lg">You currently have no active projects with us.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {portalData.projects.map((project: any) => (
                <Card key={project.id} className="border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl overflow-hidden rounded-2xl">
                  {/* Project Header */}
                  <div className="p-8 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent pointer-events-none" />
                    <div className="relative z-10">
                      <div className="flex items-center gap-4 mb-3">
                        <h2 className="text-3xl font-bold text-white/90">{project.name}</h2>
                        <Badge className={`px-3 py-1 ${project.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-primary/20 text-primary border-primary/50'}`}>
                          {project.status.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-white/60 text-lg">{project.description || 'Tracking milestones and tasks.'}</p>
                    </div>
                    
                    <div className="relative z-10 bg-white/5 p-6 rounded-xl border border-white/10 text-center min-w-[180px] backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
                      <p className="text-sm font-medium text-white/50 mb-2 uppercase tracking-wider">Overall Progress</p>
                      <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-primary to-blue-400">
                        {project.overall_progress}%
                      </div>
                    </div>
                  </div>
                  
                  <CardContent className="p-8 space-y-10">
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm font-medium text-white/70">
                        <span>Project Completion Timeline</span>
                        <span>{project.overall_progress}% Achieved</span>
                      </div>
                      <Progress value={project.overall_progress} className="h-3 bg-white/10 [&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-blue-500" />
                    </div>

                    {/* Active Team Tasks Section */}
                    <div>
                      <h3 className="text-xl font-bold mb-6 flex items-center gap-3 text-white/90">
                        <CheckCircle2 className="w-6 h-6 text-primary" />
                        Active Team Tasks
                      </h3>
                      
                      {project.active_tasks?.length === 0 ? (
                        <div className="p-6 text-center text-white/40 border border-white/5 rounded-xl bg-white/5">
                          No active tasks at the moment.
                        </div>
                      ) : (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
                          {project.active_tasks?.map((task: any) => (
                            <div key={task.id} className="p-5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition-all duration-300 flex flex-col gap-4 group">
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-semibold text-white/80 line-clamp-2">{task.title}</span>
                                <Badge variant="outline" className={`shrink-0 ${task.progress === 100 ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10' : 'border-white/20 text-white/60 bg-white/5'}`}>
                                  {task.progress === 100 ? 'Completed' : 'In Progress'}
                                </Badge>
                              </div>
                              
                              <div className="flex items-center justify-between mt-auto pt-2">
                                <div className="flex items-center gap-3">
                                  {task.assigned_to ? (
                                    <div className="flex items-center gap-2">
                                      <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary">
                                        {task.assigned_to.initials}
                                      </div>
                                      <span className="text-sm font-medium text-white/60">{task.assigned_to.name.split(' ')[0]}</span>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-white/40">Unassigned</span>
                                  )}
                                </div>
                                <div className="flex flex-col items-end gap-1 w-24">
                                  <span className="text-xs font-bold text-white/50">{task.progress}%</span>
                                  <Progress value={task.progress} className="h-1.5 w-full bg-white/10 [&>div]:bg-primary opacity-50 group-hover:opacity-100 transition-opacity" />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-4 pt-6 border-t border-white/5">
                      <Button onClick={() => {
                        setTokenProject(project)
                        setTokenTitle('')
                        setTokenMessage('')
                        setTokenSeverity('medium')
                        setIsTokenModalOpen(true)
                      }} className="gap-2 bg-transparent text-white border border-white/20 hover:bg-white/10 font-semibold px-6 py-6 rounded-xl transition-transform active:scale-95">
                        <Ticket className="w-5 h-5" />
                        Raise Token
                      </Button>
                      <Button onClick={() => {
                        setSelectedProject(project)
                        setRating(5)
                        setMessage('')
                      }} className="gap-2 bg-white text-black hover:bg-white/90 font-semibold px-6 py-6 rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-transform active:scale-95">
                        <MessageSquare className="w-5 h-5" />
                        Provide Feedback
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Tokens Section */}
          {tokens.length > 0 && (
            <div className="space-y-6 pt-10 mt-10 border-t border-white/10">
              <h2 className="text-3xl font-bold text-white/90 flex items-center gap-3">
                <Ticket className="w-8 h-8 text-blue-400" />
                My Support Tokens
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {tokens.map((token: any) => (
                  <Card key={token.id} className="border-white/10 bg-white/5 backdrop-blur-md rounded-xl">
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <h3 className="font-semibold text-white/90 text-lg">{token.title}</h3>
                          <p className="text-sm text-white/50">{token.project?.name}</p>
                        </div>
                        <Badge variant={token.is_resolved ? 'outline' : 'default'} className={token.is_resolved ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10' : 'bg-blue-500/20 text-blue-400 border-blue-500/50'}>
                          {token.is_resolved ? 'RESOLVED' : 'OPEN'}
                        </Badge>
                      </div>
                      <p className="text-sm text-white/70 line-clamp-3 bg-black/20 p-3 rounded-lg border border-white/5">
                        {token.message.replace('[Support Token] ', '')}
                      </p>
                      <div className="flex justify-between items-center text-xs text-white/40 pt-2 border-t border-white/5">
                        <span className="flex items-center gap-1 uppercase tracking-wider font-semibold">
                          <AlertCircle className="w-3 h-3" />
                          {token.severity} Priority
                        </span>
                        <span>{new Date(token.created_at).toLocaleDateString()}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Feedback Dialog */}
      <Dialog open={!!selectedProject} onOpenChange={(open) => !open && setSelectedProject(null)}>
        <DialogContent className="sm:max-w-[500px] border-border bg-card">
          <DialogHeader>
            <DialogTitle>Provide Feedback</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground mb-4">
            We value your input on <span className="font-semibold text-foreground">{selectedProject?.name}</span>.
          </div>
          <form onSubmit={handleFeedbackSubmit} className="space-y-6">
            <div className="space-y-3">
              <Label>How satisfied are you with the progress?</Label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 transition-transform hover:scale-110 focus:outline-none"
                  >
                    <Star className={`w-8 h-8 ${star <= rating ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground/30'}`} />
                  </button>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="message">Additional Comments</Label>
              <Textarea 
                id="message" 
                placeholder="Tell us what's going well or what needs improvement..." 
                value={message} 
                onChange={e => setMessage(e.target.value)} 
                rows={4}
                required
              />
            </div>
            
            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setSelectedProject(null)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting} className="gap-2">
                {isSubmitting ? 'Sending...' : <><Send className="w-4 h-4" /> Send Feedback</>}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Raise Token Dialog */}
      <Dialog open={isTokenModalOpen} onOpenChange={setIsTokenModalOpen}>
        <DialogContent className="sm:max-w-[500px] border-border bg-card">
          <DialogHeader>
            <DialogTitle>Raise Support Token</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground mb-4">
            Report an issue or raise a request for <span className="font-semibold text-foreground">{tokenProject?.name}</span>.
          </div>
          <form onSubmit={handleTokenSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="tokenTitle">Issue Title</Label>
              <input
                id="tokenTitle"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Brief summary of the issue..."
                value={tokenTitle}
                onChange={e => setTokenTitle(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label>Severity Priority</Label>
              <Select value={tokenSeverity} onValueChange={setTokenSeverity}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low - General query or minor issue</SelectItem>
                  <SelectItem value="medium">Medium - Needs attention soon</SelectItem>
                  <SelectItem value="high">High - Blocking progress</SelectItem>
                  <SelectItem value="critical">Critical - Urgent business impact</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tokenMessage">Detailed Description</Label>
              <Textarea 
                id="tokenMessage" 
                placeholder="Provide as much detail as possible..." 
                value={tokenMessage} 
                onChange={e => setTokenMessage(e.target.value)} 
                rows={5}
                required
              />
            </div>
            
            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setIsTokenModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmittingToken} className="gap-2">
                {isSubmittingToken ? 'Submitting...' : <><Ticket className="w-4 h-4" /> Raise Token</>}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
