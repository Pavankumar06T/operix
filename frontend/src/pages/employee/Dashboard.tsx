import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckSquare, Clock, Send, Zap, Play, Square, FolderKanban, Code } from 'lucide-react'
import { format } from 'date-fns'

import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'

import { TimerWidget } from '@/components/tracking/TimerWidget'
import { useTimer } from '@/hooks/useTimer'
import { useTimeTracking } from '@/hooks/useTimeTracking'
import { StopTimerModal } from '@/components/tracking/StopTimerModal'

const fetchMyTasks = async () => {
  const res = await api.get('/tasks?status=in_progress')
  const notStarted = await api.get('/tasks?status=not_started')
  const allTasks = [...res.data.data, ...notStarted.data.data]
  
  // Filter out tasks where the project is still in the planning phase
  return allTasks.filter((t: any) => !t.project || t.project.status !== 'planning')
}

export function EmployeeDashboard() {
  const { user, logout } = useAuthStore()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [selectedTask, setSelectedTask] = useState<any | null>(null)
  
  const { isActive, taskId: activeTaskId, formattedTime, taskTitle, timeLogId } = useTimer()
  const { todaySummary, startTask, isStarting } = useTimeTracking()
  const [isStopModalOpen, setIsStopModalOpen] = useState(false)

  // Progress update form state
  const [progress, setProgress] = useState('')
  const [note, setNote] = useState('')
  const [blocker, setBlocker] = useState('')

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['myTasks', user?.id],
    queryFn: fetchMyTasks,
  })

  const logProgressMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await api.put(`/tasks/${taskId}/progress`, {
        progress: parseInt(progress),
        hours_spent: 0,
        note,
        blocker
      })
      return res.data
    },
    onSuccess: () => {
      toast({ title: 'Progress Logged', description: 'Your task has been updated successfully.' })
      setSelectedTask(null)
      queryClient.invalidateQueries({ queryKey: ['myTasks'] })
      queryClient.invalidateQueries({ queryKey: ['tracking', 'today'] })
    },
    onError: (err: any) => {
      toast({ variant: 'destructive', title: 'Failed to update', description: err.response?.data?.message || 'Something went wrong' })
    }
  })

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTask) return
    logProgressMutation.mutate(selectedTask.id)
  }

  const openUpdateModal = (task: any) => {
    setSelectedTask(task)
    setProgress(task.progress.toString())
    setNote('')
    setBlocker('')
  }

  const handleStartTimer = async (task: any) => {
    await startTask({ taskId: task.id, taskTitle: task.title, projectId: task.project_id })
  }

  const formatMinToHours = (mins: number) => {
    if (!mins) return '0m'
    if (mins < 60) return `${mins}m`
    return `${Math.floor(mins / 60)}h ${mins % 60}m`
  }

  const formatTimeStr = (isoString: string) => {
    return format(new Date(isoString), 'h:mm a')
  }

  return (
    <>
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* TODAY'S SUMMARY */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Zap className="w-5 h-5 text-green-500" />
              Today at a glance
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-card border-border">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 bg-[#4F6EF7]/10 rounded-lg">
                    <Clock className="w-5 h-5 text-[#4F6EF7]" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Online Since</p>
                    <p className="font-semibold text-lg">
                      {todaySummary?.timelineOfDay?.find((t: any) => t.type === 'login')?.time 
                        ? formatTimeStr(todaySummary.timelineOfDay.find((t: any) => t.type === 'login').time) 
                        : '--:--'}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 bg-[#22C55E]/10 rounded-lg">
                    <Zap className="w-5 h-5 text-[#22C55E]" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Active Time</p>
                    <p className="font-semibold text-lg">{formatMinToHours(todaySummary?.totalActiveMins)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 bg-[#A855F7]/10 rounded-lg">
                    <CheckSquare className="w-5 h-5 text-[#A855F7]" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tasks Worked</p>
                    <p className="font-semibold text-lg">{todaySummary?.tasksWorkedOn || 0}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 bg-[#F59E0B]/10 rounded-lg">
                    <Code className="w-5 h-5 text-[#F59E0B]" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Top Tech Today</p>
                    <p className="font-semibold text-lg truncate w-24">
                      {todaySummary?.technologiesUsed?.[0]?.technology || 'None'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Activity Timeline */}
            {todaySummary?.timelineOfDay && todaySummary.timelineOfDay.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-6 mt-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-4">Activity Timeline</h3>
                <div className="space-y-4">
                  {todaySummary.timelineOfDay.map((event: any, i: number) => (
                    <div key={i} className="flex gap-4">
                      <div className="w-20 text-xs text-muted-foreground pt-0.5 shrink-0 text-right">
                        {formatTimeStr(event.time)}
                      </div>
                      <div className="relative flex flex-col items-center">
                        <div className={`w-2.5 h-2.5 rounded-full z-10 ${
                          event.color === 'blue' ? 'bg-[#4F6EF7]' :
                          event.color === 'green' ? 'bg-[#22C55E]' :
                          event.color === 'red' ? 'bg-[#EF4444]' : 'bg-[#9898B0]'
                        }`} />
                        {i < todaySummary.timelineOfDay.length - 1 && (
                          <div className="w-px h-full bg-border absolute top-2.5" />
                        )}
                      </div>
                      <div className="text-sm pb-4">{event.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Tasks</h1>
            <p className="text-muted-foreground mt-1">Focus on what matters. Use the timer to automatically log your work.</p>
          </div>

          {isLoading ? (
            <div className="grid gap-4">
              {[1, 2, 3].map(i => <div key={i} className="h-32 bg-muted/20 animate-pulse rounded-xl border border-border" />)}
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-border rounded-xl bg-card">
              <CheckSquare className="h-12 w-12 mx-auto text-green-500/50 mb-4" />
              <h3 className="text-xl font-semibold">You're all caught up!</h3>
              <p className="text-muted-foreground mt-2">There are no active tasks assigned to you right now.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {tasks.map((task: any) => {
                const isTaskActive = isActive && activeTaskId === task.id;
                return (
                  <Card key={task.id} className={`border-border hover:border-primary/50 transition-colors ${isTaskActive ? 'border-green-500/50 bg-green-500/5' : ''}`}>
                    <CardContent className="p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">{task.title}</h3>
                            <Badge variant="outline">{task.status.replace('_', ' ').toUpperCase()}</Badge>
                            {task.priority === 'high' && <Badge variant="destructive" className="bg-destructive/20 text-destructive">HIGH PRIORITY</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground max-w-2xl line-clamp-2">
                            {task.description || 'No description provided.'}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
                            <span className="flex items-center gap-1">
                              <FolderKanban className="w-4 h-4" />
                              {task.project?.name || 'Unknown Project'}
                            </span>
                            <span className="flex items-center gap-1 text-orange-500">
                              <Clock className="w-4 h-4" />
                              Due {format(new Date(task.deadline), 'MMM dd')}
                            </span>
                            
                            {/* TIMER BUTTONS */}
                            <div className="ml-auto">
                              {!isTaskActive ? (
                                <button 
                                  onClick={() => handleStartTimer(task)}
                                  disabled={isStarting}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-[#4F6EF7]/10 border border-[#4F6EF7]/30 text-[#4F6EF7] hover:bg-[#4F6EF7]/20 transition-colors"
                                >
                                  <Play className="w-3 h-3 fill-current" />
                                  Start Timer
                                </button>
                              ) : (
                                <button 
                                  onClick={() => setIsStopModalOpen(true)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500/20 transition-colors"
                                >
                                  <Square className="w-3 h-3 fill-current" />
                                  Stop — {formattedTime}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="w-full sm:w-64 space-y-4 shrink-0 bg-background/50 p-4 rounded-lg border border-border">
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium">Progress</span>
                              <span>{task.progress}%</span>
                            </div>
                            <Progress value={task.progress} className="h-2" />
                          </div>
                          <Button className="w-full gap-2" variant="outline" onClick={() => openUpdateModal(task)}>
                            <Send className="w-4 h-4" /> Update Status
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

      {/* Progress Update Dialog */}
      <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent className="sm:max-w-[500px] border-border bg-card">
          <DialogHeader>
            <DialogTitle>Update Task Progress</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-6 mt-4">
            <div className="space-y-2">
              <Label htmlFor="progress">Current Progress (%)</Label>
              <Input 
                id="progress" 
                type="number" 
                min="0" 
                max="100" 
                value={progress} 
                onChange={e => setProgress(e.target.value)} 
                required 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Update Notes</Label>
              <Textarea 
                id="note" 
                placeholder="What did you work on?" 
                value={note} 
                onChange={e => setNote(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="blocker" className="text-orange-500">Blockers (Optional)</Label>
              <Input 
                id="blocker" 
                placeholder="Is anything preventing you from moving forward?" 
                value={blocker} 
                onChange={e => setBlocker(e.target.value)} 
                className="border-orange-500/30 focus-visible:ring-orange-500/50"
              />
            </div>
            
            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setSelectedTask(null)}>Cancel</Button>
              <Button type="submit" disabled={logProgressMutation.isPending}>
                {logProgressMutation.isPending ? 'Saving...' : 'Save Progress'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      
      <StopTimerModal 
        isOpen={isStopModalOpen}
        onClose={() => setIsStopModalOpen(false)}
        timeLogId={timeLogId!}
        formattedTime={formattedTime}
        taskTitle={taskTitle || 'Unknown Task'}
      />
    </>
  )
}
